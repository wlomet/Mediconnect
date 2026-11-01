<?php

namespace Tests\Feature;

use App\Models\Consultation;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\TestCase;

class CsvExportTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_consultations_export_contains_only_own_consultations_with_patient_and_rendez_vous(): void
    {
        [$user, $profil] = $this->makeMedecin();
        [, $autreProfil] = $this->makeMedecin();

        $rdv = $this->makeRendezVous($profil, [
            'name' => 'Marie Martin',
            'email' => 'marie@example.test',
            'date_debut' => '2030-03-04 09:00:00',
            'date_fin' => '2030-03-04 09:30:00',
        ]);
        $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        $this->makeConsultation($autreProfil, $this->makeRendezVous($autreProfil, ['email' => 'autre@example.test']));
        Sanctum::actingAs($user);

        $lignes = $this->lignesCsv($this->get('/api/medecin/consultations/export')->assertOk());

        $this->assertSame(
            ['Nom', 'Email', 'Date du rendez-vous', 'Motif', 'Statut du rendez-vous', 'Début de consultation', 'Fin de consultation', 'Statut de consultation', 'Ordonnance', 'Montant facture (EUR)', "Motif d'abandon"],
            $lignes[0]
        );
        $this->assertCount(2, $lignes);
        $this->assertSame(['Marie Martin', 'marie@example.test', '04/03/2030 09:00', 'Contrôle', 'confirmé'], array_slice($lignes[1], 0, 5));
        $this->assertSame('Terminée', $lignes[1][7]);
    }

    public function test_consultations_export_respects_statut_filter(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'terminee@example.test']), Consultation::TERMINEE);
        $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'encours@example.test']));
        Sanctum::actingAs($user);

        $response = $this->get('/api/medecin/consultations/export?statut=terminee')->assertOk();
        $lignes = $this->lignesCsv($response);

        $this->assertCount(2, $lignes);
        $this->assertSame('terminee@example.test', $lignes[1][1]);
        $this->assertStringContainsString('consultations_terminee_', $response->headers->get('Content-Disposition'));
    }

    public function test_consultations_export_writes_invoice_total_with_comma_decimal(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/consultations/{$consultation->id}/facture", [
            'lignes' => [['libelle' => 'Consultation', 'quantite' => 2, 'prix_unitaire' => 10.5]],
        ])->assertOk();

        $lignes = $this->lignesCsv($this->get('/api/medecin/consultations/export')->assertOk());

        $this->assertSame('21,00', $lignes[1][9]);
    }

    public function test_planning_export_keeps_only_own_rendez_vous_within_inclusive_dates(): void
    {
        [$user, $profil] = $this->makeMedecin();
        [, $autreProfil] = $this->makeMedecin();

        $this->makeRendezVous($profil, ['email' => 'avant@example.test', 'date_debut' => '2030-03-03 23:30:00', 'date_fin' => '2030-03-03 23:59:00']);
        $this->makeRendezVous($profil, ['name' => 'Premier', 'email' => 'premier@example.test', 'date_debut' => '2030-03-04 00:00:00', 'date_fin' => '2030-03-04 00:30:00']);
        $this->makeRendezVous($profil, ['name' => 'Dernier', 'email' => 'dernier@example.test', 'date_debut' => '2030-03-04 23:30:00', 'date_fin' => '2030-03-04 23:59:00']);
        $this->makeRendezVous($profil, ['email' => 'apres@example.test', 'date_debut' => '2030-03-05 08:00:00', 'date_fin' => '2030-03-05 08:30:00']);
        $this->makeRendezVous($autreProfil, ['email' => 'autre@example.test', 'date_debut' => '2030-03-04 10:00:00', 'date_fin' => '2030-03-04 10:30:00']);
        Sanctum::actingAs($user);

        $response = $this->get('/api/medecin/planning/export?from=2030-03-04&to=2030-03-04')->assertOk();
        $lignes = $this->lignesCsv($response);

        $this->assertSame(['Date', 'Heure début', 'Heure fin', 'Nom', 'Email', 'Statut'], $lignes[0]);
        $this->assertCount(3, $lignes);
        $this->assertSame(['04/03/2030', '00:00', '00:30', 'Premier', 'premier@example.test', 'confirmé'], $lignes[1]);
        $this->assertSame(['04/03/2030', '23:30', '23:59', 'Dernier', 'dernier@example.test', 'confirmé'], $lignes[2]);
        $this->assertStringContainsString('rendez-vous_2030-03-04_2030-03-04.csv', $response->headers->get('Content-Disposition'));
    }

    public function test_planning_export_refuses_inverted_dates(): void
    {
        [$user] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->getJson('/api/medecin/planning/export?from=2030-03-05&to=2030-03-04')->assertUnprocessable();
    }

    public function test_planning_export_is_refused_to_non_medecin(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $this->get('/api/medecin/planning/export?from=2030-03-04&to=2030-03-04')->assertForbidden();
    }

    /** @return array<int, array<int, string>> */
    private function lignesCsv(TestResponse $response): array
    {
        $contenu = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBF", $contenu);

        $lignes = array_values(array_filter(explode("\r\n", substr($contenu, 3))));

        return array_map(fn (string $ligne) => str_getcsv($ligne, ';'), $lignes);
    }
}
