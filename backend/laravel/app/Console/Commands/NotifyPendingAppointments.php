<?php

namespace App\Console\Commands;

use App\Models\RendezVous;
use App\Services\MailService;
use Illuminate\Console\Command;
use Throwable;

class NotifyPendingAppointments extends Command
{
    protected $signature = 'appointments:notify-pending';

    protected $description = 'Notifie les medecins des rendez-vous encore en attente de validation prevus dans plus de deux semaines';

    public function handle(MailService $mail): int
    {
        $limit = now()->addWeeks(2);

        $appointmentsByDoctor = RendezVous::with(['medecin.user', 'client'])
            ->where('statut', 'en_attente')
            ->where('date_debut', '>', $limit)
            ->orderBy('date_debut')
            ->get()
            ->groupBy('medecin_id');

        if ($appointmentsByDoctor->isEmpty()) {
            $this->info('Aucun rendez-vous en attente a notifier.');

            return self::SUCCESS;
        }

        $sent = 0;

        foreach ($appointmentsByDoctor as $doctorAppointments) {
            $doctor = $doctorAppointments->first()->medecin?->user;

            if (! $doctor?->email) {
                $this->warn('Medecin sans email pour le rendez-vous #' . $doctorAppointments->first()->id . ', notification ignoree.');

                continue;
            }

            $html = view('emails.appointment-pending', [
                'doctorName' => $doctor->name,
                'appointments' => $doctorAppointments,
            ])->render();

            try {
                $mail->send(
                    to: ['email' => $doctor->email, 'name' => $doctor->name],
                    subject: 'Rendez-vous en attente de validation',
                    options: [
                        'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                        'html' => $html,
                    ],
                );
                $sent++;
            } catch (Throwable $e) {
                $this->error('Echec pour ' . $doctor->email . ' : ' . $e->getMessage());
            }
        }

        $this->info("Notifications envoyees : {$sent}");

        return self::SUCCESS;
    }
}
