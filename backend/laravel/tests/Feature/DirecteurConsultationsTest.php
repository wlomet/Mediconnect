<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

        $this->getJson('/api/directeur/consultations')
            ->assertOk()
            ->assertJsonCount(1, 'consultations')
            ->assertJsonPath('consultations.0.id', $dansHopital->id)
            ->assertJsonPath('consultations.0.medecin.id', $profil->user_id)
            ->assertJsonPath('consultations.0.patient.nom', 'Marie Martin')
            ->assertJsonPath('consultations.0.statut', Consultation::TERMINEE);
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

        $this->getJson('/api/directeur/consultations?statut=terminee&medecin_id='.$medecin->user_id)
            ->assertOk()
            ->assertJsonCount(1, 'consultations')
            ->assertJsonPath('consultations.0.id', $terminee->id);

        $this->getJson('/api/directeur/consultations?statut=terminee')
            ->assertOk()
            ->assertJsonCount(2, 'consultations');
    }

    public function test_medecin_d_un_autre_hopital_est_refuse_en_filtre(): void
    {
        $directeur = $this->makeDirecteur($this->makeHopital());
        $autre = $this->makeMedecinIn($this->makeHopital());
        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations?medecin_id='.$autre->user_id)->assertForbidden();
    }

    public function test_liste_expose_les_indicateurs_sans_contenu_medical(): void
    {
        $hopital = $this->makeHopital();
        $directeur = $this->makeDirecteur($hopital);
        $profil = $this->makeMedecinIn($hopital);
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'patient@example.test']));
        $consultation->update(['ordonnance_texte' => 'Texte confidentiel']);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/consultations')
            ->assertOk()
            ->assertJsonPath('consultations.0.ordonnance_decision', Consultation::GENEREE)
            ->assertJsonMissingPath('consultations.0.ordonnance_texte')
            ->assertJsonMissingPath('consultations.0.rendez_vous.motif')
            ->assertJsonMissingPath('consultations.0.patient.email');
    }

    public function test_seul_le_directeur_accede_a_la_liste(): void
    {
        [$medecin] = $this->makeMedecin();
        SessionAuth::actingAs($medecin);

        $this->getJson('/api/directeur/consultations')->assertForbidden();
    }

    public function test_la_liste_est_en_lecture_seule(): void
    {
        $directeur = $this->makeDirecteur($this->makeHopital());
        SessionAuth::actingAs($directeur);

        $this->postJson('/api/directeur/consultations', [])->assertMethodNotAllowed();
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
