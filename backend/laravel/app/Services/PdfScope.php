<?php

namespace App\Services;

use App\Models\MedecinProfile;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Règles d'accès aux modèles PDF et logos.
 * - Médecin : modifie ses propres éléments ; voit aussi ceux de son établissement (lecture seule).
 * - Directeur : modifie les éléments de son établissement.
 * - Logos : la bibliothèque de l'établissement est partagée par ses médecins et son directeur.
 */
class PdfScope
{
    public static function applyWritable(Builder $query, User $user): Builder
    {
        if ($profile = $user->medecinProfile) {
            return $query->where('medecin_profile_id', $profile->id);
        }

        if ($hopitalId = $user->directeur?->hopital_id) {
            return $query->where('hopital_id', $hopitalId);
        }

        return $query->whereRaw('1 = 0');
    }

    /**
     * Logos visibles et modifiables : ceux de l'établissement, plus les logos personnels.
     */
    public static function applyImageLibrary(Builder $query, User $user): Builder
    {
        $profile = $user->medecinProfile;
        $hopitalId = self::etablissementId($user);

        if (!$profile && !$hopitalId) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($profile, $hopitalId) {
            if ($hopitalId) {
                $q->orWhere('hopital_id', $hopitalId);
            }
            if ($profile) {
                $q->orWhere('medecin_profile_id', $profile->id);
            }
        });
    }

    /**
     * Logos utilisables par le propriétaire d'un modèle (établissement, ou médecin avec ses logos personnels et ceux de son établissement).
     *
     * @param  array{hopital_id?: ?int, medecin_profile_id?: ?int}  $proprietaire
     */
    public static function applyLibraryOf(Builder $query, array $proprietaire): Builder
    {
        $medecinId = $proprietaire['medecin_profile_id'] ?? null;
        $hopitalId = $proprietaire['hopital_id'] ?? null;

        if ($medecinId) {
            $hopitalId ??= MedecinProfile::whereKey($medecinId)->value('hopital_id');
        }

        if (!$medecinId && !$hopitalId) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($medecinId, $hopitalId) {
            if ($hopitalId) {
                $q->orWhere('hopital_id', $hopitalId);
            }
            if ($medecinId) {
                $q->orWhere('medecin_profile_id', $medecinId);
            }
        });
    }

    /**
     * Propriété d'un nouveau logo : l'établissement si rattaché, sinon le médecin.
     */
    public static function imageOwnerAttributes(User $user): ?array
    {
        if ($hopitalId = self::etablissementId($user)) {
            return ['medecin_profile_id' => null, 'hopital_id' => $hopitalId];
        }

        if ($profile = $user->medecinProfile) {
            return ['medecin_profile_id' => $profile->id, 'hopital_id' => null];
        }

        return null;
    }

    public static function applyVisible(Builder $query, User $user): Builder
    {
        $profile = $user->medecinProfile;
        $hopitalId = $profile?->hopital_id ?? $user->directeur?->hopital_id;

        if (!$profile && !$hopitalId) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where(function (Builder $q) use ($profile, $hopitalId) {
            if ($profile) {
                $q->orWhere('medecin_profile_id', $profile->id);
            }
            if ($hopitalId) {
                $q->orWhere('hopital_id', $hopitalId);
            }
        });
    }

    public static function canWrite(Model $item, User $user): bool
    {
        if ($profile = $user->medecinProfile) {
            return (int) $item->medecin_profile_id === $profile->id;
        }

        $hopitalId = $user->directeur?->hopital_id;

        return $hopitalId !== null && $item->hopital_id !== null && (int) $item->hopital_id === (int) $hopitalId;
    }

    /**
     * Attributs de propriété pour une création, ou null si l'utilisateur ne peut pas créer.
     */
    public static function ownerAttributes(User $user): ?array
    {
        if ($profile = $user->medecinProfile) {
            return ['medecin_profile_id' => $profile->id, 'hopital_id' => null];
        }

        if ($hopitalId = $user->directeur?->hopital_id) {
            return ['medecin_profile_id' => null, 'hopital_id' => $hopitalId];
        }

        return null;
    }

    /**
     * Dossier de stockage des logos selon le propriétaire.
     */
    public static function imageFolder(array $owner): string
    {
        return $owner['hopital_id']
            ? 'pdf-images/hopital-' . $owner['hopital_id']
            : 'pdf-images/' . $owner['medecin_profile_id'];
    }

    /**
     * Établissement rattaché à l'utilisateur (médecin lié ou directeur).
     */
    public static function etablissementId(User $user): ?int
    {
        return $user->medecinProfile?->hopital_id ?? $user->directeur?->hopital_id;
    }
}
