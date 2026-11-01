<?php

namespace App\Http\Controllers\SuperAdmin\Concerns;

use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\PdfTemplate;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Propriétaire (établissement ou médecin) ciblé par une requête superadmin sur les modèles et logos PDF.
 */
trait ResolvesPdfOwner
{
    /**
     * Propriétaire d'un modèle existant (template_id) ou du couple owner_type / owner_id.
     *
     * @return array{hopital_id: ?int, medecin_profile_id: ?int}
     */
    protected function proprietaireCible(Request $request): array
    {
        if ($request->filled('template_id')) {
            $modele = PdfTemplate::findOrFail((int) $request->input('template_id'));

            return [
                'hopital_id' => $modele->hopital_id,
                'medecin_profile_id' => $modele->medecin_profile_id,
            ];
        }

        return $this->proprietaireDepuisType($request);
    }

    /**
     * @return array{hopital_id: ?int, medecin_profile_id: ?int}
     */
    protected function proprietaireDepuisType(Request $request): array
    {
        $data = $request->validate([
            'owner_type' => 'required|in:hopital,medecin',
            'owner_id' => 'required|integer',
        ]);

        $existe = $data['owner_type'] === 'hopital'
            ? Hopital::whereKey($data['owner_id'])->exists()
            : MedecinProfile::whereKey($data['owner_id'])->exists();

        if (!$existe) {
            throw ValidationException::withMessages(['owner_id' => 'Propriétaire introuvable.']);
        }

        return $data['owner_type'] === 'hopital'
            ? ['hopital_id' => (int) $data['owner_id'], 'medecin_profile_id' => null]
            : ['hopital_id' => null, 'medecin_profile_id' => (int) $data['owner_id']];
    }
}
