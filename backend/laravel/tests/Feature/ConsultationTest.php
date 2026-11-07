<?php

namespace Tests\Feature;

use App\Models\AntecedentOption;
use App\Models\Consultation;
use App\Models\GeneratedDocument;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\TestCase;

class ConsultationTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_medecin_starts_consultation_from_existing_rendez_vous_without_changing_its_date(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $dateDebut = $rdv->date_debut->toDateTimeString();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/consultations', ['rendez_vous_id' => $rdv->id])
            ->assertCreated()
            ->assertJsonPath('consultation.statut', 'en_cours');

        $this->assertDatabaseHas('consultations', ['rendez_vous_id' => $rdv->id, 'statut' => 'en_cours']);
        $this->assertDatabaseHas('consultation_events', ['type' => 'demarree']);
        $this->assertSame($dateDebut, $rdv->fresh()->date_debut->toDateTimeString());
    }

    public function test_second_consultation_is_refused_while_one_is_in_progress(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $premiere = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $autre = $this->makeRendezVous($profil, ['email' => 'autre@example.test']);
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/consultations', ['rendez_vous_id' => $autre->id])
            ->assertStatus(409)
            ->assertJsonPath('consultation_id', $premiere->id);
    }

    public function test_quick_creation_keeps_entered_patient_and_author_is_the_medecin(): void
    {
        [$user, $profil] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/consultations', [
            'name' => 'Marie Martin',
            'email' => 'marie@example.test',
            'motif' => 'Première consultation',
        ])->assertCreated();

        $this->assertDatabaseHas('rendez_vous', [
            'medecin_id' => $profil->id,
            'name' => 'Marie Martin',
            'email' => 'marie@example.test',
            'author_id' => $user->id,
        ]);
    }

    public function test_abandon_requires_motif_and_keeps_the_record(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$consultation->id}/abandon", [])
            ->assertUnprocessable();

        $this->postJson("/api/medecin/consultations/{$consultation->id}/abandon", ['motif' => 'Patient parti'])
            ->assertOk()
            ->assertJsonPath('consultation.statut', 'abandonnee');

        $this->assertDatabaseHas('consultations', [
            'id' => $consultation->id,
            'statut' => 'abandonnee',
            'abandon_motif' => 'Patient parti',
        ]);
    }

    public function test_abandoned_consultation_resumes_only_when_no_other_is_in_progress(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $enCours = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $abandonnee = $this->makeConsultation(
            $profil,
            $this->makeRendezVous($profil, ['email' => 'autre@example.test']),
            Consultation::ABANDONNEE
        );
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$abandonnee->id}/reprendre")
            ->assertStatus(409)
            ->assertJsonPath('consultation_id', $enCours->id);

        $this->postJson("/api/medecin/consultations/{$enCours->id}/abandon", ['motif' => 'Interruption'])
            ->assertOk();

        $this->postJson("/api/medecin/consultations/{$abandonnee->id}/reprendre")
            ->assertOk()
            ->assertJsonPath('consultation.statut', 'en_cours');
    }

    public function test_consultation_is_put_on_hold_to_start_another_then_resumed(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $premiere = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $autre = $this->makeRendezVous($profil, ['email' => 'autre@example.test']);
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$premiere->id}/mettre-en-attente")
            ->assertOk()
            ->assertJsonPath('consultation.statut', 'en_attente');

        $this->putJson("/api/medecin/consultations/{$premiere->id}/ordonnance", ['lignes' => [], 'commentaire' => 'Ordonnance'])
            ->assertUnprocessable();

        $autreId = $this->postJson('/api/medecin/consultations', ['rendez_vous_id' => $autre->id])
            ->assertCreated()
            ->json('consultation.id');

        $this->postJson("/api/medecin/consultations/{$premiere->id}/reprendre")
            ->assertStatus(409)
            ->assertJsonPath('code', 'consultation_en_cours');

        $this->postJson("/api/medecin/consultations/{$autreId}/mettre-en-attente")
            ->assertOk();

        $this->postJson("/api/medecin/consultations/{$premiere->id}/reprendre")
            ->assertOk()
            ->assertJsonPath('consultation.statut', 'en_cours')
            ->assertJsonPath('consultation.paused_at', null);

        $this->assertDatabaseHas('consultation_events', ['type' => 'mise_en_attente']);
    }

    public function test_at_most_two_consultations_can_be_on_hold(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'a@example.test']), Consultation::EN_ATTENTE);
        $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'b@example.test']), Consultation::EN_ATTENTE);
        $courante = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'c@example.test']));
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$courante->id}/mettre-en-attente")
            ->assertStatus(409);

        $this->assertDatabaseHas('consultations', ['id' => $courante->id, 'statut' => 'en_cours']);
    }

    public function test_only_consultation_in_progress_can_be_put_on_hold(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $terminee = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$terminee->id}/mettre-en-attente")
            ->assertUnprocessable();
    }

    public function test_end_requires_an_invoice_and_marks_rendez_vous_as_terminated(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $consultation = $this->makeConsultation($profil, $rdv);
        $dateDebut = $rdv->date_debut->toDateTimeString();
        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')->once()->andReturn([]));
        Sanctum::actingAs($user);

        $this->postJson("/api/medecin/consultations/{$consultation->id}/terminer")
            ->assertUnprocessable();

        $this->putJson("/api/medecin/consultations/{$consultation->id}/facture", [
            'lignes' => [
                ['libelle' => 'Consultation', 'quantite' => 2, 'prix_unitaire' => 10.5],
            ],
        ])->assertOk()->assertJsonPath('consultation.facture.total', '21.00');

        $this->postJson("/api/medecin/consultations/{$consultation->id}/terminer")
            ->assertOk()
            ->assertJsonPath('consultation.statut', 'terminee');

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'terminé']);
        $this->assertNotNull(Consultation::find($consultation->id)->ended_at);
        $this->assertSame($dateDebut, $rdv->fresh()->date_debut->toDateTimeString());
    }

    public function test_prescription_lines_are_rendered_one_per_line_with_comment_and_replaced_on_save(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance", [
            'lignes' => [
                ['libelle' => 'Médicament A', 'quantite' => 2, 'prise' => '3_fois_par_jour'],
                ['libelle' => 'Médicament B', 'quantite' => 1, 'prise' => 'soir'],
            ],
            'commentaire' => "Boire beaucoup d'eau",
        ])
            ->assertOk()
            ->assertJsonPath('consultation.ordonnance_texte', "Médicament A (qté 2) - 3 fois par jour\nMédicament B (qté 1) - Le soir\n\nBoire beaucoup d'eau")
            ->assertJsonPath('consultation.ordonnance.commentaire', "Boire beaucoup d'eau")
            ->assertJsonPath('consultation.ordonnance.lignes.1.prise', 'soir');

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance", [
            'lignes' => [['libelle' => 'Médicament C', 'quantite' => 1, 'prise' => 'matin']],
            'commentaire' => '',
        ])
            ->assertOk()
            ->assertJsonPath('consultation.ordonnance_texte', 'Médicament C (qté 1) - Le matin')
            ->assertJsonPath('consultation.ordonnance.commentaire', null)
            ->assertJsonCount(1, 'consultation.ordonnance.lignes');

        $this->assertDatabaseCount('consultation_ordonnance_lignes', 1);
    }

    public function test_empty_prescription_clears_the_rendered_text(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance", ['lignes' => []])
            ->assertOk()
            ->assertJsonPath('consultation.ordonnance_texte', null)
            ->assertJsonCount(0, 'consultation.ordonnance.lignes');
    }

    public function test_prescription_line_requires_known_prise_and_positive_quantity(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/consultations/{$consultation->id}/ordonnance", [
            'lignes' => [['libelle' => 'Médicament A', 'quantite' => 0, 'prise' => 'inconnue']],
        ])->assertUnprocessable()->assertJsonValidationErrors(['lignes.0.quantite', 'lignes.0.prise']);
    }

    public function test_consultation_of_another_medecin_is_not_found(): void
    {
        [, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        [$autre] = $this->makeMedecin();
        Sanctum::actingAs($autre);

        $this->getJson("/api/medecin/consultations/{$consultation->id}")->assertNotFound();
    }

    public function test_history_only_contains_consultations_of_the_same_medecin(): void
    {
        [$user, $profil] = $this->makeMedecin();
        [, $autreProfil] = $this->makeMedecin();

        $courante = $this->makeConsultation($profil, $this->makeRendezVous($profil, [
            'email' => 'Patient@Example.test',
        ]));
        $this->makeConsultation(
            $profil,
            $this->makeRendezVous($profil, ['email' => 'patient@example.test']),
            Consultation::TERMINEE
        );
        $this->makeConsultation(
            $autreProfil,
            $this->makeRendezVous($autreProfil, ['email' => 'patient@example.test']),
            Consultation::TERMINEE
        );
        Sanctum::actingAs($user);

        $this->getJson("/api/medecin/consultations/{$courante->id}")
            ->assertOk()
            ->assertJsonCount(2, 'historique');
    }

    public function test_show_returns_antecedents_of_the_linked_client_grouped_by_category(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $client = User::factory()->create(['antecedents_commentaire' => 'Allergie aux penicillines']);
        $diabete = AntecedentOption::create([
            'categorie' => 'Categorie test', 'code' => 'test_diabete', 'libelle' => 'Diabete', 'est_aucun' => false, 'actif' => true,
        ]);
        $asthme = AntecedentOption::create([
            'categorie' => 'Categorie test', 'code' => 'test_asthme', 'libelle' => 'Asthme', 'est_aucun' => false, 'actif' => true,
        ]);
        AntecedentOption::create([
            'categorie' => 'Categorie test', 'code' => 'test_non_coche', 'libelle' => 'Non coche', 'est_aucun' => false, 'actif' => true,
        ]);
        $client->antecedentOptions()->sync([$diabete->id, $asthme->id]);
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['client_id' => $client->id]));
        Sanctum::actingAs($user);

        $this->getJson("/api/medecin/consultations/{$consultation->id}")
            ->assertOk()
            ->assertJsonPath('antecedents.commentaire', 'Allergie aux penicillines')
            ->assertJsonCount(1, 'antecedents.categories')
            ->assertJsonPath('antecedents.categories.0.categorie', 'Categorie test')
            ->assertJsonPath('antecedents.categories.0.libelles', ['Diabete', 'Asthme']);
    }

    public function test_show_has_no_antecedents_when_patient_has_no_linked_account(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->getJson("/api/medecin/consultations/{$consultation->id}")
            ->assertOk()
            ->assertJsonPath('antecedents', null);
    }

    public function test_document_is_archived_and_linked_to_the_consultation(): void
    {
        Storage::fake('local');
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $consultation = $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($user);

        $this->post('/api/medecin/generated-documents', [
            'pdf' => UploadedFile::fake()->create('ordonnance.pdf', 20, 'application/pdf'),
            'type' => 'ordonnance',
            'consultation_id' => $consultation->id,
        ], ['Accept' => 'application/json'])->assertCreated();

        $this->assertDatabaseHas('generated_documents', [
            'medecin_profile_id' => $profil->id,
            'consultation_id' => $consultation->id,
            'rendez_vous_id' => $rdv->id,
        ]);
    }

    public function test_document_cannot_be_linked_to_a_finished_consultation(): void
    {
        Storage::fake('local');
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        Sanctum::actingAs($user);

        $this->post('/api/medecin/generated-documents', [
            'pdf' => UploadedFile::fake()->create('facture.pdf', 20, 'application/pdf'),
            'type' => 'facture',
            'consultation_id' => $consultation->id,
        ], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_document_cannot_be_archived_without_consultation(): void
    {
        Storage::fake('local');
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($user);

        $this->post('/api/medecin/generated-documents', [
            'pdf' => UploadedFile::fake()->create('ordonnance.pdf', 20, 'application/pdf'),
            'type' => 'ordonnance',
            'rendez_vous_id' => $rdv->id,
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertDatabaseCount('generated_documents', 0);
    }

    public function test_archived_document_title_is_defined_by_the_backend(): void
    {
        Storage::fake('local');
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->post('/api/medecin/generated-documents', [
            'pdf' => UploadedFile::fake()->create('facture.pdf', 20, 'application/pdf'),
            'type' => 'facture',
            'consultation_id' => $consultation->id,
        ], ['Accept' => 'application/json'])->assertCreated();

        $document = GeneratedDocument::where('consultation_id', $consultation->id)->firstOrFail();
        $this->assertMatchesRegularExpression('/^facture_\d{10}$/', $document->titre);
    }
}
