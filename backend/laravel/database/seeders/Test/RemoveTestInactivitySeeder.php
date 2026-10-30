<?php

namespace Database\Seeders\Test;

use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RemoveTestInactivitySeeder extends Seeder
{
    //php artisan db:seed --class='Database\Seeders\Test\RemoveTestInactivitySeeder'
    public function run(): void
    {
        $users = User::where('email', 'like', TestInactivitySeeder::EMAIL_PREFIX . '%')->get();
        $hopitaux = Hopital::where('name', 'like', TestInactivitySeeder::HOPITAL_PREFIX . '%')->get();

        $userIds = $users->pluck('id');
        $hopitalIds = $hopitaux->pluck('id');

        DB::table('inactivity_warnings')->where('subject_type', 'user')->whereIn('subject_id', $userIds)->delete();
        DB::table('inactivity_warnings')->where('subject_type', 'hopital')->whereIn('subject_id', $hopitalIds)->delete();

        Directeur::whereIn('user_id', $userIds)->orWhereIn('hopital_id', $hopitalIds)->delete();
        Hopital::whereIn('id', $hopitalIds)->delete();

        foreach ($users as $user) {
            $user->syncRoles([]);
            $user->delete();
        }

        $this->command->info("Comptes de test supprimes : {$users->count()}");
        $this->command->info("Etablissements de test supprimes : {$hopitaux->count()}");
    }
}
