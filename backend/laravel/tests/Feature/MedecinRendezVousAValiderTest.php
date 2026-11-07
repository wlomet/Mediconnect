<?php

namespace Tests\Feature;

use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class MedecinRendezVousAValiderTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_liste_seulement_les_rendez_vous_en_attente_du_medecin_du_plus_proche_au_plus_lointain(): void
    {
        [$user, $profil] = $this->makeMedecin();

        $this->makeRendezVous($profil, $this->creneau('en_attente', now()->addWeeks(3)->setTime(9, 0), 'loin@example.test'));
        $this->makeRendezVous($profil, $this->creneau('en_attente', now()->subDays(3)->setTime(10, 0), 'passe@example.test'));
        $this->makeRendezVous($profil, $this->creneau('confirmé', now()->addDay()->setTime(10, 0), 'confirme@example.test'));
        $this->makeRendezVous($profil, $this->creneau('annulé', now()->addDays(2)->setTime(10, 0), 'annule@example.test'));

        [, $autre] = $this->makeMedecin();
        $this->makeRendezVous($autre, $this->creneau('en_attente', now()->addDays(5)->setTime(10, 0), 'autre@example.test'));

        SessionAuth::actingAs($user);

        $this->getJson('/api/medecin/rendez-vous/a-valider')
            ->assertOk()
            ->assertJsonCount(2, 'rendez_vous')
            ->assertJsonPath('rendez_vous.0.email', 'passe@example.test')
            ->assertJsonPath('rendez_vous.1.email', 'loin@example.test')
            ->assertJsonPath('rendez_vous.0.statut', 'en_attente');
    }

    /** @return array<string, mixed> */
    private function creneau(string $statut, Carbon $debut, string $email): array
    {
        return [
            'statut' => $statut,
            'date_debut' => $debut,
            'date_fin' => $debut->copy()->addMinutes(30),
            'email' => $email,
        ];
    }
}
