<?php

namespace Tests\Feature;

use ArrayObject;
use App\Models\Consultation;
use App\Models\Gestionnaire;
use App\Models\GestionnaireMedecin;
use App\Models\User;
use App\Services\MailService;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth as Sanctum;
use Tests\TestCase;

class RendezVousRolesModificationTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected ArrayObject $envois;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->envois = $this->espionnerEnvois();
    }

    public function test_medecin_saves_motif_change(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($medecin);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['motif' => 'Suivi'])->assertOk();

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Suivi']);
    }

    public function test_medecin_field_change_is_refused_when_consultation_is_linked(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv);
        Sanctum::actingAs($medecin);

        $this->putJson("/api/medecin/rendez-vous/{$rdv->id}", ['motif' => 'Suivi'])->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Contrôle']);
    }

    public function test_medecin_resends_confirmation_when_account_is_verified(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($medecin);

        $this->postJson("/api/medecin/rendez-vous/{$rdv->id}/renvoyer-email")->assertOk();

        $this->assertCount(1, $this->envois);
    }

    public function test_medecin_show_exposes_lock_flags(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($medecin);

        $this->getJson("/api/medecin/rendez-vous/{$rdv->id}")
            ->assertOk()
            ->assertJsonPath('rendez_vous.modifiable', true)
            ->assertJsonPath('rendez_vous.medecin.id', $medecin->id);

        $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);

        $this->getJson("/api/medecin/rendez-vous/{$rdv->id}")
            ->assertJsonPath('rendez_vous.modifiable', false);
    }

    public function test_gestionnaire_field_change_is_refused_when_consultation_is_linked(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $gestionnaire = $this->makeGestionnaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        $this->makeConsultation($profil, $rdv, Consultation::TERMINEE);
        Sanctum::actingAs($gestionnaire);

        $this->putJson("/api/gestionnaire/rendez-vous/{$rdv->id}", [
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'motif' => 'Suivi',
        ])->assertStatus(409);

        $this->assertDatabaseHas('rendez_vous', ['id' => $rdv->id, 'motif' => 'Contrôle']);
    }

    public function test_gestionnaire_cannot_resend_confirmation_for_pending_rendez_vous(): void
    {
        User::factory()->create(['email' => 'patient@example.test', 'email_verified_at' => now()]);
        [$medecin, $profil] = $this->makeMedecin();
        $gestionnaire = $this->makeGestionnaire($medecin);
        $rdv = $this->makeRendezVous($profil, ['statut' => 'en_attente']);
        Sanctum::actingAs($gestionnaire);

        $this->postJson("/api/gestionnaire/rendez-vous/{$rdv->id}/renvoyer-email")->assertUnprocessable();

        $this->assertCount(0, $this->envois);
    }

    public function test_gestionnaire_show_exposes_medecin_user_id(): void
    {
        [$medecin, $profil] = $this->makeMedecin();
        $gestionnaire = $this->makeGestionnaire($medecin);
        $rdv = $this->makeRendezVous($profil);
        Sanctum::actingAs($gestionnaire);

        $this->getJson("/api/gestionnaire/rendez-vous/{$rdv->id}")
            ->assertOk()
            ->assertJsonPath('rendez_vous.medecin.id', $medecin->id)
            ->assertJsonPath('rendez_vous.modifiable', true);
    }

    private function makeGestionnaire(User $medecin): User
    {
        $gestionnaire = $this->makeUserWithRole('gestionnaire');
        Gestionnaire::create(['user_id' => $gestionnaire->id, 'name' => 'Gestionnaire test']);
        GestionnaireMedecin::create([
            'gestionnaire_id' => $gestionnaire->id,
            'medecin_id' => $medecin->id,
            'statut' => 'accepte',
        ]);

        return $gestionnaire;
    }

    // Capture chaque envoi sans appeler Brevo.
    private function espionnerEnvois(): ArrayObject
    {
        $envois = new ArrayObject();

        $this->mock(MailService::class, fn ($mock) => $mock->shouldReceive('send')
            ->andReturnUsing(function (string $to, string $subject, array $options) use ($envois): array {
                $envois[] = ['to' => $to, 'subject' => $subject, 'html' => $options['html'] ?? ''];

                return [];
            }));

        return $envois;
    }
}
