<?php

namespace Tests\Feature;

use App\Models\Consultation;
use App\Models\Gestionnaire;
use App\Models\GestionnaireMedecin;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\TestCase;

class RendezVousDeletionTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_medecin_deletes_own_rendez_vous_without_consultation(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($user);

        $this->deleteJson("/api/medecin/rendez-vous/{$rdv->id}")->assertOk();

        $this->assertDatabaseMissing('rendez_vous', ['id' => $rdv->id]);
    }

    public function test_medecin_cannot_delete_another_medecins_rendez_vous(): void
    {
        [, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        [$autre] = $this->makeMedecin();
        Sanctum::actingAs($autre);

        $this->deleteJson("/api/medecin/rendez-vous/{$rdv->id}")->assertForbidden();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id]);
    }

    public function test_rendez_vous_with_a_consultation_cannot_be_deleted_whatever_its_status(): void
    {
        foreach ([Consultation::EN_COURS, Consultation::ABANDONNEE, Consultation::TERMINEE] as $statut) {
            [$user, $profil] = $this->makeMedecin();
            $rdv = $this->makeRendezVous($profil);
            $this->makeConsultation($profil, $rdv, $statut);
            Sanctum::actingAs($user);

            $this->deleteJson("/api/medecin/rendez-vous/{$rdv->id}")
                ->assertStatus(409);

            $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id]);
        }
    }

    public function test_secretaire_cannot_delete_rendez_vous_with_consultation(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $secretaire = $this->makeUserWithRole('secretaire');
        Secretaire::create(['user_id' => $secretaire->id, 'name' => 'Secretaire test']);
        SecretaireMedecin::create([
            'secretaire_id' => $secretaire->id,
            'medecin_id' => $medecin->id,
            'statut' => 'accepte',
        ]);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::ABANDONNEE);
        Sanctum::actingAs($secretaire);

        $this->deleteJson("/api/secretaire/rendez-vous/{$rdv->id}")->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id]);
    }

    public function test_gestionnaire_cannot_delete_rendez_vous_with_consultation(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $gestionnaire = $this->makeUserWithRole('gestionnaire');
        Gestionnaire::create(['user_id' => $gestionnaire->id, 'name' => 'Gestionnaire test']);
        GestionnaireMedecin::create([
            'gestionnaire_id' => $gestionnaire->id,
            'medecin_id' => $medecin->id,
            'statut' => 'accepte',
        ]);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        Sanctum::actingAs($gestionnaire);

        $this->deleteJson("/api/gestionnaire/rendez-vous/{$rdv->id}")->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id]);
    }

    public function test_show_exposes_consultation_statut_to_the_medecin(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($user);

        $this->getJson("/api/medecin/rendez-vous/{$rdv->id}")
            ->assertOk()
            ->assertJsonPath('rendez_vous.consultation_statut', 'en_cours');
    }
}
