<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\ConsultationFacture;
use App\Models\GeneratedDocument;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class ClientDossierTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_client_sees_only_his_consultations_with_rendez_vous_facture_and_documents(): void
    {
        [$medecinUser, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, ['client_id' => $client->id]);
        $consultation = $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        $consultation->update(['ordonnance_texte' => 'Paracétamol 1g']);

        $facture = ConsultationFacture::create(['consultation_id' => $consultation->id, 'total' => 21]);
        $facture->lignes()->create([
            'libelle' => 'Consultation',
            'quantite' => 2,
            'prix_unitaire' => 10.5,
            'total' => 21,
            'position' => 0,
        ]);
        $this->makeDocument($profil, $rdv, 'ordonnance', $consultation);

        $autreClient = $this->makeUserWithRole('client');
        $autreRdv = $this->makeRendezVous($profil, ['client_id' => $autreClient->id, 'email' => 'autre@example.test']);
        $autreConsultation = $this->makeConsultation($profil, $autreRdv, Consultation::TERMINEE);
        $this->makeDocument($profil, $autreRdv, 'facture', $autreConsultation);

        SessionAuth::actingAs($client);

        $this->getJson('/api/client/consultations')
            ->assertOk()
            ->assertJsonCount(1, 'consultations')
            ->assertJsonPath('consultations.0.id', $consultation->id)
            ->assertJsonPath('consultations.0.ordonnance_texte', 'Paracétamol 1g')
            ->assertJsonPath('consultations.0.rendez_vous.id', $rdv->id)
            ->assertJsonPath('consultations.0.medecin.name', $medecinUser->name)
            ->assertJsonPath('consultations.0.facture.total', '21.00')
            ->assertJsonPath('consultations.0.facture.lignes.0.libelle', 'Consultation')
            ->assertJsonCount(1, 'consultations.0.documents')
            ->assertJsonPath('consultations.0.documents.0.type', 'ordonnance');
    }

    public function test_consultation_documents_are_listed_newest_first(): void
    {
        [, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, ['client_id' => $client->id]);
        $consultation = $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        $ancienne = $this->makeDocument($profil, $rdv, 'ordonnance', $consultation);
        $recente = $this->makeDocument($profil, $rdv, 'ordonnance', $consultation);

        SessionAuth::actingAs($client);

        $this->getJson('/api/client/consultations')
            ->assertOk()
            ->assertJsonPath('consultations.0.documents.0.id', $recente->id)
            ->assertJsonPath('consultations.0.documents.1.id', $ancienne->id);
    }

    public function test_client_lists_only_his_documents(): void
    {
        [, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, ['client_id' => $client->id]);
        $ordonnance = $this->makeDocument($profil, $rdv, 'ordonnance');
        $facture = $this->makeDocument($profil, $rdv, 'facture');

        $autreDocument = $this->makeDocument(
            $profil,
            $this->makeRendezVous($profil, ['email' => 'autre@example.test']),
            'ordonnance'
        );

        SessionAuth::actingAs($client);

        $response = $this->getJson('/api/client/documents')->assertOk();

        $this->assertEqualsCanonicalizing([$ordonnance->id, $facture->id], $response->json('documents.*.id'));
        $this->assertNotContains($autreDocument->id, $response->json('documents.*.id'));
        $response->assertJsonPath('documents.0.rendez_vous.id', $rdv->id);
    }

    public function test_client_downloads_only_his_own_document(): void
    {
        Storage::fake('local');

        [, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $document = $this->makeDocument($profil, $this->makeRendezVous($profil, ['client_id' => $client->id]), 'ordonnance');
        Storage::disk('local')->put($document->chemin, '%PDF-1.4 test');

        $autreDocument = $this->makeDocument(
            $profil,
            $this->makeRendezVous($profil, ['email' => 'autre@example.test']),
            'ordonnance'
        );
        Storage::disk('local')->put($autreDocument->chemin, '%PDF-1.4 autre');

        SessionAuth::actingAs($client);

        $this->get("/api/client/documents/{$document->id}/download")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        $this->get("/api/client/documents/{$autreDocument->id}/download")
            ->assertNotFound();
    }

    public function test_medecin_cannot_access_client_dossier(): void
    {
        [$medecinUser] = $this->makeMedecin();
        SessionAuth::actingAs($medecinUser);

        $this->getJson('/api/client/consultations')->assertForbidden();
        $this->getJson('/api/client/documents')->assertForbidden();
    }

    private function makeDocument(
        MedecinProfile $profil,
        RendezVous $rendezVous,
        string $type,
        ?Consultation $consultation = null
    ): GeneratedDocument {
        return GeneratedDocument::create([
            'medecin_profile_id' => $profil->id,
            'rendez_vous_id' => $rendezVous->id,
            'consultation_id' => $consultation?->id,
            'type' => $type,
            'titre' => ucfirst($type).' test',
            'chemin' => 'generated-documents/'.$profil->id.'/'.Str::uuid().'.pdf',
            'taille' => 1024,
        ]);
    }
}
