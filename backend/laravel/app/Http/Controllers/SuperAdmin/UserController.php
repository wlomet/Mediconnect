<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Directeur;
use App\Models\Gestionnaire;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Secretaire;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /**
     * SuperAdmin récupère tous les utilisateurs
     */
    public function getAll(Request $request)
    {
        $users = User::with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'is_active' => $user->is_active,
                    'created_at' => $user->created_at,
                    'roles' => $user->roles->map(fn ($role) => [
                        'id' => $role->id,
                        'name' => $role->name,
                    ]),
                ];
            });

        return response()->json([
            'users' => $users,
            'total' => count($users)
        ]);
    }

    /**
     * SuperAdmin récupère un utilisateur spécifique
     */
    public function show($id)
    {
        $user = User::with('roles')->findOrFail($id);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone ?? null,
                'address' => $user->address ?? null,
                'is_active' => $user->is_active,
                'created_at' => $user->created_at,
                'roles' => $user->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                ]),
            ]
        ]);
    }

    /**
     * SuperAdmin met à jour les informations d'un utilisateur
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|unique:users,email,' . $id,
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
        ]);

        $user->update($request->only(['name', 'email', 'phone', 'address']));

        return response()->json([
            'message' => 'Utilisateur mis à jour avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'address' => $user->address,
                'roles' => $user->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                ]),
            ]
        ]);
    }

    /**
     * SuperAdmin active ou désactive un compte utilisateur
     */
    public function toggleActive(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean',
        ]);

        if ((int) $id === (int) $request->user()->id) {
            return response()->json([
                'message' => 'Vous ne pouvez pas désactiver votre propre compte',
            ], 422);
        }

        $user = User::findOrFail($id);
        $user->update(['is_active' => $request->boolean('is_active')]);

        return response()->json([
            'message' => $user->is_active
                ? 'Compte activé avec succès'
                : 'Compte désactivé avec succès',
            'user' => [
                'id' => $user->id,
                'is_active' => $user->is_active,
            ]
        ]);
    }

    /**
     * SuperAdmin assigne un rôle à un utilisateur
     */
    public function assignRole(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|exists:roles,name'
        ]);

        $user = User::findOrFail($request->user_id);

        // Un compte super-admin ne peut jamais se voir changer/retirer son rôle,
        // que ce soit par lui-même ou par un autre super-admin.
        if ($user->hasRole('super-admin') && $request->role !== 'super-admin') {
            return response()->json([
                'message' => 'Impossible de modifier le rôle d\'un compte Super Admin',
            ], 422);
        }

        $role = $request->role;

        // Le rôle exige une ligne de profil dédiée : le super admin doit la renseigner
        // maintenant, sinon l'assignation du rôle est bloquée (plus de complétion différée à la connexion).
        $profileData = null;
        if (in_array($role, User::PROFILE_REQUIRED_ROLES, true) && !$this->userHasProfileFor($user, $role)) {
            $profileData = $this->validateProfilePayload($request, $role);
        }

        DB::transaction(function () use ($user, $role, $profileData) {
            // Un rôle assigné remplace les précédents pour éviter les conflits de connexion
            // (un utilisateur ne doit avoir qu'un seul rôle actif à la fois).
            $user->syncRoles([$role]);

            if ($profileData !== null) {
                $this->createProfileRow($user, $role, $profileData);
            }
        });

        $user->refresh();

        return response()->json([
            'message' => 'Rôle assigné avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                ]),
            ]
        ]);
    }

    /**
     * SuperAdmin retire un rôle d'un utilisateur
     */
    public function removeRole(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|exists:roles,name'
        ]);

        $user = User::findOrFail($request->user_id);

        if ($user->hasRole('super-admin')) {
            return response()->json([
                'message' => 'Impossible de retirer un rôle à un compte Super Admin',
            ], 422);
        }

        $user->removeRole($request->role);
        $user->refresh();

        return response()->json([
            'message' => 'Rôle retiré avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->map(fn ($role) => [
                    'id' => $role->id,
                    'name' => $role->name,
                ]),
            ]
        ]);
    }

    /**
     * Vérifie si l'utilisateur possède déjà la ligne de profil correspondant à ce rôle.
     */
    private function userHasProfileFor(User $user, string $role): bool
    {
        return match ($role) {
            'medecin' => $user->medecinProfile()->exists(),
            'secretaire' => $user->secretaire()->exists(),
            'gestionnaire' => $user->gestionnaire()->exists(),
            'directeur' => $user->directeur()->exists(),
            default => true,
        };
    }

    /**
     * Valide les informations de profil requises pour le rôle ciblé.
     * L'assignation échoue (422) si ces informations ne sont pas fournies.
     */
    private function validateProfilePayload(Request $request, string $role): array
    {
        return match ($role) {
            'medecin' => $request->validate([
                'hopital_id' => 'nullable|integer|exists:hopitals,id',
                'specialite_id' => 'required|integer|exists:specialites,id',
                'telephone' => 'required|string|max:20',
                'adresse' => 'nullable|string|max:255',
                'ville' => 'nullable|string|max:255',
                'description' => 'nullable|string',
            ], [
                'specialite_id.required' => 'La spécialité est requise pour assigner le rôle médecin',
                'telephone.required' => 'Le téléphone est requis pour assigner le rôle médecin',
            ]),
            'secretaire', 'gestionnaire' => $request->validate([
                'hopital_id' => 'nullable|integer|exists:hopitals,id',
                'name' => 'required|string|max:255',
            ], [
                'name.required' => 'Le nom du profil est requis pour assigner ce rôle',
            ]),
            'directeur' => $request->validate([
                'hopital_id' => 'nullable|integer|exists:hopitals,id',
                'name' => 'required|string|max:255',
                'hopital_name' => 'required_without:hopital_id|nullable|string|max:255',
                'hopital_adresse' => 'required_without:hopital_id|nullable|string|max:255',
                'hopital_telephone' => 'required_without:hopital_id|nullable|string|max:20',
                'hopital_ville' => 'required_without:hopital_id|nullable|string|max:255',
            ], [
                'name.required' => 'Le nom du profil est requis pour assigner le rôle directeur',
                'hopital_name.required_without' => 'Veuillez sélectionner un hôpital existant ou renseigner un nouvel hôpital',
                'hopital_adresse.required_without' => 'Veuillez sélectionner un hôpital existant ou renseigner un nouvel hôpital',
                'hopital_telephone.required_without' => 'Veuillez sélectionner un hôpital existant ou renseigner un nouvel hôpital',
                'hopital_ville.required_without' => 'Veuillez sélectionner un hôpital existant ou renseigner un nouvel hôpital',
            ]),
            default => [],
        };
    }

    /**
     * Crée la ligne de profil correspondant au rôle assigné.
     */
    private function createProfileRow(User $user, string $role, array $data): void
    {
        match ($role) {
            'medecin' => MedecinProfile::create([
                'user_id' => $user->id,
                'hopital_id' => $data['hopital_id'] ?? null,
                'specialite_id' => $data['specialite_id'],
                'telephone' => $data['telephone'],
                'adresse' => $data['adresse'] ?? null,
                'ville' => $data['ville'] ?? null,
                'description' => $data['description'] ?? null,
            ]),
            'secretaire' => Secretaire::create([
                'user_id' => $user->id,
                'hopital_id' => $data['hopital_id'] ?? null,
                'name' => $data['name'],
            ]),
            'gestionnaire' => Gestionnaire::create([
                'user_id' => $user->id,
                'hopital_id' => $data['hopital_id'] ?? null,
                'name' => $data['name'],
            ]),
            'directeur' => $this->createDirecteurProfile($user, $data),
            default => null,
        };
    }

    private function createDirecteurProfile(User $user, array $data): void
    {
        $hopitalId = $data['hopital_id'] ?? null;

        if (!$hopitalId) {
            $hopital = Hopital::create([
                'name' => $data['hopital_name'],
                'adresse' => $data['hopital_adresse'],
                'telephone' => $data['hopital_telephone'],
                'ville' => $data['hopital_ville'],
            ]);
            $hopitalId = $hopital->id;
        }

        Directeur::create([
            'user_id' => $user->id,
            'hopital_id' => $hopitalId,
            'name' => $data['name'],
        ]);
    }
}
