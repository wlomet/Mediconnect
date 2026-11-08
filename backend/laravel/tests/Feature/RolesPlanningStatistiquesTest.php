<?php

namespace Tests\Feature;

use App\Models\Directeur;
use App\Models\Gestionnaire;
use App\Models\GestionnaireMedecin;
use App\Models\Hopital;
use App\Models\HoraireMedecin;
use App\Models\IndisponibiliteMedecin;
use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use App\Models\User;
use App\Services\MailService;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class RolesPlanningStatistiquesTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    private const PERIODE = 'from=2026-01-01&to=2026-01-31';

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')->andReturn([]));
    }

    public function test_directeur_voit_les_statistiques_de_tous_les_medecins_de_son_hopital(): void
    {
        $hopital = $this->makeHopital();
        [, $profilA] = $this->makeMedecinIn($hopital);
        [, $profilB] = $this->makeMedecinIn($hopital);
        [, $profilC] = $this->makeMedecinIn($this->makeHopital());
        $directeur = $this->makeDirecteurIn($hopital);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-16 10:00');
        $this->rendezVousLe($profilC, '2026-01-17 10:00');

        SessionAuth::actingAs($directeur);

        $reponse = $this->getJson("/api/directeur/statistiques/rendez-vous?" . self::PERIODE)->assertOk()->json();

        $this->assertSame(2, array_sum(array_column($reponse['points'], 'confirmes')));
    }

    public function test_filtre_medecin_limite_les_statistiques_au_medecin_choisi(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA, $profilA] = $this->makeMedecinIn($hopital);
        [, $profilB] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-16 10:00');

        SessionAuth::actingAs($directeur);

        $reponse = $this->getJson("/api/directeur/statistiques/rendez-vous?" . self::PERIODE . "&medecin_id={$medecinA->id}")
            ->assertOk()
            ->json();

        $this->assertSame(1, array_sum(array_column($reponse['points'], 'confirmes')));
    }

    public function test_directeur_ne_filtre_pas_sur_un_medecin_d_un_autre_hopital(): void
    {
        $hopital = $this->makeHopital();
        [$medecinC] = $this->makeMedecinIn($this->makeHopital());
        $directeur = $this->makeDirecteurIn($hopital);

        SessionAuth::actingAs($directeur);

        $this->getJson("/api/directeur/statistiques/rendez-vous?" . self::PERIODE . "&medecin_id={$medecinC->id}")
            ->assertForbidden();
    }

    public function test_secretaire_independante_ne_voit_que_les_medecins_lies(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        [$medecinB, $profilB] = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$medecinA]);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-16 10:00');

        SessionAuth::actingAs($secretaire);

        $reponse = $this->getJson("/api/secretaire/statistiques/rendez-vous?" . self::PERIODE)->assertOk()->json();
        $this->assertSame(1, array_sum(array_column($reponse['points'], 'confirmes')));

        $this->getJson("/api/secretaire/statistiques/rendez-vous?" . self::PERIODE . "&medecin_id={$medecinB->id}")
            ->assertForbidden();
    }

    public function test_secretaire_d_hopital_voit_les_medecins_de_son_hopital(): void
    {
        $hopital = $this->makeHopital();
        [, $profilA] = $this->makeMedecinIn($hopital);
        [, $profilB] = $this->makeMedecinIn($hopital);
        $secretaire = $this->makeSecretaireIn($hopital, []);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-16 10:00');

        SessionAuth::actingAs($secretaire);

        $reponse = $this->getJson("/api/secretaire/statistiques/rendez-vous?" . self::PERIODE)->assertOk()->json();
        $this->assertSame(2, array_sum(array_column($reponse['points'], 'confirmes')));
    }

    public function test_gestionnaire_independant_voit_seulement_ses_medecins_lies(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        [, $profilB] = $this->makeMedecinIn(null);
        $gestionnaire = $this->makeGestionnaireIn(null, [$medecinA]);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-16 10:00');

        SessionAuth::actingAs($gestionnaire);

        $reponse = $this->getJson("/api/gestionnaire/statistiques/rendez-vous?" . self::PERIODE)->assertOk()->json();
        $this->assertSame(1, array_sum(array_column($reponse['points'], 'confirmes')));
    }

    public function test_planning_et_export_refusent_un_medecin_non_lie(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        [$medecinB] = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$medecinA]);

        SessionAuth::actingAs($secretaire);

        $this->getJson("/api/secretaire/medecins/{$medecinA->id}/planning")
            ->assertOk()
            ->assertJsonPath('medecin_profile_id', $profilA->id);

        $this->getJson("/api/secretaire/medecins/{$medecinB->id}/planning")->assertForbidden();
        $this->getJson("/api/secretaire/medecins/{$medecinB->id}/planning/export?" . self::PERIODE . "&format=json")
            ->assertForbidden();
    }

    public function test_directeur_liste_les_medecins_de_son_hopital(): void
    {
        $hopital = $this->makeHopital();
        $this->makeMedecinIn($hopital);
        $this->makeMedecinIn($hopital);
        $this->makeMedecinIn($this->makeHopital());
        $directeur = $this->makeDirecteurIn($hopital);

        SessionAuth::actingAs($directeur);

        $this->getJson('/api/directeur/medecins-hopital')->assertOk()->assertJsonCount(2, 'medecins');
    }

    public function test_directeur_liste_les_rendez_vous_de_tous_les_medecins_de_son_hopital(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA, $profilA] = $this->makeMedecinIn($hopital);
        [$medecinB, $profilB] = $this->makeMedecinIn($hopital);
        [, $profilC] = $this->makeMedecinIn($this->makeHopital());
        $directeur = $this->makeDirecteurIn($hopital);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilB, '2026-01-15 10:00');
        $this->rendezVousLe($profilC, '2026-01-17 10:00');

        SessionAuth::actingAs($directeur);

        $reponse = $this->getJson('/api/directeur/rendez-vous-hopital')->assertOk()->json();

        $this->assertCount(2, $reponse['rendez_vous']);
        $this->assertEqualsCanonicalizing(
            [$medecinA->id, $medecinB->id],
            array_column(array_column($reponse['rendez_vous'], 'medecin'), 'id'),
        );
        $this->assertSame('Patient Test', $reponse['rendez_vous'][0]['name']);
    }

    public function test_export_json_du_directeur_renvoie_les_rendez_vous_du_medecin(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA, $profilA] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        $this->rendezVousLe($profilA, '2026-01-15 10:00');
        $this->rendezVousLe($profilA, '2026-03-15 10:00');

        SessionAuth::actingAs($directeur);

        $this->getJson("/api/directeur/medecins/{$medecinA->id}/planning/export?" . self::PERIODE . "&format=json")
            ->assertOk()
            ->assertJsonCount(1, 'lignes');
    }

    public function test_directeur_cree_un_rendez_vous_pour_un_medecin_de_son_hopital_seulement(): void
    {
        $hopital = $this->makeHopital();
        [, $profilA] = $this->makeMedecinIn($hopital);
        [, $profilC] = $this->makeMedecinIn($this->makeHopital());
        $directeur = $this->makeDirecteurIn($hopital);

        SessionAuth::actingAs($directeur);

        $payload = [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Contrôle',
            'date_debut' => now()->addDays(3)->setTime(9, 0)->toIso8601String(),
            'date_fin' => now()->addDays(3)->setTime(9, 30)->toIso8601String(),
        ];

        $this->postJson('/api/directeur/rendez-vous', $payload + ['medecin_id' => $profilA->id])->assertCreated();
        $this->postJson('/api/directeur/rendez-vous', $payload + ['medecin_id' => $profilC->id])->assertForbidden();
    }

    public function test_secretaire_independante_ne_modifie_pas_les_horaires_d_un_medecin_non_lie(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        [$medecinB, $profilB] = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$medecinA]);

        HoraireMedecin::create([
            'medecin_id' => $profilA->id, 'jour' => 'lundi', 'creneau' => 'matin',
            'heure_debut' => '08:30', 'heure_fin' => '12:30', 'actif' => true,
        ]);
        HoraireMedecin::create([
            'medecin_id' => $profilB->id, 'jour' => 'lundi', 'creneau' => 'matin',
            'heure_debut' => '08:30', 'heure_fin' => '12:30', 'actif' => true,
        ]);

        SessionAuth::actingAs($secretaire);

        $this->patchJson("/api/secretaire/medecins/{$medecinA->id}/horaires/toggle", [
            'jour' => 'lundi', 'creneau' => 'matin', 'actif' => false,
        ])->assertOk();

        $this->patchJson("/api/secretaire/medecins/{$medecinB->id}/horaires/toggle", [
            'jour' => 'lundi', 'creneau' => 'matin', 'actif' => false,
        ])->assertForbidden();

        $this->assertFalse((bool) HoraireMedecin::where('medecin_id', $profilA->id)->first()->actif);
        $this->assertTrue((bool) HoraireMedecin::where('medecin_id', $profilB->id)->first()->actif);
    }

    public function test_directeur_supprime_horaire_et_indisponibilite(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA, $profilA] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        HoraireMedecin::create([
            'medecin_id' => $profilA->id, 'jour' => 'lundi', 'creneau' => 'matin',
            'heure_debut' => '08:30', 'heure_fin' => '12:30', 'actif' => true,
        ]);
        $indisponibilite = IndisponibiliteMedecin::create([
            'medecin_id' => $profilA->id, 'date_debut' => '2026-02-01', 'date_fin' => '2026-02-03', 'motif' => 'Congé',
        ]);

        SessionAuth::actingAs($directeur);

        $this->deleteJson("/api/directeur/medecins/{$medecinA->id}/horaires", [
            'jour' => 'lundi', 'creneau' => 'matin',
        ])->assertOk();

        $this->deleteJson("/api/directeur/medecins/{$medecinA->id}/indisponibilites/{$indisponibilite->id}")
            ->assertOk();

        $this->assertSame(0, HoraireMedecin::where('medecin_id', $profilA->id)->count());
        $this->assertSame(0, IndisponibiliteMedecin::where('medecin_id', $profilA->id)->count());
    }

    public function test_indisponibilite_qui_chevauche_est_refusee(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        SessionAuth::actingAs($directeur);

        $this->postJson("/api/directeur/medecins/{$medecinA->id}/indisponibilites", [
            'date_debut' => '2026-02-01', 'date_fin' => '2026-02-03',
        ])->assertCreated();

        $this->postJson("/api/directeur/medecins/{$medecinA->id}/indisponibilites", [
            'date_debut' => '2026-02-02', 'date_fin' => '2026-02-05',
        ])->assertUnprocessable();
    }

    public function test_patient_ne_accede_pas_au_planning_du_directeur(): void
    {
        $patient = $this->makeUserWithRole('client');

        SessionAuth::actingAs($patient);

        $this->getJson('/api/directeur/medecins-hopital')->assertForbidden();
    }

    public function test_secretaire_liste_les_rendez_vous_a_valider_de_ses_medecins(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        [, $profilB] = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$medecinA]);

        $aValider = $this->makeRendezVous($profilA, ['statut' => 'en_attente']);
        $this->makeRendezVous($profilB, ['statut' => 'en_attente']);
        $this->makeRendezVous($profilA, ['statut' => 'confirmé']);

        SessionAuth::actingAs($secretaire);

        $this->getJson('/api/secretaire/rendez-vous/a-valider')
            ->assertOk()
            ->assertJsonCount(1, 'rendez_vous')
            ->assertJsonPath('rendez_vous.0.id', $aValider->id)
            ->assertJsonPath('rendez_vous.0.medecin.id', $medecinA->id);
    }

    public function test_dashboard_secretaire_compte_les_rendez_vous_a_valider(): void
    {
        [$medecinA, $profilA] = $this->makeMedecinIn(null);
        $secretaire = $this->makeSecretaireIn(null, [$medecinA]);

        $this->makeRendezVous($profilA, ['statut' => 'en_attente']);
        $this->makeRendezVous($profilA, [
            'statut' => 'en_attente',
            'date_debut' => now()->addWeeks(3),
            'date_fin' => now()->addWeeks(3)->addMinutes(30),
        ]);
        $this->makeRendezVous($profilA, ['statut' => 'confirmé']);

        SessionAuth::actingAs($secretaire);

        $this->getJson('/api/secretaire/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.rendez_vous_a_valider', 2)
            ->assertJsonPath('stats.rendez_vous_a_valider_plus_2_semaines', 1);
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

    /** @return array{0: User, 1: MedecinProfile} */
    private function makeMedecinIn(?Hopital $hopital): array
    {
        $user = $this->makeUserWithRole('medecin');

        return [$user, MedecinProfile::create(['user_id' => $user->id, 'hopital_id' => $hopital?->id])];
    }

    private function makeDirecteurIn(Hopital $hopital): User
    {
        $user = $this->makeUserWithRole('directeur');
        Directeur::create(['user_id' => $user->id, 'hopital_id' => $hopital->id, 'name' => 'Directeur']);

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

    private function rendezVousLe(MedecinProfile $profil, string $debut): void
    {
        $this->makeRendezVous($profil, [
            'date_debut' => Carbon::parse($debut),
            'date_fin' => Carbon::parse($debut)->addMinutes(30),
        ]);
    }
}
