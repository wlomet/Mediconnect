<?php

namespace App\Http\Controllers\Directeur\Concerns;

use App\Models\Directeur;
use App\Models\MedecinProfile;
use App\Models\User;

trait MedecinsAccessibles
{
    // Tous les médecins de l'hôpital du directeur
    private function medecinProfileIdsAccessibles(User $directeur): array
    {
        $hopitalId = Directeur::where('user_id', $directeur->id)->value('hopital_id');

        if (!$hopitalId) {
            return [];
        }

        return MedecinProfile::where('hopital_id', $hopitalId)->pluck('id')->all();
    }

    // Profil du médecin (users.id) de l'hôpital, sinon 404 ou 403
    private function profilMedecinAccessible(User $directeur, int $medecinUserId): MedecinProfile
    {
        $profil = MedecinProfile::where('user_id', $medecinUserId)->first();
        abort_unless($profil, 404, 'Profil médecin non trouvé');
        abort_unless(in_array($profil->id, $this->medecinProfileIdsAccessibles($directeur)), 403, 'Accès non autorisé');

        return $profil;
    }
}
