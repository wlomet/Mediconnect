<?php

namespace App\Http\Controllers\Medecin;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use App\Models\MedecinProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\MedecinPlanningController;

class ProfileController extends Controller
{
    /**
     * Construit l'URL publique d'une photo de profil.
     */
    private function photoUrl(?string $filename, Request $request): ?string
    {
        if (!$filename) return null;
        return $request->getSchemeAndHttpHost() . '/api/photo-profile/' . $filename;
    }

    /**
     * Récupérer le profil du médecin
     */
    public function show(Request $request)
    {
        $user = Auth::user();

        $profile = $user->medecinProfile;

        if (!$profile) {
            // Si le profil n'existe pas encore, on en créé un vide
            $profile = MedecinProfile::create([
                'user_id' => $user->id,
            ]);
        }

        // Charger la relation spécialité pour inclure les données dans la réponse
        $profile->load('specialite');

        $data = $profile->only([
            'id',
            'user_id',
            'hopital_id',
            'specialite_id',
            'description',
            'adresse',
            'ville',
            'telephone',
            'created_at',
            'updated_at',
            'specialite_nom',
            'specialite_slug',
        ]);
        $data['photo_url'] = $this->photoUrl($profile->photo_profil, $request);

        return response()->json($data);
    }

    /**
     * Mettre à jour le profil du médecin
     */
    public function update(Request $request)
    {
        $user = Auth::user();

        $validated = $request->validate([
            'specialite_id' => 'nullable|integer|exists:specialites,id',
            'description' => 'nullable|string',
            'adresse' => 'nullable|string|max:255',
            'ville' => 'nullable|string|max:255',
            'telephone' => ['nullable', 'string', 'max:20', new PhoneNumber],
        ]);

        $profile = $user->medecinProfile;

        if (!$profile) {
            $profile = MedecinProfile::create([
                'user_id' => $user->id,
            ]);
        }

        $profile->update($validated);

        // Force refresh and reload relations
        $profile->refresh();
        $profile->load('specialite');



        $profileData = $profile->only([
            'id',
            'user_id',
            'hopital_id',
            'specialite_id',
            'description',
            'adresse',
            'ville',
            'telephone',
            'created_at',
            'updated_at',
            'specialite_nom',
            'specialite_slug',
        ]);
        $profileData['photo_url'] = $this->photoUrl($profile->photo_profil, $request);

        return response()->json([
            'message' => 'Profil mis à jour avec succès',
            'profile' => $profileData,
        ], 200);
    }

    /**
     * Mettre à jour la photo de profil du médecin
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|file|image|max:5120|mimes:png,jpg,jpeg,gif,webp',
        ]);

        $user = Auth::user();

        $profile = $user->medecinProfile;
        if (!$profile) {
            $profile = MedecinProfile::create(['user_id' => $user->id]);
        }

        // Dossier de destination dans storage/photo-profile/
        // Supprimer l'ancienne photo si elle existe
        if ($profile->photo_profil && Storage::disk('photo_profile')->exists($profile->photo_profil)) {
            Storage::disk('photo_profile')->delete($profile->photo_profil);
        }

        // Nom de fichier unique
        $filename = uniqid('pp_', true) . '.png';
        Storage::disk('photo_profile')->put($filename, file_get_contents($request->file('photo')));

        $profile->update(['photo_profil' => $filename]);

        return response()->json([
            'message'   => 'Photo de profil mise à jour',
            'photo_url' => $this->photoUrl($filename, $request),
        ]);
    }
}
