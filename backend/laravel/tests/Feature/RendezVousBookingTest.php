<?php

namespace Tests\Feature;

use App\Models\MedecinProfile;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\TestCase;

class RendezVousBookingTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    private function payload(MedecinProfile $profil, array $overrides = []): array
    {
        return array_merge([
            'medecin_id' => $profil->id,
            'name' => 'Patient',
            'email' => 'patient@example.test',
            'motif' => 'Consultation',
            'date_debut' => now()->addDays(2)->setTime(9, 0)->toIso8601String(),
            'date_fin' => now()->addDays(2)->setTime(9, 30)->toIso8601String(),
            'statut' => 'en_attente',
        ], $overrides);
    }

    public function test_medecin_booking_keeps_the_patient_entered(): void
    {
        [$user, $profil] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payload($profil, [
            'name' => 'Jean Dupont',
            'email' => 'jean@example.test',
        ]))->assertCreated();

        $this->assertDatabaseHas('rendez_vous', [
            'medecin_id' => $profil->id,
            'name' => 'Jean Dupont',
            'email' => 'jean@example.test',
            'author_id' => $user->id,
        ]);
    }

    public function test_booking_links_existing_client_account_by_email(): void
    {
        [$user, $profil] = $this->makeMedecin();
        $client = $this->makeUserWithRole('client');
        $client->update(['email' => 'client@example.test']);
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payload($profil, [
            'email' => 'client@example.test',
        ]))->assertCreated();

        $this->assertDatabaseHas('rendez_vous', ['medecin_id' => $profil->id, 'client_id' => $client->id]);
    }

    public function test_booking_for_another_medecin_profile_is_refused(): void
    {
        [$user] = $this->makeMedecin();
        [, $autreProfil] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payload($autreProfil))
            ->assertUnprocessable();
    }

    public function test_booking_requires_email_or_phone(): void
    {
        [$user, $profil] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payload($profil, [
            'email' => null,
            'phone' => null,
        ]))->assertUnprocessable();
    }

    public function test_booking_cannot_be_created_directly_as_terminated(): void
    {
        [$user, $profil] = $this->makeMedecin();
        Sanctum::actingAs($user);

        $this->postJson('/api/medecin/rendez-vous', $this->payload($profil, ['statut' => 'terminé']))
            ->assertUnprocessable();
    }
}
