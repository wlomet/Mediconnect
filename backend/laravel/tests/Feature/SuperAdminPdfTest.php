<?php

namespace Tests\Feature;

use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class SuperAdminPdfTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));
    }

    public function test_template_attributed_to_an_establishment_is_shared_with_its_doctors(): void
    {
        $hopital = $this->makeHopital();
        [$medecin] = $this->makeMedecinIn($hopital);
        $logo = $this->uploadLogo(['owner_type' => 'hopital', 'owner_id' => $hopital->id]);

        $modele = $this->postJson('/api/super-admin/pdf-templates/from-default', [
            'type' => 'ordonnance',
            'pdf_image_id' => $logo,
            'owner_type' => 'hopital',
            'owner_id' => $hopital->id,
        ])->assertCreated()
            ->assertJsonPath('template.proprietaire_type', 'hopital')
            ->json('template.id');

        $this->assertDatabaseHas('pdf_templates', ['id' => $modele, 'hopital_id' => $hopital->id, 'medecin_profile_id' => null]);

        SessionAuth::actingAs($medecin);
        $this->assertContains($modele, $this->getJson('/api/medecin/pdf-templates')->assertOk()->json('templates.*.id'));
        $this->putJson("/api/medecin/pdf-templates/{$modele}", [])->assertNotFound();
    }

    public function test_template_cannot_use_a_logo_outside_the_owner_library(): void
    {
        $hopital = $this->makeHopital();
        $autre = $this->makeHopital();
        $logoAutre = $this->uploadLogo(['owner_type' => 'hopital', 'owner_id' => $autre->id]);

        $this->postJson('/api/super-admin/pdf-templates/from-default', [
            'type' => 'ordonnance',
            'pdf_image_id' => $logoAutre,
            'owner_type' => 'hopital',
            'owner_id' => $hopital->id,
        ])->assertUnprocessable()->assertJsonValidationErrors('pdf_image_id');
    }

    public function test_doctor_library_contains_establishment_logos_and_own_logos_only(): void
    {
        $hopital = $this->makeHopital();
        [, $profil] = $this->makeMedecinIn($hopital);
        [, $autreProfil] = $this->makeMedecinIn($hopital);

        $logoHopital = $this->uploadLogo(['owner_type' => 'hopital', 'owner_id' => $hopital->id]);
        $logoPerso = $this->uploadLogo(['owner_type' => 'medecin', 'owner_id' => $profil->id]);
        $logoAutrePerso = $this->uploadLogo(['owner_type' => 'medecin', 'owner_id' => $autreProfil->id]);

        $ids = $this->getJson("/api/super-admin/pdf-images?owner_type=medecin&owner_id={$profil->id}")
            ->assertOk()
            ->json('images.*.id');

        $this->assertEqualsCanonicalizing([$logoHopital, $logoPerso], $ids);
        $this->assertNotContains($logoAutrePerso, $ids);
    }

    public function test_update_checks_logos_against_the_template_owner_library(): void
    {
        $hopital = $this->makeHopital();
        [, $profil] = $this->makeMedecinIn($hopital);
        [, $autreProfil] = $this->makeMedecinIn($hopital);

        $logoPerso = $this->uploadLogo(['owner_type' => 'medecin', 'owner_id' => $profil->id]);
        $logoAutrePerso = $this->uploadLogo(['owner_type' => 'medecin', 'owner_id' => $autreProfil->id]);

        $modele = $this->postJson('/api/super-admin/pdf-templates/from-default', [
            'type' => 'ordonnance',
            'pdf_image_id' => $logoPerso,
            'owner_type' => 'medecin',
            'owner_id' => $profil->id,
        ])->assertCreated()->json('template.id');

        $this->putJson("/api/super-admin/pdf-templates/{$modele}", [
            'nom' => 'Ordonnance',
            'type' => 'ordonnance',
            'layout' => [
                'format' => 'A4',
                'elements' => [[
                    'id' => 'logo',
                    'type' => 'image',
                    'x' => 40,
                    'y' => 30,
                    'width' => 160,
                    'height' => 80,
                    'pdf_image_id' => $logoAutrePerso,
                ]],
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors('layout');
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

    /** @param array<string, mixed> $proprietaire */
    private function uploadLogo(array $proprietaire): int
    {
        return $this->post('/api/super-admin/pdf-images', $proprietaire + [
            'image' => UploadedFile::fake()->image('logo.png'),
            'type' => 'logo',
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('image.id');
    }
}
