<?php

namespace App\Console\Commands;

use App\Services\InactivityService;
use App\Services\MailService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class SendInactivityWarnings extends Command
{
    protected $signature = 'inactivity:warn {--dry-run : Affiche les avertissements sans rien envoyer}';

    protected $description = 'Envoie un avertissement avant suppression des comptes et établissements inactifs';

    public function handle(InactivityService $inactivity, MailService $mail): int
    {
        $sent = 0;
        $failed = 0;

        foreach ($inactivity->atRisk() as $row) {
            $deadline = $row['deadline']->toDateString();

            $alreadyWarned = DB::table('inactivity_warnings')
                ->where('subject_type', $row['type'])
                ->where('subject_id', $row['id'])
                ->where('deadline', $deadline)
                ->exists();

            if ($alreadyWarned) {
                continue;
            }

            if (empty($row['recipients'])) {
                $this->warn("Aucun destinataire pour {$row['label']} (#{$row['id']}).");

                continue;
            }

            if ($this->option('dry-run')) {
                $this->line("[dry-run] {$row['label']} -> " . implode(', ', $row['recipients']));

                continue;
            }

            try {
                $mail->send(
                    to: $row['recipients'],
                    subject: 'MediConnect : suppression prévue de vos données',
                    options: [
                        'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                        'html' => view('emails.inactivity-warning', [
                            'type' => $row['type'],
                            'label' => $row['label'],
                            'lastActivity' => $row['last_activity']->format('d/m/Y'),
                            'deadline' => $row['deadline']->format('d/m/Y'),
                            'overdue' => $row['overdue'],
                        ])->render(),
                    ],
                );
            } catch (Throwable $e) {
                $failed++;
                $this->error("Echec pour {$row['label']} (#{$row['id']}) : " . $e->getMessage());

                continue;
            }

            DB::table('inactivity_warnings')->insert([
                'subject_type' => $row['type'],
                'subject_id' => $row['id'],
                'deadline' => $deadline,
                'sent_at' => now(),
            ]);

            $sent++;
        }

        $this->info("{$sent} avertissement(s) envoyé(s), {$failed} échec(s).");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }
}
