<?php

namespace Tests\Feature;

use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\PdfImage;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class PdfImageLibraryTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        Storage::fake('local');
    }

    public function test_establishment_logos_are_shared_with_its_doctors_and_director(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        [$medecinB] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        $logoMedecin = $this->uploadImage($medecinA);
        $logoDirecteur = $this->uploadImage($directeur, 'directeur');

        $this->assertDatabaseHas('pdf_images', ['id' => $logoMedecin, 'hopital_id' => $hopital->id, 'medecin_profile_id' => null]);

        $this->assertLibraryContains($medecinB, 'medecin', $logoMedecin);
        $this->assertLibraryContains($directeur, 'directeur', $logoMedecin);
        $this->assertLibraryContains($medecinA, 'medecin', $logoDirecteur);
    }

    public function test_doctor_without_establishment_keeps_a_private_library(): void
    {
        [$medecin, $profil] = $this->makeMedecinIn(null);
        [$autre] = $this->makeMedecinIn(null);

        $logoId = $this->uploadImage($medecin);

        $this->assertDatabaseHas('pdf_images', ['id' => $logoId, 'hopital_id' => null, 'medecin_profile_id' => $profil->id]);
        $this->assertLibraryDoesNotContain($autre, 'medecin', $logoId);
    }

    public function test_personal_logo_of_a_doctor_linked_to_an_establishment_stays_private(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA, $profilA] = $this->makeMedecinIn($hopital);
        [$medecinB] = $this->makeMedecinIn($hopital);

        $personnel = PdfImage::create([
            'medecin_profile_id' => $profilA->id,
            'nom' => 'perso.png',
            'chemin' => 'pdf-images/' . $profilA->id . '/perso.png',
            'mime' => 'image/png',
            'taille' => 100,
        ]);

        $this->assertLibraryContains($medecinA, 'medecin', $personnel->id);
        $this->assertLibraryDoesNotContain($medecinB, 'medecin', $personnel->id);
    }

    public function test_logos_of_another_establishment_are_not_accessible(): void
    {
        $hopital = $this->makeHopital();
        $autreHopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        [$medecinAutre] = $this->makeMedecinIn($autreHopital);

        $logoId = $this->uploadImage($medecinA);

        $this->assertLibraryDoesNotContain($medecinAutre, 'medecin', $logoId);

        SessionAuth::actingAs($medecinAutre);
        $this->get("/api/medecin/pdf-images/{$logoId}/file")->assertNotFound();
        $this->deleteJson("/api/medecin/pdf-images/{$logoId}")->assertNotFound();

        $this->assertDatabaseHas('pdf_images', ['id' => $logoId]);
    }

    public function test_colleague_can_delete_a_shared_logo(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        [$medecinB] = $this->makeMedecinIn($hopital);

        $logoId = $this->uploadImage($medecinA);

        SessionAuth::actingAs($medecinB);
        $this->deleteJson("/api/medecin/pdf-images/{$logoId}")->assertOk();

        $this->assertDatabaseMissing('pdf_images', ['id' => $logoId]);
    }

    public function test_shared_logo_can_be_used_in_templates_by_doctor_and_director(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        [$medecinB] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);

        $logoId = $this->uploadImage($medecinA);

        SessionAuth::actingAs($medecinB);
        $this->postJson('/api/medecin/pdf-templates', $this->templatePayload($logoId))->assertCreated();

        SessionAuth::actingAs($directeur);
        $this->postJson('/api/directeur/pdf-templates/from-default', [
            'type' => 'ordonnance',
            'pdf_image_id' => $logoId,
        ])->assertCreated();
    }

    public function test_template_cannot_use_logo_of_another_establishment(): void
    {
        $hopital = $this->makeHopital();
        $autreHopital = $this->makeHopital();
        [$medecinB] = $this->makeMedecinIn($hopital);
        [$medecinAutre] = $this->makeMedecinIn($autreHopital);

        $logoAutre = $this->uploadImage($medecinAutre);

        SessionAuth::actingAs($medecinB);
        $this->postJson('/api/medecin/pdf-templates', $this->templatePayload($logoAutre))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('layout');
    }

    public function test_images_and_logos_share_the_library_and_are_filtered_by_type(): void
    {
        $hopital = $this->makeHopital();
        [$medecinA] = $this->makeMedecinIn($hopital);
        [$medecinB] = $this->makeMedecinIn($hopital);

        $logo = $this->uploadImage($medecinA, 'medecin', 'logo');
        $image = $this->uploadImage($medecinA, 'medecin', 'image');

        $this->assertDatabaseHas('pdf_images', ['id' => $image, 'type' => 'image', 'hopital_id' => $hopital->id]);
        $this->assertStringStartsWith('pdf-images/hopital-' . $hopital->id . '/', PdfImage::find($image)->chemin);

        $this->assertLibraryIds($medecinB, 'medecin', [], [$logo, $image]);
        $this->assertLibraryIds($medecinB, 'medecin', ['type' => 'logo'], [$logo]);
        $this->assertLibraryIds($medecinB, 'medecin', ['type' => 'image'], [$image]);
    }

    public function test_existing_images_default_to_logos(): void
    {
        [, $profil] = $this->makeMedecinIn(null);

        $ancienne = PdfImage::create([
            'medecin_profile_id' => $profil->id,
            'nom' => 'ancien.png',
            'chemin' => 'pdf-images/' . $profil->id . '/ancien.png',
            'mime' => 'image/png',
            'taille' => 100,
        ]);

        $this->assertSame(PdfImage::TYPE_LOGO, $ancienne->fresh()->type);
    }

    public function test_upload_requires_a_known_type(): void
    {
        [$medecin] = $this->makeMedecinIn($this->makeHopital());
        SessionAuth::actingAs($medecin);

        $this->post('/api/medecin/pdf-images', [
            'image' => UploadedFile::fake()->image('doc.png'),
            'type' => 'document',
        ], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('type');
    }

    public function test_default_template_only_accepts_logos(): void
    {
        $hopital = $this->makeHopital();
        [$medecin] = $this->makeMedecinIn($hopital);
        $directeur = $this->makeDirecteurIn($hopital);
        $image = $this->uploadImage($medecin, 'medecin', 'image');

        SessionAuth::actingAs($directeur);
        $this->postJson('/api/directeur/pdf-templates/from-default', [
            'type' => 'ordonnance',
            'pdf_image_id' => $image,
        ])->assertUnprocessable()->assertJsonValidationErrors('pdf_image_id');
    }

    public function test_image_can_be_used_in_templates(): void
    {
        [$medecin] = $this->makeMedecinIn($this->makeHopital());
        $image = $this->uploadImage($medecin, 'medecin', 'image');

        $this->postJson('/api/medecin/pdf-templates', $this->templatePayload($image))->assertCreated();
    }

    /** @param array<string, string> $query */
    private function assertLibraryIds(User $user, string $role, array $query, array $expected): void
    {
        SessionAuth::actingAs($user);

        $ids = $this->getJson("/api/{$role}/pdf-images?" . http_build_query($query))->assertOk()->json('images.*.id');
        $this->assertEqualsCanonicalizing($expected, $ids);
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

    private function uploadImage(User $user, string $role = 'medecin', string $type = 'logo'): int
    {
        SessionAuth::actingAs($user);

        return $this->post("/api/{$role}/pdf-images", [
            'image' => UploadedFile::fake()->image('image.png'),
            'type' => $type,
        ], ['Accept' => 'application/json'])
            ->assertCreated()
            ->json('image.id');
    }

    private function assertLibraryContains(User $user, string $role, int $imageId): void
    {
        SessionAuth::actingAs($user);

        $this->assertContains($imageId, $this->getJson("/api/{$role}/pdf-images")->assertOk()->json('images.*.id'));
    }

    private function assertLibraryDoesNotContain(User $user, string $role, int $imageId): void
    {
        SessionAuth::actingAs($user);

        $this->assertNotContains($imageId, $this->getJson("/api/{$role}/pdf-images")->assertOk()->json('images.*.id'));
    }

    /** @return array<string, mixed> */
    private function templatePayload(int $logoId): array
    {
        return [
            'nom' => 'Ordonnance partagée',
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
                    'pdf_image_id' => $logoId,
                ]],
            ],
        ];
    }
}
