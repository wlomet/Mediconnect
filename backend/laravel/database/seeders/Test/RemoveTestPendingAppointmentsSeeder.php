<?php

namespace Database\Seeders\Test;

use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Database\Seeder;

class RemoveTestPendingAppointmentsSeeder extends Seeder
{
    //php artisan db:seed --class='Database\Seeders\Test\RemoveTestPendingAppointmentsSeeder'
    public function run(): void
    {
        $deleted = RendezVous::where('notes', TestPendingAppointmentsSeeder::MARKER)->delete();

        $user = User::where('email', TestPendingAppointmentsSeeder::DOCTOR_EMAIL)->first();
        if ($user) {
            $user->syncRoles([]);
            $user->delete();
        }

        $this->command->info("Rendez-vous de test supprimes : {$deleted}");
        $this->command->info($user ? 'Medecin de test supprime.' : 'Aucun medecin de test a supprimer.');
    }
}
