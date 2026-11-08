<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class SuperAdminConsultationsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));
    }

    public function test_liste_les_consultations_de_tous_les_etablissements_et_des_medecins_independants(): void
    {
        $profilSud = $this->makeMedecinIn($this->makeHopital('Clinique Sud'));
        $profilNord = $this->makeMedecinIn($this->makeHopital('Clinique Nord'));
        [, $independant] = $this->makeMedecin();

        $this->makeConsultation($profilSud, $this->makeRendezVous($profilSud), Consultation::TERMINEE);
        $this->makeConsultation($profilNord, $this->makeRendezVous($profilNord));
        $this->makeConsultation($independant, $this->makeRendezVous($independant));

        $this->getJson('/api/super-admin/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 3)
            ->assertJsonCount(3, 'data');
    }

    public function test_chaque_consultation_indique_son_etablissement(): void
    {
        $profil = $this->makeMedecinIn($this->makeHopital('Clinique Sud'));
        [, $independant] = $this->makeMedecin();
        $dansHopital = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $independante = $this->makeConsultation($independant, $this->makeRendezVous($independant));

        $parId = collect($this->getJson('/api/super-admin/consultations/datatable')->assertOk()->json('data'))->keyBy('id');

        $this->assertSame('Clinique Sud', $parId[$dansHopital->id]['medecin']['etablissement']);
        $this->assertSame('Sans établissement', $parId[$independante->id]['medecin']['etablissement']);
    }

    public function test_filtres_etablissement_et_statut(): void
    {
        $hopital = $this->makeHopital('Clinique Sud');
        $profil = $this->makeMedecinIn($hopital);
        $autre = $this->makeMedecinIn($this->makeHopital('Clinique Nord'));

        $terminee = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $this->makeConsultation($autre, $this->makeRendezVous($autre), Consultation::TERMINEE);

        $this->getJson('/api/super-admin/consultations/datatable?hopital_id='.$hopital->id)
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->getJson('/api/super-admin/consultations/datatable?hopital_id='.$hopital->id.'&statut=terminee')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $terminee->id);
    }

    public function test_filtre_par_medecin_avec_son_identifiant_utilisateur(): void
    {
        $profil = $this->makeMedecinIn($this->makeHopital('Clinique Sud'));
        $autre = $this->makeMedecinIn($this->makeHopital('Clinique Nord'));
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil));
        $this->makeConsultation($autre, $this->makeRendezVous($autre));

        $this->getJson('/api/super-admin/consultations/datatable?medecin_id='.$profil->user_id)
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $consultation->id);
    }

    public function test_la_liste_n_expose_pas_de_contenu_medical(): void
    {
        $profil = $this->makeMedecinIn($this->makeHopital('Clinique Sud'));
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil, ['email' => 'patient@example.test']));
        $consultation->update(['ordonnance_texte' => 'Texte confidentiel']);

        $this->getJson('/api/super-admin/consultations/datatable')
            ->assertOk()
            ->assertJsonMissingPath('data.0.ordonnance_texte')
            ->assertJsonMissingPath('data.0.rendez_vous.motif')
            ->assertJsonMissingPath('data.0.patient.email');
    }

    public function test_seul_le_super_admin_accede_a_la_liste(): void
    {
        [$medecin] = $this->makeMedecin();
        SessionAuth::actingAs($medecin);

        $this->getJson('/api/super-admin/consultations/datatable')->assertForbidden();
    }

    public function test_la_liste_est_en_lecture_seule(): void
    {
        $this->postJson('/api/super-admin/consultations/datatable', [])->assertMethodNotAllowed();
    }

    private function makeHopital(string $nom): Hopital
    {
        return Hopital::create([
            'name' => $nom,
            'adresse' => '1 rue du Test',
            'telephone' => '0100000000',
            'ville' => 'Paris',
        ]);
    }

    private function makeMedecinIn(Hopital $hopital): MedecinProfile
    {
        $user = $this->makeUserWithRole('medecin');

        return MedecinProfile::create(['user_id' => $user->id, 'hopital_id' => $hopital->id]);
    }
}
