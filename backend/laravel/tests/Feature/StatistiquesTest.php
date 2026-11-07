<?php

namespace Tests\Feature;

use App\Models\Hopital;
use App\Models\SiteVisite;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatistiquesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_statistiques_publiques_suivent_leurs_definitions(): void
    {
        $this->creerUtilisateur('client');
        $this->creerUtilisateur('client', ['isVerified' => false]);

        $this->creerUtilisateur('medecin', ['isVerified' => true, 'is_active' => true]);
        $this->creerUtilisateur('medecin', ['isVerified' => false, 'is_active' => true]);
        $this->creerUtilisateur('medecin', ['isVerified' => true, 'is_active' => false]);

        $this->creerHopital(['hide' => false]);
        $this->creerHopital(['hide' => false]);
        $this->creerHopital(['hide' => true]);

        // Hier : hors compteur
        SiteVisite::insertOrIgnore(['jour' => now('Europe/Paris')->subDay()->toDateString(), 'visiteur_id' => 'hier']);

        $this->postJson('/api/visites', ['visiteur_id' => 'visiteur-a'])->assertNoContent();
        $this->postJson('/api/visites', ['visiteur_id' => 'visiteur-a'])->assertNoContent();
        $this->postJson('/api/visites', ['visiteur_id' => 'visiteur-b'])->assertNoContent();

        $this->getJson('/api/statistiques')
            ->assertOk()
            ->assertExactJson([
                'visiteurs_aujourdhui' => 2,
                'comptes_clients' => 2,
                'medecins_verifies_actifs' => 1,
                'etablissements' => 2,
            ]);
    }

    public function test_visite_exige_un_identifiant_valide(): void
    {
        $this->postJson('/api/visites', [])->assertUnprocessable()->assertJsonValidationErrors('visiteur_id');

        $this->postJson('/api/visites', ['visiteur_id' => 'with spaces !'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('visiteur_id');
    }

    /** @param array<string, mixed> $attributs */
    private function creerUtilisateur(string $role, array $attributs = []): User
    {
        $user = User::factory()->create($attributs);
        $user->assignRole($role);

        return $user;
    }

    /** @param array<string, mixed> $attributs */
    private function creerHopital(array $attributs = []): Hopital
    {
        return Hopital::create(array_merge([
            'name' => 'Clinique Test',
            'adresse' => '1 rue du Test',
            'telephone' => '0102030405',
            'ville' => 'Paris',
            'email' => 'contact@example.test',
            'description' => 'Établissement de test',
        ], $attributs));
    }
}
