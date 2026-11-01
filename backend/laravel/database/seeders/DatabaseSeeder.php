<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Créer d'abord les rôles et spécialités
        $this->call([
            RoleSeeder::class,
            SpecialiteSeeder::class,
        ]);

        // Créer tous les utilisateurs avec leurs rôles
        $this->call([
            UserSeeder::class,
        ]);

        $this->command->newLine();
        $this->command->info('🎉 Base de données initialisée avec succès !');
    }
}
