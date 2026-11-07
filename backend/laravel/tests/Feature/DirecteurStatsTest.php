<?php

namespace Tests\Feature;

use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class DirecteurStatsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
    }

    public function test_total_rdv_mois_counts_current_month_in_paris_time(): void
    {
        $hopital = $this->makeHopital();
        $autreHopital = $this->makeHopital();
        $directeur = $this->makeUserWithRole('directeur');
        Directeur::create(['user_id' => $directeur->id, 'hopital_id' => $hopital->id, 'name' => 'Directeur']);
        $profil = $this->makeMedecinIn($hopital);
        $autre = $this->makeMedecinIn($autreHopital);

        $debut = now('Europe/Paris')->startOfMonth();
        $fin = now('Europe/Paris')->endOfMonth()->startOfSecond();

        // Dans le mois : premier instant, milieu, dernière seconde
        $this->makeRdvAt($profil, $debut);
        $this->makeRdvAt($profil, $debut->copy()->addDays(14)->setTime(10, 0));
        $this->makeRdvAt($profil, $fin);

        // Hors du mois : seconde précédente et premier instant du mois suivant
        $this->makeRdvAt($profil, $debut->copy()->subSecond());
        $this->makeRdvAt($profil, $debut->copy()->addMonth());

        // Autre hôpital : jamais compté
        $this->makeRdvAt($autre, $debut->copy()->addDay());

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/stats')
            ->assertOk()
            ->assertJsonPath('stats.total_rdv', 5)
            ->assertJsonPath('stats.total_rdv_mois', 3);
    }

    private function makeHopital(): Hopital
    {
        return Hopital::create([
            'name' => 'Clinique ' . uniqid(),
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

    // Les dates sont stockées en UTC, comme l'application.
    private function makeRdvAt(MedecinProfile $profil, Carbon $debutParis): void
    {
        $this->makeRendezVous($profil, [
            'date_debut' => $debutParis->copy()->utc(),
            'date_fin' => $debutParis->copy()->addMinutes(30)->utc(),
        ]);
    }
}
