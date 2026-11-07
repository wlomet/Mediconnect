<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\ConsultationFacture;
use App\Models\MedecinProfile;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class MedecinStatistiquesTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_rendez_vous_compte_confirmes_et_annules_de_la_periode(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->rendezVousLe($profil, 'confirmé', '2026-01-15 10:00');
        $this->rendezVousLe($profil, 'terminé', '2026-01-16 10:00');
        $this->rendezVousLe($profil, 'annulé', '2026-01-17 10:00');
        $this->rendezVousLe($profil, 'en_attente', '2026-01-18 10:00');
        $this->rendezVousLe($profil, 'confirmé', '2026-02-01 10:00');

        [, $autre] = $this->makeMedecin();
        $this->rendezVousLe($autre, 'confirmé', '2026-01-15 11:00');

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/rendez-vous?from=2026-01-01&to=2026-01-31')
            ->assertOk()
            ->json();

        $this->assertCount(31, $reponse['points']);
        $this->assertEquals(2, array_sum(array_column($reponse['points'], 'confirmes')));
        $this->assertEquals(1, array_sum(array_column($reponse['points'], 'annules')));
        $this->assertEquals(['debut' => '2026-01-16', 'confirmes' => 1, 'annules' => 0], $reponse['points'][15]);
        $this->assertEquals(['debut' => '2026-01-17', 'confirmes' => 0, 'annules' => 1], $reponse['points'][16]);
    }

    public function test_consultations_comptent_terminees_et_abandonnees_de_la_periode(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->consultationLe($profil, Consultation::TERMINEE, '2026-01-15 10:00');
        $this->consultationLe($profil, Consultation::TERMINEE, '2026-01-20 10:00');
        $this->consultationLe($profil, Consultation::ABANDONNEE, '2026-01-21 10:00');
        $this->consultationLe($profil, Consultation::EN_COURS, '2026-01-22 10:00');
        $this->consultationLe($profil, Consultation::TERMINEE, '2026-02-03 10:00');

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/consultations?from=2026-01-01&to=2026-01-31')
            ->assertOk()
            ->json();

        $this->assertCount(31, $reponse['points']);
        $this->assertEquals(2, array_sum(array_column($reponse['points'], 'terminees')));
        $this->assertEquals(1, array_sum(array_column($reponse['points'], 'abandonnees')));
        $this->assertEquals(['debut' => '2026-01-20', 'terminees' => 1, 'abandonnees' => 0], $reponse['points'][19]);
    }

    public function test_documents_comptent_ordonnances_et_factures_de_la_periode(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $avecOrdonnance = $this->consultationLe($profil, Consultation::TERMINEE, '2026-01-15 10:00');
        $avecOrdonnance->update(['ordonnance_texte' => 'Ordonnance de test']);

        $abandonnee = $this->consultationLe($profil, Consultation::ABANDONNEE, '2026-01-16 10:00');
        ConsultationFacture::create(['consultation_id' => $abandonnee->id, 'total' => 1000]);

        $horsPeriode = $this->consultationLe($profil, Consultation::TERMINEE, '2026-02-10 10:00');
        $horsPeriode->update(['ordonnance_texte' => 'Ordonnance de test']);
        ConsultationFacture::create(['consultation_id' => $horsPeriode->id, 'total' => 50]);

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/documents?from=2026-01-01&to=2026-01-31')
            ->assertOk()
            ->json();

        $this->assertCount(31, $reponse['points']);
        $this->assertEquals(1, array_sum(array_column($reponse['points'], 'ordonnances')));
        $this->assertEquals(1, array_sum(array_column($reponse['points'], 'factures')));
        $this->assertEquals(['debut' => '2026-01-15', 'ordonnances' => 1, 'factures' => 0], $reponse['points'][14]);
        $this->assertEquals(['debut' => '2026-01-16', 'ordonnances' => 0, 'factures' => 1], $reponse['points'][15]);
    }

    public function test_montants_par_jour_pour_une_periode_courte(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->factureLe($profil, '2026-01-15 10:00', 1000);
        $this->factureLe($profil, '2026-01-15 16:00', 500.5);
        $this->factureLe($profil, '2026-01-31 09:00', 250);
        $this->factureLe($profil, '2026-02-01 09:00', 999);

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/factures?from=2026-01-01&to=2026-01-31')
            ->assertOk()
            ->json();

        $this->assertSame('jour', $reponse['granularite']);
        $this->assertEquals(1750.5, array_sum(array_column($reponse['points'], 'montant')));
        $this->assertCount(31, $reponse['points']);
        $this->assertEquals(['debut' => '2026-01-15', 'montant' => 1500.5], $reponse['points'][14]);
        $this->assertEquals(['debut' => '2026-01-02', 'montant' => 0], $reponse['points'][1]);
    }

    public function test_montants_par_mois_pour_une_periode_longue(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->factureLe($profil, '2026-01-15 10:00', 1000);
        $this->factureLe($profil, '2026-01-20 10:00', 500.5);
        $this->factureLe($profil, '2026-02-03 10:00', 400);

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/factures?from=2026-01-01&to=2026-03-31')
            ->assertOk()
            ->json();

        $this->assertSame('mois', $reponse['granularite']);
        $this->assertEquals(1900.5, array_sum(array_column($reponse['points'], 'montant')));
        $this->assertEquals([
            ['debut' => '2026-01-01', 'montant' => 1500.5],
            ['debut' => '2026-02-01', 'montant' => 400],
            ['debut' => '2026-03-01', 'montant' => 0],
        ], $reponse['points']);
    }

    public function test_courbes_regroupent_par_mois_pour_une_periode_longue(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->consultationLe($profil, Consultation::TERMINEE, '2026-01-15 10:00');
        $this->consultationLe($profil, Consultation::TERMINEE, '2026-01-20 10:00');
        $this->consultationLe($profil, Consultation::ABANDONNEE, '2026-03-02 10:00');

        SessionAuth::actingAs($user);

        $reponse = $this->getJson('/api/medecin/statistiques/consultations?from=2026-01-01&to=2026-03-31')
            ->assertOk()
            ->json();

        $this->assertSame('mois', $reponse['granularite']);
        $this->assertEquals([
            ['debut' => '2026-01-01', 'terminees' => 2, 'abandonnees' => 0],
            ['debut' => '2026-02-01', 'terminees' => 0, 'abandonnees' => 0],
            ['debut' => '2026-03-01', 'terminees' => 0, 'abandonnees' => 1],
        ], $reponse['points']);
    }

    public function test_periode_invalide_est_refusee(): void
    {
        [$user] = $this->makeMedecin();

        SessionAuth::actingAs($user);

        $this->getJson('/api/medecin/statistiques/factures?from=2026-02-01&to=2026-01-01')->assertUnprocessable();
        $this->getJson('/api/medecin/statistiques/rendez-vous')->assertUnprocessable();
    }

    public function test_seul_un_medecin_accede_aux_statistiques(): void
    {
        $patient = $this->makeUserWithRole('client');

        SessionAuth::actingAs($patient);

        $this->getJson('/api/medecin/statistiques/rendez-vous?from=2026-01-01&to=2026-01-31')->assertForbidden();
    }

    private function rendezVousLe(MedecinProfile $profil, string $statut, string $debut): void
    {
        $this->makeRendezVous($profil, [
            'statut' => $statut,
            'date_debut' => Carbon::parse($debut),
            'date_fin' => Carbon::parse($debut)->addMinutes(30),
        ]);
    }

    private function consultationLe(MedecinProfile $profil, string $statut, string $debut): Consultation
    {
        $rendezVous = $this->makeRendezVous($profil, [
            'date_debut' => Carbon::parse($debut),
            'date_fin' => Carbon::parse($debut)->addMinutes(30),
        ]);

        return Consultation::create([
            'medecin_profile_id' => $profil->id,
            'rendez_vous_id' => $rendezVous->id,
            'statut' => $statut,
            'started_at' => Carbon::parse($debut),
            'heure_debut_reelle' => Carbon::parse($debut),
            'ended_at' => $statut === Consultation::TERMINEE ? Carbon::parse($debut)->addMinutes(20) : null,
            'abandoned_at' => $statut === Consultation::ABANDONNEE ? Carbon::parse($debut) : null,
            'abandon_motif' => $statut === Consultation::ABANDONNEE ? 'Motif de test' : null,
        ]);
    }

    private function factureLe(MedecinProfile $profil, string $debut, float $total): void
    {
        $consultation = $this->consultationLe($profil, Consultation::TERMINEE, $debut);

        ConsultationFacture::create(['consultation_id' => $consultation->id, 'total' => $total]);
    }
}
