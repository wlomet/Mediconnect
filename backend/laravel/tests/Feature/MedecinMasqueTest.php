<?php

namespace Tests\Feature;

use App\Models\MedecinProfile;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\TestCase;

class MedecinMasqueTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    /** @return array{0: \App\Models\User, 1: MedecinProfile} */
    private function makeMedecinMasque(): array
    {
        [$user, $profil] = $this->makeMedecin();
        $user->update(['hide' => true]);

        return [$user, $profil];
    }

    public function test_masked_medecin_cannot_create_rendez_vous_for_himself(): void
    {
        [$user, $profil] = $this->makeMedecinMasque();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', ['medecin_id' => $profil->id])
            ->assertForbidden()
            ->assertJsonPath('message', MedecinProfile::MESSAGE_COMPTE_MASQUE);

        $this->assertDatabaseCount('rendez_vous', 0);
    }

    public function test_masked_medecin_cannot_start_quick_consultation(): void
    {
        [$user] = $this->makeMedecinMasque();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/consultations', [
            'name' => 'Marie Martin',
            'email' => 'marie@example.test',
            'motif' => 'Consultation',
        ])
            ->assertForbidden()
            ->assertJsonPath('message', MedecinProfile::MESSAGE_COMPTE_MASQUE);

        $this->assertDatabaseCount('rendez_vous', 0);
        $this->assertDatabaseCount('consultations', 0);
    }

    public function test_masked_medecin_cannot_start_consultation_from_existing_rendez_vous(): void
    {
        [$user, $profil] = $this->makeMedecinMasque();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/consultations', ['rendez_vous_id' => $rdv->id])
            ->assertForbidden()
            ->assertJsonPath('message', MedecinProfile::MESSAGE_COMPTE_MASQUE);

        $this->assertDatabaseCount('consultations', 0);
    }

    public function test_public_booking_on_masked_medecin_keeps_generic_message(): void
    {
        [, $profil] = $this->makeMedecinMasque();

        $this->postJson('/api/rendezvous', ['medecin_id' => $profil->id])
            ->assertForbidden()
            ->assertJsonPath('message', "Ce médecin n'est plus disponible pour la prise de rendez-vous.");
    }
}
