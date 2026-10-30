<?php

namespace Database\Seeders\Test;

use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\User;
use App\Services\InactivityService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestInactivitySeeder extends Seeder
{
    //php artisan db:seed --class='Database\Seeders\Test\TestInactivitySeeder'
    public const EMAIL_PREFIX = 'test.inactif.';

    // Domaine réservé : aucun email réel n'est envoyé aux comptes de test
    public const EMAIL_DOMAIN = '@example.com';

    public const HOPITAL_PREFIX = '[TEST] Hopital ';

    public function run(): void
    {
        $overdue = now()->subYears(InactivityService::RETENTION_YEARS)->subDays(60);
        $soon = now()->subYears(InactivityService::RETENTION_YEARS)->addDays(15);
        $active = now()->subMonths(3);

        $rows = [];

        foreach (['echu' => $overdue, 'bientot' => $soon, 'actif' => $active] as $key => $lastLogin) {
            $client = $this->makeUser("client.{$key}", "[TEST] Client {$key}", 'client', $lastLogin);
            $rows[] = ['Compte', $client->name, $lastLogin];

            $director = $this->makeUser("directeur.{$key}", "[TEST] Directeur {$key}", 'directeur', $lastLogin);
            $hopital = Hopital::firstOrCreate(
                ['name' => self::HOPITAL_PREFIX . $key],
                ['adresse' => '1 rue du Test', 'ville' => 'Paris', 'telephone' => '0100000000']
            );
            Directeur::firstOrCreate(
                ['user_id' => $director->id],
                ['hopital_id' => $hopital->id, 'name' => $director->name]
            );
            $rows[] = ['Etablissement', $hopital->name, $lastLogin];
        }

        $this->command->info('Donnees de test d\'inactivite creees.');
        $this->command->table(
            ['Type', 'Nom', 'Derniere connexion', 'Suppression prevue le'],
            array_map(fn(array $row) => [
                $row[0],
                $row[1],
                $row[2]->format('d/m/Y'),
                $row[2]->copy()->addYears(InactivityService::RETENTION_YEARS)->format('d/m/Y'),
            ], $rows)
        );

        $this->command->info('suppresion : php artisan db:seed --class=\'Database\Seeders\Test\RemoveTestInactivitySeeder\'');
    }

    private function makeUser(string $key, string $name, string $role, Carbon $lastLogin): User
    {
        $user = User::firstOrNew(['email' => self::EMAIL_PREFIX . $key . self::EMAIL_DOMAIN]);
        $user->forceFill([
            'name' => $name,
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
            'last_login_at' => $lastLogin,
        ])->save();

        $user->syncRoles([$role]);

        return $user;
    }
}
