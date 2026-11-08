<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Gestionnaire;
use App\Models\GestionnaireMedecin;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class GestionnaireSecretaireConsultationsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_gestionnaire_d_hopital_voit_les_consultations_de_son_hopital(): void
    {
        $hopital = $this->makeHopital();
        $gestionnaire = $this->makeGestionnaireIn($hopital, []);
        $dedans = $this->makeMedecinIn($hopital);
        $dehors = $this->makeMedecinIn($this->makeHopital());
        $this->makeConsultation($dedans, $this->makeRendezVous($dedans), Consultation::TERMINEE);
        $this->makeConsultation($dehors, $this->makeRendezVous($dehors), Consultation::TERMINEE);

        SessionAuth::actingAs($gestionnaire);

        $this->getJson('/api/gestionnaire/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 1)
            ->assertJsonPath('data.0.medecin.id', $dedans->user_id);
    }

    public function test_gestionnaire_independant_ne_voit_que_les_medecins_lies(): void
    {
        $lie = $this->makeMedecinIn(null);
        $autre = $this->makeMedecinIn(null);
        $gestionnaire = $this->makeGestionnaireIn(null, [$lie->user]);
        $this->makeConsultation($lie, $this->makeRendezVous($lie), Consultation::TERMINEE);
        $this->makeConsultation($autre, $this->makeRendezVous($autre), Consultation::TERMINEE);

        SessionAuth::actingAs($gestionnaire);

        $this->getJson('/api/gestionnaire/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 1)
            ->assertJsonPath('data.0.medecin.id', $lie->user_id);

        $this->getJson('/api/gestionnaire/consultations/datatable?medecin_id='.$autre->user_id)
            ->assertForbidden();
    }

    public function test_gestionnaire_exporte_les_consultations_de_la_periode(): void
    {
        $hopital = $this->makeHopital();
        $gestionnaire = $this->makeGestionnaireIn($hopital, []);
        $profil = $this->makeMedecinIn($hopital);
        $consultation = $this->makeConsultation($profil, $this->makeRendezVous($profil), Consultation::TERMINEE);
        $consultation->update(['started_at' => '2030-03-04 10:00:00']);

        SessionAuth::actingAs($gestionnaire);

        $this->getJson('/api/gestionnaire/consultations/export?format=json&from=2030-03-04&to=2030-03-04')
            ->assertOk()
            ->assertJsonCount(1, 'lignes')
            ->assertJsonPath('lignes.0.7', 'Terminée');
    }

    public function test_secretaire_independante_ne_voit_que_les_medecins_lies(): void
    {
        $lie = $this->makeMedecinIn(null);
        $autre = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$lie->user]);
        $this->makeConsultation($lie, $this->makeRendezVous($lie), Consultation::TERMINEE);
        $this->makeConsultation($autre, $this->makeRendezVous($autre), Consultation::TERMINEE);

        SessionAuth::actingAs($secretaire);

        $this->getJson('/api/secretaire/consultations/datatable')
            ->assertOk()
            ->assertJsonPath('recordsTotal', 1)
            ->assertJsonPath('data.0.medecin.id', $lie->user_id);

        $this->getJson('/api/secretaire/consultations/datatable?medecin_id='.$autre->user_id)
            ->assertForbidden();
    }

    public function test_secretaire_n_a_pas_d_export(): void
    {
        $secretaire = $this->makeSecretaireIn($this->makeHopital(), []);
        SessionAuth::actingAs($secretaire);

        $this->getJson('/api/secretaire/consultations/export')->assertNotFound();
    }

    public function test_medecin_n_accede_pas_aux_listes_gestionnaire_et_secretaire(): void
    {
        [$medecin] = $this->makeMedecin();
        SessionAuth::actingAs($medecin);

        $this->getJson('/api/gestionnaire/consultations/datatable')->assertForbidden();
        $this->getJson('/api/secretaire/consultations/datatable')->assertForbidden();
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

    private function makeMedecinIn(?Hopital $hopital): MedecinProfile
    {
        $user = $this->makeUserWithRole('medecin');

        return MedecinProfile::create(['user_id' => $user->id, 'hopital_id' => $hopital?->id]);
    }

    /** @param  User[]  $medecins  liaisons acceptées (cas gestionnaire indépendant) */
    private function makeGestionnaireIn(?Hopital $hopital, array $medecins): User
    {
        $user = $this->makeUserWithRole('gestionnaire');
        Gestionnaire::create(['user_id' => $user->id, 'hopital_id' => $hopital?->id, 'name' => 'Gestionnaire test']);

        foreach ($medecins as $medecin) {
            GestionnaireMedecin::create(['gestionnaire_id' => $user->id, 'medecin_id' => $medecin->id, 'statut' => 'accepte']);
        }

        return $user;
    }

    /** @param  User[]  $medecins  liaisons acceptées (cas secrétaire indépendante) */
    private function makeSecretaireIn(?Hopital $hopital, array $medecins): User
    {
        $user = $this->makeUserWithRole('secretaire');
        Secretaire::create(['user_id' => $user->id, 'hopital_id' => $hopital?->id, 'name' => 'Secretaire test']);

        foreach ($medecins as $medecin) {
            SecretaireMedecin::create(['secretaire_id' => $user->id, 'medecin_id' => $medecin->id, 'statut' => 'accepte']);
        }

        return $user;
    }
}
