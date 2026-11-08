<?php

namespace App\Services;

use App\Models\User;

class ConnexionService
{
    /**
     * Motif de refus de connexion, ou null si le compte peut se connecter.
     *
     * @return array{message: string, extra: array<string, mixed>}|null
     */
    public function motifRefus(User $user): ?array
    {
        if (!$user->hasVerifiedEmail() && !$user->isEmailExempt()) {
            return [
                'message' => 'Votre adresse email n\'est pas encore vérifiée. Activez votre compte depuis le lien reçu par email.',
                'extra' => ['isEmailUnverified' => true, 'email' => $user->email],
            ];
        }

        if ((int) $user->isVerified === -1) {
            return [
                'message' => 'Votre demande d\'inscription a été refusée. Veuillez contacter le support pour plus d\'informations.',
                'extra' => ['isRejected' => true],
            ];
        }

        // Avant is_active : un médecin en attente a is_active = 0
        if ((int) $user->isVerified !== 1) {
            return [
                'message' => 'Votre compte est en attente de vérification par un administrateur',
                'extra' => ['isPending' => true],
            ];
        }

        // Compte désactivé par un administrateur : message explicite, distinct du cas "en attente"
        if (!$user->is_active) {
            return [
                'message' => 'Votre compte a été désactivé par un administrateur. Veuillez contacter le support pour plus d\'informations.',
                'extra' => ['isDisabled' => true],
            ];
        }

        return null;
    }
}
