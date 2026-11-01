<?php

namespace Tests\Feature;

use App\Models\AntecedentOption;
use App\Models\Specialite;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\RendezVousFixtures;
use Tests\Feature\Concerns\SessionAuth;
use Tests\TestCase;

class SuperAdminReferentielsTest extends TestCase
{
    use RefreshDatabase;
    use RendezVousFixtures;

    public function test_antecedent_option_can_be_added_renamed_and_deactivated(): void
    {
        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));

        $id = $this->postJson('/api/super-admin/antecedent-options', [
            'categorie' => 'Allergies',
            'libelle' => 'Gluten',
        ])->assertCreated()->json('option.id');

        $this->assertDatabaseHas('antecedent_options', ['id' => $id, 'code' => 'allergies_gluten', 'actif' => true]);

        $this->putJson("/api/super-admin/antecedent-options/{$id}", [
            'categorie' => 'Allergies alimentaires',
            'libelle' => 'Gluten (blé)',
            'est_aucun' => false,
            'actif' => false,
        ])->assertOk();

        $this->assertDatabaseHas('antecedent_options', [
            'id' => $id,
            'categorie' => 'Allergies alimentaires',
            'libelle' => 'Gluten (blé)',
            'code' => 'allergies_gluten',
            'actif' => false,
        ]);
    }

    public function test_deleting_an_antecedent_option_also_removes_patient_selections(): void
    {
        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));

        $option = AntecedentOption::create([
            'categorie' => 'Test',
            'code' => 'test_option',
            'libelle' => 'Option',
            'est_aucun' => false,
            'actif' => true,
        ]);
        $patient = User::factory()->create(['is_active' => true]);
        $patient->antecedentOptions()->attach($option->id);

        $this->getJson('/api/super-admin/antecedent-options')
            ->assertOk()
            ->assertJsonFragment(['patients_count' => 1]);

        $this->deleteJson("/api/super-admin/antecedent-options/{$option->id}")->assertOk();

        $this->assertDatabaseMissing('client_antecedent_options', ['antecedent_option_id' => $option->id]);
    }

    public function test_specialite_slug_is_generated_and_unique_and_unused_specialite_can_be_deleted(): void
    {
        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));

        $id = $this->postJson('/api/super-admin/specialites', ['nom' => 'Pneumologue'])
            ->assertCreated()
            ->assertJsonPath('specialite.slug', 'pneumologue')
            ->json('specialite.id');

        $this->postJson('/api/super-admin/specialites', ['nom' => 'Pneumologue'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('nom');

        $this->deleteJson("/api/super-admin/specialites/{$id}")->assertOk();
        $this->assertDatabaseMissing('specialites', ['id' => $id]);
    }

    public function test_specialite_used_by_a_doctor_cannot_be_deleted(): void
    {
        SessionAuth::actingAs($this->makeUserWithRole('super-admin'));

        $specialite = Specialite::create(['nom' => 'Cardiologue', 'slug' => 'cardiologue']);
        [, $profil] = $this->makeMedecin();
        $profil->update(['specialite_id' => $specialite->id]);

        $this->deleteJson("/api/super-admin/specialites/{$specialite->id}")->assertStatus(409);

        $this->assertDatabaseHas('specialites', ['id' => $specialite->id]);
    }
}
