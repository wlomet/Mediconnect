<?php

namespace Tests\Feature;

use ArrayObject;
use App\Models\Consultation;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\TestCase;

class RendezVousNotificationTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_confirmation_email_is_sent_when_statut_changes_to_confirme_and_email_is_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(1, $envois);
        $this->assertSame('patient@example.test', $envois[0]['to']);
        $this->assertStringContainsString('de 10:00 à 10:30', $envois[0]['html']);
    }

    public function test_no_confirmation_email_when_patient_email_is_not_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => null]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(0, $envois);
    }

    public function test_no_confirmation_email_when_patient_has_no_account(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(0, $envois);
    }

    public function test_no_confirmation_email_when_statut_was_already_confirmed(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé', 'notes' => 'RAS'])->assertOk();

        $this->assertCount(0, $envois);
    }

    public function test_statut_change_is_kept_when_email_sending_fails(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')
            ->andThrow(new RuntimeException('Brevo indisponible')));
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'confirmé']);
    }

    public function test_end_of_consultation_email_gives_access_when_patient_email_is_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->terminerConsultation($consultation);

        $this->assertCount(1, $envois);
        $this->assertStringContainsString('retrouver toutes vos informations', $envois[0]['html']);
    }

    public function test_end_of_consultation_email_has_no_access_when_patient_has_no_account(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->terminerConsultation($consultation);

        $this->assertCount(1, $envois);
        $this->assertStringContainsString('est terminée', $envois[0]['html']);
        $this->assertStringNotContainsString('retrouver toutes vos informations', $envois[0]['html']);
    }

    // Capture chaque envoi sans appeler Brevo.
    private function espionnerEnvois(): ArrayObject
    {
        $envois = new ArrayObject();

        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')
            ->andReturnUsing(function (string $to, string $subject, array $options) use ($envois): array {
                $envois[] = ['to' => $to, 'subject' => $subject, 'html' => $options['html'] ?? ''];

                return [];
            }));

        return $envois;
    }

    private function terminerConsultation(Consultation $consultation): void
    {
        $this->putJson("/api/medecin/consultations/{$consultation->id}/facture", [
            'lignes' => [['libelle' => 'Consultation', 'quantite' => 1, 'prix_unitaire' => 20]],
        ])->assertOk();

        $this->postJson("/api/medecin/consultations/{$consultation->id}/terminer")->assertOk();
    }
}
