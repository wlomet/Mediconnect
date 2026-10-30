<?php

namespace Tests\Feature;

use App\Models\AntecedentOption;
use App\Models\User;
use Database\Seeders\AntecedentOptionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ClientAntecedentTest extends TestCase
{
    use RefreshDatabase;

    private function makeUserWithRole(string $role): User
    {
        Role::firstOrCreate(['name' => $role]);

        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($role);

        return $user;
    }

    /**
     * Retourne une option "Aucun" et une autre option de la même catégorie.
     *
     * @return array{0: AntecedentOption, 1: AntecedentOption}
     */
    private function sameCategoryPair(): array
    {
        $aucun = AntecedentOption::where('est_aucun', true)->firstOrFail();
        $autre = AntecedentOption::where('categorie', $aucun->categorie)
            ->where('est_aucun', false)
            ->firstOrFail();

        return [$aucun, $autre];
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(AntecedentOptionSeeder::class);
    }

    public function test_client_can_read_catalogue_and_empty_selection(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $response = $this->getJson('/api/client/antecedents');

        $response->assertOk()
            ->assertJsonStructure([
                'categories' => [['categorie', 'options' => [['id', 'libelle', 'est_aucun']]]],
                'selected',
                'commentaire',
            ])
            ->assertJsonPath('selected', [])
            ->assertJsonPath('commentaire', null);
    }

    public function test_client_can_save_options_and_comment(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $options = AntecedentOption::where('est_aucun', false)->take(2)->pluck('id')->all();

        $response = $this->putJson('/api/client/antecedents', [
            'options' => $options,
            'commentaire' => '  Allergie déclarée en 2020  ',
        ]);

        $response->assertOk()
            ->assertJsonPath('commentaire', 'Allergie déclarée en 2020');

        $this->assertEqualsCanonicalizing($options, $response->json('selected'));
        $this->assertDatabaseCount('client_antecedent_options', 2);
        $this->assertDatabaseHas('users', [
            'id' => $client->id,
            'antecedents_commentaire' => 'Allergie déclarée en 2020',
        ]);
    }

    public function test_saving_replaces_previous_selection(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $first = AntecedentOption::where('est_aucun', false)->take(2)->pluck('id')->all();
        $this->putJson('/api/client/antecedents', ['options' => $first])->assertOk();

        $second = AntecedentOption::where('est_aucun', false)->skip(2)->take(1)->pluck('id')->all();
        $this->putJson('/api/client/antecedents', ['options' => $second])->assertOk();

        $this->assertEqualsCanonicalizing($second, $client->antecedentOptions()->allRelatedIds()->all());
    }

    public function test_aucun_cannot_be_combined_with_another_option_of_same_category(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        [$aucun, $autre] = $this->sameCategoryPair();

        $this->putJson('/api/client/antecedents', [
            'options' => [$aucun->id, $autre->id],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['options']);

        $this->assertDatabaseCount('client_antecedent_options', 0);
    }

    public function test_blank_comment_is_stored_as_null(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $this->putJson('/api/client/antecedents', [
            'options' => [],
            'commentaire' => '   ',
        ])->assertOk()
            ->assertJsonPath('commentaire', null)
            ->assertJsonPath('selected', []);
    }

    public function test_unknown_option_is_rejected(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $this->putJson('/api/client/antecedents', ['options' => [999999]])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['options.0']);
    }

    public function test_comment_is_limited_to_1000_characters(): void
    {
        $client = $this->makeUserWithRole('client');
        Sanctum::actingAs($client);

        $this->putJson('/api/client/antecedents', [
            'options' => [],
            'commentaire' => str_repeat('a', 1001),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['commentaire']);
    }

    public function test_medecin_cannot_access_client_antecedents(): void
    {
        $medecin = $this->makeUserWithRole('medecin');
        Sanctum::actingAs($medecin);

        $this->getJson('/api/client/antecedents')->assertForbidden();
        $this->putJson('/api/client/antecedents', ['options' => []])->assertForbidden();
    }
}
