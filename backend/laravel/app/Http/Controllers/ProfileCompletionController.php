<?php

namespace App\Http\Controllers;

use App\Models\Directeur;
use App\Models\Gestionnaire;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\Specialite;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileCompletionController extends Controller
{
    /**
     * Etat de la complétion de profil + données utiles pour construire le formulaire.
     */
    public function status(Request $request)
    {
        $user = $request->user();
        $role = $user->getMainRoleAttribute();
        $isProfileRole = in_array($role, User::PROFILE_REQUIRED_ROLES, true);

        return response()->json([
            'role' => $role,
            'profileComplete' => $user->hasRequiredProfileRow(),
            'hopitals' => $isProfileRole ? Hopital::orderBy('name')->get(['id', 'name', 'ville']) : [],
            'specialites' => $role === 'medecin' ? Specialite::orderBy('nom')->get(['id', 'nom']) : [],
        ]);
    }

    /**
     * Crée la ligne de profil manquante correspondant au rôle principal de l'utilisateur.
     */
    public function store(Request $request)
    {
        $user = $request->user();
        $role = $user->getMainRoleAttribute();

        if (!in_array($role, User::PROFILE_REQUIRED_ROLES, true)) {
            return response()->json([
                'message' => "Aucun profil supplémentaire n'est requis pour votre rôle",
            ], 422);
        }

        if ($user->hasRequiredProfileRow()) {
            return response()->json([
                'message' => 'Votre profil est déjà complet',
            ], 422);
        }

        return match ($role) {
            'medecin' => $this->storeMedecin($request, $user),
            'secretaire' => $this->storeSecretaire($request, $user),
            'gestionnaire' => $this->storeGestionnaire($request, $user),
            'directeur' => $this->storeDirecteur($request, $user),
        };
    }

    private function storeMedecin(Request $request, $user)
    {
        $validated = $request->validate([
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
            'specialite_id' => 'required|integer|exists:specialites,id',
            'telephone' => 'required|string|max:20',
            'adresse' => 'nullable|string|max:255',
            'ville' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        $profile = MedecinProfile::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'specialite_id' => $validated['specialite_id'],
            'telephone' => $validated['telephone'],
            'adresse' => $validated['adresse'] ?? null,
            'ville' => $validated['ville'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Profil médecin complété avec succès',
            'profile' => $profile,
        ], 201);
    }

    private function storeSecretaire(Request $request, $user)
    {
        $validated = $request->validate([
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
            'name' => 'required|string|max:255',
        ]);

        $secretaire = Secretaire::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Profil secrétaire complété avec succès',
            'profile' => $secretaire,
        ], 201);
    }

    private function storeGestionnaire(Request $request, $user)
    {
        $validated = $request->validate([
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
            'name' => 'required|string|max:255',
        ]);

        $gestionnaire = Gestionnaire::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Profil gestionnaire complété avec succès',
            'profile' => $gestionnaire,
        ], 201);
    }

    private function storeDirecteur(Request $request, $user)
    {
        $validated = $request->validate([
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
            'name' => 'required|string|max:255',
            'hopital_name' => 'required_without:hopital_id|nullable|string|max:255',
            'hopital_adresse' => 'required_without:hopital_id|nullable|string|max:255',
            'hopital_telephone' => 'required_without:hopital_id|nullable|string|max:20',
            'hopital_ville' => 'required_without:hopital_id|nullable|string|max:255',
        ]);

        $directeur = DB::transaction(function () use ($validated, $user) {
            $hopitalId = $validated['hopital_id'] ?? null;

            if (!$hopitalId) {
                $hopital = Hopital::create([
                    'name' => $validated['hopital_name'],
                    'adresse' => $validated['hopital_adresse'],
                    'telephone' => $validated['hopital_telephone'],
                    'ville' => $validated['hopital_ville'],
                ]);
                $hopitalId = $hopital->id;
            }

            return Directeur::create([
                'user_id' => $user->id,
                'hopital_id' => $hopitalId,
                'name' => $validated['name'],
            ]);
        });

        return response()->json([
            'message' => 'Profil directeur complété avec succès',
            'profile' => $directeur,
        ], 201);
    }
}
