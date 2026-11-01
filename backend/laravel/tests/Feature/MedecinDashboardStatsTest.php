<?php

namespace Tests\Feature;

use App\Models\Consultation;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class MedecinDashboardStatsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_dashboard_counters_follow_their_definitions(): void
    {
        [$user, $profil] = $this->makeMedecin();

        // Aujourd'hui, confirmé, sans consultation
        $this->makeRendezVous($profil, $this->creneau('confirmé', now()->setTime(9, 0), 'a@example.test'));

        // Aujourd'hui, en attente, avec consultation liée
        $avecConsultation = $this->makeRendezVous($profil, $this->creneau('en_attente', now()->setTime(10, 0), 'b@example.test'));
        $this->makeConsultation($profil, $avecConsultation);

        // Aujourd'hui, en attente, sans consultation
        $this->makeRendezVous($profil, $this->creneau('en_attente', now()->setTime(11, 0), 'c@example.test'));

        // Hors compteurs : annulé, terminé (avec consultation terminée), hier, demain
        $this->makeRendezVous($profil, $this->creneau('annulé', now()->setTime(12, 0), 'd@example.test'));
        $termine = $this->makeRendezVous($profil, $this->creneau('terminé', now()->setTime(13, 0), 'e@example.test'));
        $this->makeConsultation($profil, $termine, Consultation::TERMINEE);
        $this->makeRendezVous($profil, $this->creneau('confirmé', now()->subDay()->setTime(10, 0), 'f@example.test'));
        $this->makeRendezVous($profil, $this->creneau('confirmé', now()->addDay()->setTime(10, 0), 'g@example.test'));

        // En attente passé : compte dans "à valider" uniquement
        $this->makeRendezVous($profil, $this->creneau('en_attente', now()->subDays(3)->setTime(10, 0), 'h@example.test'));

        // Consultation du mois dernier : exclue
        $moisDernier = $this->makeRendezVous($profil, $this->creneau('terminé', now()->startOfMonth()->subDay()->setTime(10, 0), 'i@example.test'));
        Consultation::create([
            'medecin_profile_id' => $profil->id,
            'rendez_vous_id' => $moisDernier->id,
            'statut' => Consultation::TERMINEE,
            'started_at' => now()->startOfMonth()->subDay()->setTime(10, 0),
            'heure_debut_reelle' => now()->startOfMonth()->subDay()->setTime(10, 0),
            'ended_at' => now()->startOfMonth()->subDay()->setTime(10, 30),
        ]);

        // Consultation abandonnée ce mois-ci : exclue
        $abandonnee = $this->makeRendezVous($profil, $this->creneau('terminé', now()->startOfMonth()->setTime(8, 0), 'k@example.test'));
        $this->makeConsultation($profil, $abandonnee, Consultation::ABANDONNEE);

        // Rendez-vous d'un autre médecin : ne doit pas être compté
        [, $autre] = $this->makeMedecin();
        $this->makeRendezVous($autre, $this->creneau('en_attente', now()->setTime(15, 0), 'j@example.test'));

        SessionAuth::actingAs($user);

        $this->getJson('/api/medecin/dashboard/stats')
            ->assertOk()
            ->assertExactJson([
                'rendez_vous_aujourdhui' => 3,
                'patients_en_attente' => 2,
                'consultations_mois' => 2,
                'rendez_vous_a_valider' => 3,
            ]);
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
