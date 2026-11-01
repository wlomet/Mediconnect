<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

class RendezVousNotificationService
{
    public function __construct(private MailService $mail)
    {
    }

    // Email envoyé seulement si l'adresse du rendez-vous appartient à un compte à email vérifié.
    public function rendezVousConfirme(RendezVous $rendezVous, string $statutAvant): void
    {
        if ($statutAvant !== 'en_attente' || $rendezVous->statut !== 'confirmé') {
            return;
        }

        if (! $this->emailVerifie($rendezVous->email)) {
            return;
        }

        $this->envoyer($rendezVous, 'emails.rendez-vous-confirme', 'MediConnect : votre rendez-vous est confirmé', [
            'name' => $rendezVous->name,
            'medecin' => $this->nomMedecin($rendezVous),
            'date' => $rendezVous->date_debut->format('d/m/Y'),
            'heureDebut' => $rendezVous->date_debut->format('H:i'),
            'heureFin' => $rendezVous->date_fin->format('H:i'),
        ]);
    }

    public function consultationTerminee(Consultation $consultation): void
    {
        $rendezVous = $consultation->rendezVous;

        if (! $rendezVous->email) {
            return;
        }

        $this->envoyer($rendezVous, 'emails.consultation-terminee', 'MediConnect : votre consultation est terminée', [
            'name' => $rendezVous->name,
            'medecin' => $this->nomMedecin($rendezVous),
            'date' => $rendezVous->date_debut->format('d/m/Y à H:i'),
            'acces' => $this->emailVerifie($rendezVous->email),
            'url' => rtrim(config('app.frontend_url'), '/') . '/login',
        ]);
    }

    private function envoyer(RendezVous $rendezVous, string $vue, string $sujet, array $donnees): void
    {
        try {
            $this->mail->send(
                to: $rendezVous->email,
                subject: $sujet,
                options: [
                    'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                    'html' => view($vue, $donnees)->render(),
                ],
            );
        } catch (Throwable $e) {
            Log::error('Échec de l\'envoi de l\'email de rendez-vous : ' . $e->getMessage(), [
                'rendez_vous_id' => $rendezVous->id,
                'vue' => $vue,
            ]);
        }
    }

    private function emailVerifie(?string $email): bool
    {
        return $email !== null && User::where('email', $email)->whereNotNull('email_verified_at')->exists();
    }

    private function nomMedecin(RendezVous $rendezVous): string
    {
        return $rendezVous->medecin?->user?->name ?? 'votre médecin';
    }
}
