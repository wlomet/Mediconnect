<?php

namespace Tests\Feature;

use App\Models\Consultation;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\TestCase;

class RendezVousStatutTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_terminated_statut_cannot_be_set_manually(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'terminé'])
            ->assertUnprocessable();
    }

    public function test_terminated_rendez_vous_is_frozen_but_can_be_saved_unchanged(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil, ['statut' => 'terminé']);
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'terminé', 'notes' => 'RAS'])
            ->assertOk();

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'confirmé'])
            ->assertUnprocessable();
    }

    public function test_cancel_is_refused_while_consultation_is_in_progress(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'annulé'])
            ->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'statut' => 'confirmé']);
    }

    public function test_cancel_is_allowed_after_consultation_was_abandoned(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::ABANDONNEE);
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'annulé'])
            ->assertOk();
    }

    public function test_client_cancel_is_refused_while_consultation_is_in_progress(): void
    {
        [, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $rdv = $this->makeRendezVous($profil, ['client_id' => $client->id]);
        $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($client);

        $this->patchJson("/api/client/rendez-vous/{$rdv->id}/cancel")
            ->assertStatus(409);
    }

    public function test_invalid_statut_is_rejected(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($user);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['statut' => 'foo'])
            ->assertUnprocessable();
    }
}
