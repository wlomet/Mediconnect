<?php

namespace Tests\Feature;

use ArrayObject;
use App\Models\ImpersonationLog;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class SuperAdminImpersonationTest extends TestCase
{
    use RefreshDatabase;

    private const MOT_DE_PASSE = 'secret123';

    // Session disponible seulement pour un domaine stateful Sanctum, comme le frontend
    private const ORIGINE = ['Origin' => 'http://localhost:5173'];

    private User $superAdmin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->superAdmin = $this->creerCompte('super-admin');
        $this->connecter($this->superAdmin);
    }

    private function creerCompte(string $role, array $attributs = [], bool $emailVerifie = true): User
    {
        $factory = $emailVerifie ? User::factory() : User::factory()->unverified();

        $user = $factory->create(array_merge([
            'password' => Hash::make(self::MOT_DE_PASSE),
            'is_active' => true,
            'isVerified' => 1,
        ], $attributs));

        $user->assignRole($role);

        return $user;
    }

    // Connexion réelle : la session est créée par l'endpoint de login
    private function connecter(User $user): void
    {
        $this->requete('POST', '/api/login', [
            'email' => $user->email,
            'password' => self::MOT_DE_PASSE,
        ])->assertOk();
    }

    // Chaque requête repart d'un état neuf, comme en production : auth:sanctum change le garde par défaut dans les tests
    private function requete(string $methode, string $uri, array $donnees = []): TestResponse
    {
        config(['auth.defaults.guard' => 'web']);
        Auth::forgetGuards();

        return $this->withHeaders(self::ORIGINE)->json($methode, $uri, $donnees);
    }

    private function journal(array $attributs = []): ImpersonationLog
    {
        return ImpersonationLog::create(array_merge([
            'superadmin_id' => $this->superAdmin->id,
            'superadmin_name' => $this->superAdmin->name,
            'superadmin_email' => $this->superAdmin->email,
            'target_user_id' => $this->creerCompte('client')->id,
            'target_name' => 'Patient Test',
            'target_email' => 'patient@example.test',
            'target_role' => 'client',
            'started_at' => now(),
        ], $attributs));
    }

    private function impersonner(User $cible): TestResponse
    {
        return $this->requete('POST', "/api/super-admin/users/{$cible->id}/impersonate");
    }

    private function deconnexion(): TestResponse
    {
        return $this->requete('POST', '/api/logout');
    }

    // Journal dédié : chaque entrée écrite sur le canal impersonation est enregistrée, sans fichier.
    private function espionnerJournal(): ArrayObject
    {
        $entrees = new ArrayObject();
        $canal = new class ($entrees) {
            public function __construct(private ArrayObject $entrees)
            {
            }

            public function __call(string $niveau, array $arguments): void
            {
                $this->entrees[] = ['niveau' => $niveau, 'message' => $arguments[0], 'contexte' => $arguments[1] ?? []];
            }
        };

        Log::spy();
        Log::shouldReceive('channel')->with('impersonation')->andReturn($canal);

        return $entrees;
    }

    public function test_superadmin_ouvre_la_session_du_compte_cible(): void
    {
        $cible = $this->creerCompte('client');
        $derniereConnexion = $cible->last_login_at;

        $this->impersonner($cible)->assertOk();

        $this->requete('GET', '/api/user')
            ->assertOk()
            ->assertJsonPath('user.id', $cible->id)
            ->assertJsonPath('user.role', 'client')
            ->assertJsonPath('impersonated_by.id', $this->superAdmin->id);

        $this->assertDatabaseHas('impersonation_logs', [
            'superadmin_id' => $this->superAdmin->id,
            'target_user_id' => $cible->id,
            'target_role' => 'client',
            'ended_at' => null,
        ]);
        $this->assertEquals($derniereConnexion, $cible->fresh()->last_login_at);
    }

    public function test_seul_un_superadmin_peut_impersonner(): void
    {
        $this->connecter($this->creerCompte('client'));

        $this->impersonner($this->creerCompte('client'))->assertForbidden();

        $this->assertDatabaseCount('impersonation_logs', 0);
    }

    public function test_refuse_un_compte_administrateur_ou_superadmin(): void
    {
        $this->impersonner($this->creerCompte('admin'))->assertStatus(422);
        $this->impersonner($this->creerCompte('super-admin'))->assertStatus(422);
        $this->impersonner($this->superAdmin)->assertStatus(422);

        $this->assertDatabaseCount('impersonation_logs', 0);
    }

    public function test_refuse_un_compte_qui_ne_peut_pas_se_connecter(): void
    {
        $this->impersonner($this->creerCompte('client', ['is_active' => false]))->assertStatus(422);
        $this->impersonner($this->creerCompte('client', ['isVerified' => 0]))->assertStatus(422);
        $this->impersonner($this->creerCompte('client', [], false))->assertStatus(422);

        $this->assertDatabaseCount('impersonation_logs', 0);
    }

    public function test_deconnexion_rend_la_session_au_superadmin(): void
    {
        $cible = $this->creerCompte('client');
        $this->impersonner($cible)->assertOk();

        $this->deconnexion()
            ->assertOk()
            ->assertJsonPath('retour_superadmin', true);

        $this->requete('GET', '/api/user')
            ->assertJsonPath('user.id', $this->superAdmin->id)
            ->assertJsonPath('impersonated_by', null);

        $this->assertDatabaseHas('impersonation_logs', [
            'target_user_id' => $cible->id,
            'end_reason' => ImpersonationLog::MOTIF_RETOUR_SUPERADMIN,
        ]);
        $this->assertNotNull(ImpersonationLog::first()->ended_at);
    }

    public function test_deconnexion_hors_impersonation_deconnecte_le_compte(): void
    {
        $this->connecter($this->creerCompte('client'));

        $this->deconnexion()
            ->assertOk()
            ->assertJsonMissingPath('retour_superadmin');

        $this->requete('GET', '/api/user')
            ->assertJsonPath('user', null);
    }

    public function test_desactivation_de_la_cible_termine_l_impersonation(): void
    {
        $cible = $this->creerCompte('client');
        $this->impersonner($cible)->assertOk();

        $cible->update(['is_active' => false]);

        $this->requete('GET', '/api/client/dashboard/stats')
            ->assertStatus(401)
            ->assertJsonPath('isDisabled', true);

        $this->assertDatabaseHas('impersonation_logs', [
            'target_user_id' => $cible->id,
            'end_reason' => ImpersonationLog::MOTIF_COMPTE_DESACTIVE,
        ]);
        $this->requete('GET', '/api/user')
            ->assertJsonPath('user', null);
    }

    public function test_superadmin_desactive_pendant_l_impersonation_est_deconnecte(): void
    {
        $this->impersonner($this->creerCompte('client'))->assertOk();
        $this->superAdmin->update(['is_active' => false]);

        $this->deconnexion()
            ->assertOk()
            ->assertJsonMissingPath('retour_superadmin');

        $this->requete('GET', '/api/user')
            ->assertJsonPath('user', null);
        $this->assertDatabaseHas('impersonation_logs', [
            'end_reason' => ImpersonationLog::MOTIF_DECONNEXION,
        ]);
    }

    public function test_debut_et_fin_sont_journalises(): void
    {
        $entrees = $this->espionnerJournal();

        $this->impersonner($this->creerCompte('client'))->assertOk();
        $this->deconnexion()->assertOk();

        $this->assertCount(2, $entrees);
        $this->assertSame('Impersonation démarrée', $entrees[0]['message']);
        $this->assertSame('Impersonation terminée', $entrees[1]['message']);
        $this->assertSame(ImpersonationLog::MOTIF_RETOUR_SUPERADMIN, $entrees[1]['contexte']['end_reason']);
    }

    public function test_historique_reserve_au_superadmin(): void
    {
        $this->connecter($this->creerCompte('client'));

        $this->requete('GET', '/api/super-admin/impersonations')
            ->assertForbidden();
    }

    public function test_historique_est_pagine_du_plus_recent_au_plus_ancien(): void
    {
        $milieu = $this->journal(['started_at' => now()->subDays(2)]);
        $recent = $this->journal(['started_at' => now()->subDay()]);
        $this->journal(['started_at' => now()->subDays(3)]);

        $this->requete('GET', '/api/super-admin/impersonations?per_page=2')
            ->assertOk()
            ->assertJsonCount(2, 'impersonations')
            ->assertJsonPath('pagination.total', 3)
            ->assertJsonPath('pagination.last_page', 2)
            ->assertJsonPath('impersonations.0.id', $recent->id)
            ->assertJsonPath('impersonations.1.id', $milieu->id);
    }

    public function test_historique_conserve_le_compte_supprime(): void
    {
        $cible = $this->creerCompte('client');
        $this->impersonner($cible)->assertOk();
        $this->deconnexion()->assertOk();

        $cible->delete();

        $this->requete('GET', '/api/super-admin/impersonations')
            ->assertOk()
            ->assertJsonPath('impersonations.0.target.id', null)
            ->assertJsonPath('impersonations.0.target.name', $cible->name);
    }
}
