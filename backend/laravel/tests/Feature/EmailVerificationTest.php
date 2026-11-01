<?php

namespace Tests\Feature;

use App\Http\Controllers\Admin\AdminUserController;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    private const MOT_DE_PASSE = 'secret123';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    private function creerCompte(string $role, bool $emailVerifie, array $attributs = []): User
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

    // Session disponible seulement pour un domaine stateful Sanctum, comme le frontend
    private function login(string $email)
    {
        return $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/login', ['email' => $email, 'password' => self::MOT_DE_PASSE]);
    }

    private function tokenDans(string $texte): string
    {
        preg_match('/token=([A-Za-z0-9]{64})/', $texte, $correspondance);

        return $correspondance[1] ?? '';
    }

    public function test_inscription_client_bloque_la_connexion_jusqu_a_activation(): void
    {
        $texte = '';
        $this->mock(MailService::class, function ($mock) use (&$texte) {
            $mock->shouldReceive('send')->once()->andReturnUsing(function ($to, $sujet, $options) use (&$texte) {
                $texte = $options['text'];

                return [];
            });
        });

        $this->postJson('/api/register', [
            'name' => 'Client Test',
            'email' => 'client@example.test',
            'password' => self::MOT_DE_PASSE,
            'role' => 'client',
        ])->assertOk();

        $this->login('client@example.test')
            ->assertForbidden()
            ->assertJson(['isEmailUnverified' => true, 'email' => 'client@example.test']);

        $this->postJson('/api/verify-email', [
            'token' => $this->tokenDans($texte),
            'email' => 'client@example.test',
        ])->assertOk();

        $this->login('client@example.test')->assertOk();
    }

    public function test_inscription_medecin_reste_en_attente_de_validation_admin(): void
    {
        $texte = '';
        $this->mock(MailService::class, function ($mock) use (&$texte) {
            $mock->shouldReceive('send')->once()->andReturnUsing(function ($to, $sujet, $options) use (&$texte) {
                $texte = $options['text'];

                return [];
            });
        });

        $this->post('/api/register', [
            'name' => 'Docteur Test',
            'email' => 'medecin@example.test',
            'password' => self::MOT_DE_PASSE,
            'role' => 'medecin',
            'document_identite' => UploadedFile::fake()->create('identite.pdf', 100, 'application/pdf'),
            'justificatif_validite' => UploadedFile::fake()->create('justificatif.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertOk();

        $this->postJson('/api/verify-email', [
            'token' => $this->tokenDans($texte),
            'email' => 'medecin@example.test',
        ])->assertOk();

        // Email vérifié, mais is_active = 0 et isVerified = 0 : le message reste « en attente »
        $this->login('medecin@example.test')
            ->assertForbidden()
            ->assertJson(['isPending' => true]);

        $medecin = User::where('email', 'medecin@example.test')->firstOrFail();
        $this->assertSame(200, app(AdminUserController::class)->verifyUser($medecin->id)->getStatusCode());

        $this->login('medecin@example.test')->assertOk();
    }

    public function test_lien_invalide_ou_expire_est_refuse(): void
    {
        $user = $this->creerCompte('client', false);
        $token = $user->issueEmailVerificationToken();

        $this->postJson('/api/verify-email', ['token' => 'faux', 'email' => $user->email])
            ->assertStatus(422);

        $user->forceFill(['email_verification_expires_at' => now()->subMinute()])->save();

        $this->postJson('/api/verify-email', ['token' => $token, 'email' => $user->email])
            ->assertStatus(422)
            ->assertJson(['expired' => true]);

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_renvoi_limite_a_un_email_par_minute(): void
    {
        $user = $this->creerCompte('client', false);

        // Un seul envoi : le second appel est bloqué, qu'il s'agisse d'un compte existant ou non
        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')->once()->andReturn([]));

        $this->postJson('/api/resend-verification', ['email' => $user->email])->assertOk();

        $this->postJson('/api/resend-verification', ['email' => $user->email])
            ->assertStatus(429)
            ->assertJsonStructure(['retry_after']);

        $this->postJson('/api/resend-verification', ['email' => 'inconnu@example.test'])->assertOk();

        $this->postJson('/api/resend-verification', ['email' => 'inconnu@example.test'])
            ->assertStatus(429);
    }

    public function test_connexion_refusee_si_compte_refuse_ou_desactive(): void
    {
        $refuse = $this->creerCompte('medecin', true, ['isVerified' => -1]);
        $this->login($refuse->email)
            ->assertForbidden()
            ->assertJson(['isRejected' => true]);

        $desactive = $this->creerCompte('client', true, ['is_active' => false]);
        $this->login($desactive->email)
            ->assertForbidden()
            ->assertJson(['isDisabled' => true]);
    }

    public function test_admin_et_super_admin_ne_sont_pas_bloques_par_email_non_verifie(): void
    {
        $admin = $this->creerCompte('admin', false);
        $this->login($admin->email)->assertOk();

        $superAdmin = $this->creerCompte('super-admin', false);
        $this->login($superAdmin->email)->assertOk();
    }

    public function test_mot_de_passe_oublie_n_envoie_aucun_email_pour_un_email_non_verifie(): void
    {
        $user = $this->creerCompte('client', false);

        $this->mock(MailService::class, fn ($mock) => $mock->shouldNotReceive('send'));

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
    }

    public function test_mot_de_passe_oublie_envoie_un_email_pour_un_email_verifie(): void
    {
        $user = $this->creerCompte('client', true);

        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')->once()->andReturn([]));

        $this->postJson('/api/forgot-password', ['email' => $user->email])->assertOk();
    }

    public function test_reset_du_mot_de_passe_valide_l_email(): void
    {
        $admin = $this->creerCompte('admin', false);
        /** @var \Illuminate\Auth\Passwords\PasswordBroker $broker */
        $broker = Password::broker();
        $token = $broker->createToken($admin);

        $this->postJson('/api/reset-password', [
            'token' => $token,
            'email' => $admin->email,
            'password' => 'nouveau123',
            'password_confirmation' => 'nouveau123',
        ])->assertOk();

        $this->assertTrue($admin->fresh()->hasVerifiedEmail());
    }
}
