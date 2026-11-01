<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\RendezVous;

class RendezVousStatutGuard
{
    // Ne contrôle que les changements de statut réels ; un statut inchangé est accepté.
    public static function verifier(RendezVous $rendezVous, ?string $nouveauStatut): void
    {
        if ($nouveauStatut === null || $nouveauStatut === $rendezVous->statut) {
            return;
        }

        if ($nouveauStatut === 'terminé') {
            throw new BusinessException('Le statut terminé est réservé à la fin de consultation.', 422);
        }

        if ($rendezVous->statut === 'terminé') {
            throw new BusinessException('Un rendez-vous terminé ne peut plus changer de statut.', 422);
        }

        if ($nouveauStatut === 'annulé' && $rendezVous->consultation?->statut === 'en_cours') {
            throw new BusinessException("Impossible d'annuler ce rendez-vous : une consultation est en cours.", 409);
        }
    }
}
