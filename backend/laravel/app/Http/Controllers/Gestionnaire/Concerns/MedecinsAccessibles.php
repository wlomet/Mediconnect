<?php

namespace App\Http\Controllers\Gestionnaire\Concerns;

use App\Models\Gestionnaire;
use App\Models\GestionnaireMedecin;
use App\Models\MedecinProfile;
use App\Models\User;

trait MedecinsAccessibles
{
    // Même règle que canAccessMedecin : hôpital du gestionnaire, sinon liaisons acceptées
    private function medecinProfileIdsAccessibles(User $gestionnaire): array
    {
        $profil = Gestionnaire::where('user_id', $gestionnaire->id)->first();

        if (!$profil) {
            return [];
        }

        if ($profil->hopital_id) {
            return MedecinProfile::where('hopital_id', $profil->hopital_id)->pluck('id')->all();
        }

        $medecinUserIds = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
            ->where('statut', 'accepte')
            ->pluck('medecin_id');

        return MedecinProfile::whereIn('user_id', $medecinUserIds)->pluck('id')->all();
    }

    // Profil du médecin (users.id) accessible, sinon 404 ou 403
    private function profilMedecinAccessible(User $gestionnaire, int $medecinUserId): MedecinProfile
    {
        $profil = MedecinProfile::where('user_id', $medecinUserId)->first();
        abort_unless($profil, 404, 'Profil médecin non trouvé');
        abort_unless(in_array($profil->id, $this->medecinProfileIdsAccessibles($gestionnaire)), 403, 'Accès non autorisé');

        return $profil;
    }
}
