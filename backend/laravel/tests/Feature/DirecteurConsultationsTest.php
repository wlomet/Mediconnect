<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class DirecteurConsultationsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_directeur_liste_les_consultations_des_medecins_de_son_hopital_seulement(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $autreProfil = $this->makeMedecinIn($this->makeHopital());
        [, $independant] = $this->makeMedecin();

        $dansHopital = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['name' => 'Marie Martin']), Consultation::TERMINEE);
        $this->makeConsultation($autreProfil, $this->makeRendezVous($autreProfil));
        $this->makeConsultation($independant, $this->makeRendezVous($independant));

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 1)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $dansHopital->id)
            ->assertJsonPath('data.0.medecin.id', $profil->user_id)
            ->assertJsonPath('data.0.patient.nom', 'Marie Martin')
            ->assertJsonPath('data.0.statut', Consultation::TERMINEE);
    }

    public function test_tri_par_defaut_par_date_de_creation_decroissante(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $ancienne = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        $recente = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        $this->fixerDateCreation($ancienne, '2026-01-10 09:00:00');
        $this->fixerDateCreation($recente, '2026-03-10 09:00:00');

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('data.0.id', $recente->id)
            ->assertJsonPath('data.1.id', $ancienne->id);

        $this->getJson('/api/directeur/consultations/datatable?order[0][column]=0&order[0][dir]=asc')
            ->assertOk()
            ->assertJsonPath('data.0.id', $ancienne->id);
    }

    public function test_recherche_par_nom_de_patient(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $marie = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['name' => 'Marie Martin']), Consultation::TERMINEE);
        $this->makeConsultation($profil, $this->makeRendezVous($profil, ['name' => 'Paul Durand']), Consultation::ABANDONNEE);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable?search[value]=marie')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 2)
            ->assertJsonPath('recordsFiltered', 1)
            ->assertJsonPath('data.0.id', $marie->id);
    }

    public function test_pagination_renvoie_la_page_demandee(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        for ($i = 0; $i < 3; $i++) {
            $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        }

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable?start=2&length=2')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 3)
            ->assertJsonCount(1, 'data');
    }

    public function test_filtres_statut_et_medecin(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $medecin = $this->makeMedecinIn($hopital);
        $autre = $this->makeMedecinIn($hopital);

        $terminee = $this->makeConsultation($medecin, $this->makeRendezVous($medecin), Consultation::TERMINEE);
        $this->makeConsultation($medecin, $this->makeRendezVous($medecin));
        $this->makeConsultation($autre, $this->makeRendezVous($autre), Consultation::TERMINEE);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable?statut=terminee&medecin_id='.$medecin->user_id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $terminee->id);

        $this->getJson('/api/directeur/consultations/datatable?statut=terminee')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_medecin_d_un_autre_hopital_est_refuse_en_filtre(): void
    {
        $directeur = $this->makeDirecteur($this->makeHopital());
        $autre = $this->makeMedecinIn($this->makeHopital());
        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable?medecin_id='.$autre->user_id)->assertForbidden();
    }

    public function test_liste_expose_les_indicateurs_sans_contenu_medical(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'patient@example.test']));
        $consultation->update(['ordonnance_texte' => 'Texte confidentiel']);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('data.0.ordonnance_decision', Consultation::GENEREE)
            ->assertJsonMissingPath('data.0.ordonnance_texte')
            ->assertJsonMissingPath('data.0.rendez_vous.motif')
            ->assertJsonMissingPath('data.0.patient.email');
    }

    public function test_export_csv_respecte_le_statut_et_la_periode(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $dedans = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['name' => 'Dedans Patient']), Consultation::TERMINEE);
        $dedans->update(['started_at' => '2030-03-04 10:00:00']);
        $dehors = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['name' => 'Dehors Patient']), Consultation::TERMINEE);
        $dehors->update(['started_at' => '2030-03-06 10:00:00']);

        SessionAuth::actingAs($directeur);

        $response = $this->get('/api/directeur/consultations/export?statut=terminee&from=2030-03-04&to=2030-03-04')->assertOk();

        $this->assertStringContainsString('Dedans Patient', $response->streamedContent());
        $this->assertStringContainsString('consultations_terminee_2030-03-04_2030-03-04.csv', $response->headers->get('Content-Disposition'));
    }

    public function test_export_json_donne_entetes_et_lignes_du_tableau(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        $consultation->update(['started_at' => '2030-03-04 10:00:00']);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/export?format=json&from=2030-03-04&to=2030-03-04')
            ->assertOk()
            ->assertJsonPath('nom_base', 'consultations_toutes_2030-03-04_2030-03-04')
            ->assertJsonPath('entetes.0', 'Médecin')
            ->assertJsonCount(1, 'lignes')
            ->assertJsonPath('lignes.0.7', 'Terminée')
            ->assertJsonPath('lignes.0.8', 'Non');
    }

    public function test_export_refuse_une_periode_inversee(): void
    {
        $directeur = $this->makeDirecteur($this->makeHopital());
        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations/export?from=2030-03-05&to=2030-03-04')->assertUnprocessable();
    }

    public function test_seul_le_directeur_accede_a_la_liste(): void
    {
        [$medecin] = $this->makeMedecin();
        SessionAuth::actingAs($medecin);

        $this->getJson('/api/directeur/consultations/datatable')->assertForbidden();
    }

    public function test_la_liste_est_en_lecture_seule(): void
    {
        $directeur = $this->makeDirecteur($this->makeHopital());
        SessionAuth::actingAs($directeur);

        $this->postJson('/api/directeur/consultations/datatable', [])->assertMethodNotAllowed();
    }

    // created_at n'est pas assignable : mise à jour directe pour fixer l'ordre de création
    private function fixerDateCreation(Consultation $consultation, string $date): void
    {
        DB::table('consultations')->where('id', $consultation->id)->update(['created_at' => $date]);
    }

    private function makeHopital(): Hopital
    {
        return Hopital::create([
            'name' => 'Clinique '.uniqid(),
            'adresse' => '1 rue du Test',
            'telephone' => '0100000000',
            'ville' => 'Paris',
        ]);
    }

    private function makeDirecteur(Hopital $hopital): User
    {
        $user = $this->makeUserWithRole('directeur');
        Directeur::create(['user_id' => $user->id, 'hopital_id' => $hopital->id, 'name' => 'Directeur']);

        return $user;
    }

    private function makeMedecinIn(Hopital $hopital): MedecinProfile
    {
        $user = $this->makeUserWithRole('medecin');

        return MedecinProfile::create(['user_id' => $user->id, 'hopital_id' => $hopital->id]);
    }
}
