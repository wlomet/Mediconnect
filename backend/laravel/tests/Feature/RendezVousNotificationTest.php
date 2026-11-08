<?php

namespace Tests\Feature;

use ArrayObject;
use App\Models\Consultation;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
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
        $this->assertStringContainsString('Vous pouvez retrouver vos informations', $envois[0]['html']);
    }

    public function test_end_of_consultation_email_names_the_documents_archived(): void
    {
        Storage::fake('local');
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance", [
            'lignes' => [['libelle' => 'Médicament A', 'quantite' => 1, 'prise' => 'matin']],
        ])->assertOk();
        $this->putJson("/api/medecin/consultations/{$consultation->id}/facture", [
            'lignes' => [['libelle' => 'Consultation', 'quantite' => 1, 'prix_unitaire' => 20]],
        ])->assertOk();

        foreach (['ordonnance', 'facture'] as $type) {
            $this->post('/api/medecin/generated-documents', [
                'pdf' => UploadedFile::fake()->create("{$type}.pdf", 20, 'application/pdf'),
                'type' => $type,
                'consultation_id' => $consultation->id,
            ], ['Accept' => 'application/json'])->assertCreated();
        }

        $this->postJson("/api/medecin/consultations/{$consultation->id}/terminer")->assertOk();

        $this->assertStringContainsString('retrouver votre ordonnance et votre facture', $envois[0]['html']);
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
        $this->assertStringNotContainsString('espace MediConnect', $envois[0]['html']);
    }

    public function test_confirmation_email_is_sent_when_medecin_creates_confirmed_rendez_vous(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payloadRendezVous($profil, ['statut' => 'confirmé']))
            ->assertCreated();

        $this->assertCount(1, $envois);
        $this->assertSame('patient@example.test', $envois[0]['to']);
        $this->assertStringContainsString('est confirmé', $envois[0]['subject']);
    }

    public function test_no_email_when_medecin_creates_en_attente_rendez_vous(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payloadRendezVous($profil, ['statut' => 'en_attente']))
            ->assertCreated();

        $this->assertCount(0, $envois);
    }

    public function test_confirmation_email_is_sent_when_secretaire_creates_rendez_vous(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeSecretaire($medecin);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($secretaire);

        $this->postJson('/api/secretaire/rendez-vous', $this->payloadRendezVous($profil))->assertCreated();

        $this->assertCount(1, $envois);
    }

    public function test_cancellation_email_is_sent_when_statut_changes_from_en_attente_to_annule(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'annulé'])->assertOk();

        $this->assertCount(1, $envois);
        $this->assertSame('patient@example.test', $envois[0]['to']);
        $this->assertStringContainsString('est annulé', $envois[0]['subject']);
        $this->assertStringContainsString('a été annulé', $envois[0]['html']);
    }

    public function test_no_cancellation_email_when_statut_was_confirmed(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'confirmé']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'annulé'])->assertOk();

        $this->assertCount(0, $envois);
    }

    public function test_cancellation_email_is_sent_when_client_cancels_en_attente_rendez_vous(): void
    {
        $client = $this->makeUserWithRole('client');
        $client->update(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, [
            'statut' => 'en_attente',
            'client_id' => $client->id,
            'author_id' => $client->id,
        ]);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($client);

        $this->patchJson("/api/client/rendez-vous/{$rdv->id}/cancel")->assertOk();

        $this->assertCount(1, $envois);
        $this->assertStringContainsString('est annulé', $envois[0]['subject']);
    }

    public function test_confirmation_email_shows_medecin_address_and_motif(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $profil->update(['adresse' => '12 rue de la Santé, Paris']);
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente', 'motif' => 'Bilan annuel']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(1, $envois);
        $this->assertStringContainsString('12 rue de la Santé, Paris', $envois[0]['html']);
        $this->assertStringContainsString('Bilan annuel', $envois[0]['html']);
    }

    public function test_confirmation_email_falls_back_to_hopital_address_when_medecin_has_none(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        $hopital = Hopital::create([
            'name' => 'Hôpital Test',
            'adresse' => '3 avenue du Centre Hospitalier',
            'telephone' => '0102030405',
            'ville' => 'Lyon',
        ]);
        [$user, $profil] = $this->makeMedecin();
        $profil->update(['hopital_id' => $hopital->id]);
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(1, $envois);
        $this->assertStringContainsString('3 avenue du Centre Hospitalier', $envois[0]['html']);
    }

    public function test_sent_confirmation_is_logged(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        $journal = $this->espionnerJournal();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(1, $envois);
        $this->assertCount(1, $journal);
        $this->assertSame('info', $journal[0]['niveau']);
        $this->assertSame('Email de rendez-vous envoyé.', $journal[0]['message']);
        $this->assertSame('emails.rendez-vous-confirme', $journal[0]['contexte']['vue']);
    }

    public function test_skipped_confirmation_is_logged_when_patient_email_is_not_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => null]);
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        $envois = $this->espionnerEnvois();
        $journal = $this->espionnerJournal();
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])->assertOk();

        $this->assertCount(0, $envois);
        $this->assertCount(1, $journal);
        $this->assertSame('info', $journal[0]['niveau']);
        $this->assertStringContainsString('non envoyé', $journal[0]['message']);
        $this->assertEquals($rdv->id, $journal[0]['contexte']['rendez_vous_id']);
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

    /** @return array<string, mixed> */
    private function payloadRendezVous(MedecinProfile $profil, array $extra = []): array
    {
        $debut = now()->addDay()->setTime(10, 0);

        return array_merge([
            'medecin_id' => $profil->id,
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Contrôle',
            'statut' => 'confirmé',
            'date_debut' => $debut->toDateTimeString(),
            'date_fin' => $debut->copy()->addMinutes(30)->toDateTimeString(),
        ], $extra);
    }

    // Journal dédié aux notifications de rendez-vous : chaque ligne écrite est enregistrée, sans fichier.
    private function espionnerJournal(): ArrayObject
    {
        $entrees = new ArrayObject();
        $canal = new class($entrees) {
            public function __construct(private ArrayObject $entrees)
            {
            }

            public function __call(string $niveau, array $arguments): void
            {
                $this->entrees[] = ['niveau' => $niveau, 'message' => $arguments[0], 'contexte' => $arguments[1] ?? []];
            }
        };

        Log::spy();
        Log::shouldReceive('channel')->with('notifications_rendez_vous')->andReturn($canal);

        return $entrees;
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

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance/non-generee")->assertOk();

        $this->postJson("/api/medecin/consultations/{$consultation->id}/terminer")->assertOk();
    }
}
