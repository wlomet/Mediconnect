<?php

namespace Tests\Feature;

use ArrayObject;
use App\Models\Consultation;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\TestCase;

class RendezVousSecretaireModificationTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected ArrayObject $envois;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->envois = $this->espionnerEnvois();
    }

    public function test_secretaire_can_update_motif_and_notes(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Suivi',
            'notes' => 'Apporter les analyses',
        ])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Suivi', 'notes' => 'Apporter les analyses']);
    }

    public function test_patient_info_is_locked_when_client_booked_it_himself(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, [
            'client_id' => $client->id,
            'author_id' => $client->id,
            'email' => $client->email,
        ]);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Nouveau nom',
            'email' => $client->email,
            'motif' => 'Contrôle',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'name' => 'Patient Test']);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Patient Test',
            'email' => $client->email,
            'motif' => 'Bilan',
        ])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Bilan']);
    }

    public function test_patient_info_is_editable_when_secretaire_booked_the_rendez_vous(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil, ['author_id' => $secretaire->id]);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Nouveau nom',
            'email' => 'patient@example.test',
            'motif' => 'Contrôle',
        ])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'name' => 'Nouveau nom']);
    }

    public function test_update_is_refused_when_a_consultation_is_linked(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Suivi',
        ])->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Contrôle']);
    }

    public function test_slot_can_be_moved_to_a_free_slot(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $debut = now()->addDays(3)->setTime(14, 0);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", $this->payloadCreneau($debut))
            ->assertOk();

        $this->assertDatabaseHas('rendez_vous', [
            'id' => $rdv->id,
            'date_debut' => $debut->format('Y-m-d H:i:s'),
            'date_fin' => $debut->copy()->addMinutes(30)->format('Y-m-d H:i:s'),
        ]);
    }

    public function test_slot_taken_by_another_rendez_vous_needs_explicit_overlap_confirmation(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $debut = now()->addDays(3)->setTime(14, 0);
        $this->makeRendezVous($profil, [
            'date_debut' => $debut,
            'date_fin' => $debut->copy()->addMinutes(30),
            'name' => 'Autre patient',
            'email' => 'autre@example.test',
        ]);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", $this->payloadCreneau($debut))
            ->assertStatus(409)
            ->assertJsonPath('code', 'creneau_occupe');

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'date_debut' => $rdv->date_debut->format('Y-m-d H:i:s')]);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", $this->payloadCreneau($debut) + ['chevauchement_autorise' => true])
            ->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'date_debut' => $debut->format('Y-m-d H:i:s')]);
    }

    public function test_slot_in_the_past_is_refused(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", $this->payloadCreneau(now()->subDay()->setTime(9, 0)))
            ->assertUnprocessable();
    }

    public function test_confirming_from_the_card_sends_the_confirmation_email(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'confirmé']);
        $this->assertCount(1, $this->envois);
        $this->assertSame('patient@example.test', $this->envois[0]['to']);
    }

    public function test_cancel_is_refused_while_consultation_is_in_progress(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($secretaire);

        $this->patchJson("/api/secretaire/rendez-vous/{$rdv->id}/cancel")->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'confirmé']);
    }

    public function test_cancel_is_allowed_after_consultation_was_abandoned(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::ABANDONNEE);
        Sanctum::actingAs($secretaire);

        $this->patchJson("/api/secretaire/rendez-vous/{$rdv->id}/cancel")->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'annulé']);
    }

    public function test_field_change_is_refused_after_consultation_was_abandoned(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::ABANDONNEE);
        Sanctum::actingAs($secretaire);

        $this->putJson("/api/secretaire/rendez-vous/{$rdv->id}", [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Suivi',
        ])->assertStatus(409);
    }

    public function test_resend_sends_the_confirmation_when_confirmed_and_account_is_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($secretaire);

        $this->postJson("/api/secretaire/rendez-vous/{$rdv->id}/renvoyer-email")->assertOk();

        $this->assertCount(1, $this->envois);
        $this->assertSame('patient@example.test', $this->envois[0]['to']);
        $this->assertStringContainsString('est confirmé', $this->envois[0]['html']);
    }

    public function test_resend_is_refused_when_rendez_vous_is_not_confirmed(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        Sanctum::actingAs($secretaire);

        $this->postJson("/api/secretaire/rendez-vous/{$rdv->id}/renvoyer-email")->assertUnprocessable();

        $this->assertCount(0, $this->envois);
    }

    public function test_resend_is_refused_without_verified_account(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($secretaire);

        $this->postJson("/api/secretaire/rendez-vous/{$rdv->id}/renvoyer-email")->assertUnprocessable();

        $this->assertCount(0, $this->envois);
    }

    public function test_show_exposes_lock_and_resend_flags(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, ['client_id' => $client->id, 'author_id' => $client->id]);
        Sanctum::actingAs($secretaire);

        $this->getJson("/api/secretaire/rendez-vous/{$rdv->id}")
            ->assertOk()
            ->assertJsonPath('rendez_vous.patient_verrouille', true)
            ->assertJsonPath('rendez_vous.modifiable', true)
            ->assertJsonPath('rendez_vous.peut_renvoyer_email', true)
            ->assertJsonPath('rendez_vous.medecin.id', $medecin->id);

        $this->makeConsultation($profil, $rdv);

        $this->getJson("/api/secretaire/rendez-vous/{$rdv->id}")
            ->assertJsonPath('rendez_vous.modifiable', false);
    }

    private function makeSecretaire(User $medecin): User
    {
        $secretaire = $this->makeUserWithRole('secretaire');
        Secretaire::create(['user_id' => $secretaire->id, 'name' => 'Secretaire test']);
        SecretaireMedecin::create([
            'secretaire_id' => $secretaire->id,
            'medecin_id' => $medecin->id,
            'statut' => 'accepte',
        ]);

        return $secretaire;
    }

    /** @return array<string, string> */
    private function payloadCreneau($debut): array
    {
        return [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Contrôle',
            'date_debut' => $debut->toIso8601String(),
            'date_fin' => $debut->copy()->addMinutes(30)->toIso8601String(),
        ];
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
}
