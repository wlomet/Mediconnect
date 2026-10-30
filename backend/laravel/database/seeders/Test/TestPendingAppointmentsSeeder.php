<?php

namespace Database\Seeders\Test;

use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\Specialite;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestPendingAppointmentsSeeder extends Seeder
{
    //php artisan db:seed --class='Database\Seeders\Test\TestPendingAppointmentsSeeder'
    public const MARKER = '[TEST_PENDING]';

    public const DOCTOR_EMAIL = 'test.attente.medecin@mediconnect.com';

    public function run(): void
    {
        $specialite = Specialite::first();
        if (! $specialite) {
            $this->command->error('Aucune specialite en base : lancer SpecialiteSeeder avant.');

            return;
        }

        RendezVous::where('notes', self::MARKER)->delete();

        $user = User::firstOrCreate(
            ['email' => self::DOCTOR_EMAIL],
            [
                'name' => '[TEST] Dr Attente',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        if (! $user->hasRole('medecin')) {
            $user->assignRole('medecin');
        }

        $profile = MedecinProfile::firstOrCreate(
            ['user_id' => $user->id],
            [
                'specialite_id' => $specialite->id,
                'ville' => 'Paris',
                'telephone' => '0600000000',
            ]
        );

        $appointments = [
            // Doit etre notifie : en attente, dans plus de deux semaines
            ['date' => now()->addWeeks(3)->setTime(10, 0), 'statut' => 'en_attente', 'name' => 'Patient Test 1', 'motif' => 'Consultation de suivi'],
            ['date' => now()->addWeeks(5)->setTime(14, 30), 'statut' => 'en_attente', 'name' => 'Patient Test 2', 'motif' => 'Bilan annuel'],
            ['date' => now()->addMonths(2)->setTime(9, 0), 'statut' => 'en_attente', 'name' => 'Patient Test 3', 'motif' => 'Premiere consultation'],
            // Ne doit pas etre notifie : deja confirme
            ['date' => now()->addWeeks(4)->setTime(11, 0), 'statut' => 'confirmé', 'name' => 'Patient Test 4', 'motif' => 'Deja confirme'],
            // Ne doit pas etre notifie : dans moins de deux semaines
            ['date' => now()->addDays(5)->setTime(11, 0), 'statut' => 'en_attente', 'name' => 'Patient Test 5', 'motif' => 'Bientot'],
        ];

        foreach ($appointments as $item) {
            RendezVous::create([
                'medecin_id' => $profile->id,
                'date_debut' => $item['date'],
                'date_fin' => $item['date']->copy()->addMinutes(30),
                'statut' => $item['statut'],
                'motif' => $item['motif'],
                'name' => $item['name'],
                'notes' => self::MARKER,
            ]);
        }

        $this->command->info('Medecin de test : ' . self::DOCTOR_EMAIL . ' (mot de passe : password)');
        $this->command->table(
            ['Date', 'Statut', 'Patient', 'Motif'],
            array_map(fn(array $item) => [
                $item['date']->format('d/m/Y H:i'),
                $item['statut'],
                $item['name'],
                $item['motif'],
            ], $appointments)
        );
        $this->command->info('Seuls les 3 premiers rendez-vous doivent generer une notification.');
    }
}
