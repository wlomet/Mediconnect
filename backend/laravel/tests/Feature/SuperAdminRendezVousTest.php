<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class SuperAdminRendezVousTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));
    }

    public function test_rendez_vous_of_the_whole_application_can_be_filtered_and_searched(): void
    {
        [, $profil] = $this->makeMedecin();
        $this->makeRendezVous($profil, ['name' => 'Alice Martin', 'statut' => 'confirmé']);
        $this->makeRendezVous($profil, ['name' => 'Bob Durand', 'statut' => 'annulé']);

        $this->getJson('/api/super-admin/rendez-vous?statut=annulé')
            ->assertOk()
            ->assertJsonCount(1, 'rendez_vous')
            ->assertJsonPath('rendez_vous.0.patient', 'Bob Durand');

        $this->getJson('/api/super-admin/rendez-vous?search=martin')
            ->assertOk()
            ->assertJsonCount(1, 'rendez_vous')
            ->assertJsonPath('rendez_vous.0.patient', 'Alice Martin');
    }

    public function test_export_contains_the_filtered_rendez_vous(): void
    {
        [, $profil] = $this->makeMedecin();
        $this->makeRendezVous($profil, ['name' => 'Alice Martin', 'statut' => 'confirmé']);
        $this->makeRendezVous($profil, ['name' => 'Bob Durand', 'statut' => 'annulé']);

        $response = $this->get('/api/super-admin/rendez-vous/export?statut=confirmé')->assertOk();

        $this->assertStringContainsString('text/csv', $response->headers->get('Content-Type'));
        $contenu = $response->streamedContent();
        $this->assertStringContainsString('Alice Martin', $contenu);
        $this->assertStringNotContainsString('Bob Durand', $contenu);
    }
}
