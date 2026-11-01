<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\Consultation;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

class RendezVousNotificationService
{
    private const SUJET_CONFIRMATION = 'MediConnect : votre rendez-vous est confirmé';

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

        $this->envoyer($rendezVous, 'emails.rendez-vous-confirme', self::SUJET_CONFIRMATION, $this->donneesConfirmation($rendezVous));
    }

    // Renvoi manuel : contrairement à l'envoi automatique, l'échec est signalé à l'appelant.
    public function renvoyerConfirmation(RendezVous $rendezVous): void
    {
        if ($rendezVous->statut !== 'confirmé') {
            throw new BusinessException('Le rendez-vous doit être confirmé pour renvoyer l\'email de confirmation.', 422);
        }

        if (! $this->peutRenvoyerConfirmation($rendezVous)) {
            throw new BusinessException('Aucun compte à email vérifié ne correspond à l\'adresse du rendez-vous : envoi impossible.', 422);
        }

        try {
            $this->expedier($rendezVous, 'emails.rendez-vous-confirme', self::SUJET_CONFIRMATION, $this->donneesConfirmation($rendezVous));
        } catch (Throwable $e) {
            Log::error('Échec du renvoi de l\'email de rendez-vous : ' . $e->getMessage(), [
                'rendez_vous_id' => $rendezVous->id,
            ]);

            throw new BusinessException('L\'envoi de l\'email a échoué. Réessayez plus tard.', 502);
        }
    }

    public function peutRenvoyerConfirmation(RendezVous $rendezVous): bool
    {
        return $rendezVous->statut === 'confirmé' && $this->emailVerifie($rendezVous->email);
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
            $this->expedier($rendezVous, $vue, $sujet, $donnees);
        } catch (Throwable $e) {
            Log::error('Échec de l\'envoi de l\'email de rendez-vous : ' . $e->getMessage(), [
                'rendez_vous_id' => $rendezVous->id,
                'vue' => $vue,
            ]);
        }
    }

    private function expedier(RendezVous $rendezVous, string $vue, string $sujet, array $donnees): void
    {
        $this->mail->send(
            to: $rendezVous->email,
            subject: $sujet,
            options: [
                'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                'html' => view($vue, $donnees)->render(),
            ],
        );
    }

    private function donneesConfirmation(RendezVous $rendezVous): array
    {
        return [
            'name' => $rendezVous->name,
            'medecin' => $this->nomMedecin($rendezVous),
            'date' => $rendezVous->date_debut->format('d/m/Y'),
            'heureDebut' => $rendezVous->date_debut->format('H:i'),
            'heureFin' => $rendezVous->date_fin->format('H:i'),
        ];
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
