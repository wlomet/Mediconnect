<?php

namespace App\Http\Controllers\Secretaire\Concerns;

use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\SecretaireMedecin;
use App\Models\User;

trait MedecinsAccessibles
{
    // Même règle que canAccessMedecin : hôpital de la secrétaire, sinon liaisons acceptées
    private function medecinProfileIdsAccessibles(User $secretaire): array
    {
        $profil = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$profil) {
            return [];
        }

        if ($profil->hopital_id) {
            return MedecinProfile::where('hopital_id', $profil->hopital_id)->pluck('id')->all();
        }

        $medecinUserIds = SecretaireMedecin::where('secretaire_id', $secretaire->id)
            ->where('statut', 'accepte')
            ->pluck('medecin_id');

        return MedecinProfile::whereIn('user_id', $medecinUserIds)->pluck('id')->all();
    }

    // Profil du médecin (users.id) accessible, sinon 404 ou 403
    private function profilMedecinAccessible(User $secretaire, int $medecinUserId): MedecinProfile
    {
        $profil = MedecinProfile::where('user_id', $medecinUserId)->first();
        abort_unless($profil, 404, 'Profil médecin non trouvé');
        abort_unless(in_array($profil->id, $this->medecinProfileIdsAccessibles($secretaire)), 403, 'Accès non autorisé');

        return $profil;
    }
}
