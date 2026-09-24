<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Hopital;
use App\Models\Gestionnaire;
use App\Models\Secretaire;
use App\Models\MedecinProfile;

class UserCreationController extends Controller
{
    /**
     * Liste des hôpitaux (pour lier un utilisateur à un hôpital, optionnel)
     */
    public function getHopitaux()
    {
        $hopitaux = Hopital::orderBy('name')->get(['id', 'name', 'ville']);

        return response()->json([
            'hopitaux' => $hopitaux
        ]);
    }

    /**
     * Créer un Admin
     */
    public function createAdmin(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'email_verified_at' => now(),
        ]);

        $user->assignRole('admin');

        return response()->json([
            'message' => 'Admin créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * Créer un Client
     */
    public function createClient(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phone' => $validated['phone'] ?? null,
            'email_verified_at' => now(),
        ]);

        $user->assignRole('client');

        return response()->json([
            'message' => 'Client créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * Créer un Gestionnaire (optionnellement lié à un hôpital)
     */
    public function createGestionnaire(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('gestionnaire');

        Gestionnaire::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Gestionnaire créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * Créer un Secrétaire (optionnellement lié à un hôpital)
     */
    public function createSecretaire(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('secretaire');

        Secretaire::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Secrétaire créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }

    /**
     * Créer un Médecin (optionnellement lié à un hôpital)
     */
    public function createMedecin(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'specialite_id' => 'required|integer|exists:specialites,id',
            'telephone' => 'required|string',
            'adresse' => 'nullable|string',
            'ville' => 'nullable|string',
            'description' => 'nullable|string',
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('medecin');

        MedecinProfile::create([
            'user_id' => $user->id,
            'hopital_id' => $validated['hopital_id'] ?? null,
            'specialite_id' => $validated['specialite_id'],
            'telephone' => $validated['telephone'],
            'adresse' => $validated['adresse'] ?? null,
            'ville' => $validated['ville'] ?? null,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'message' => 'Médecin créé avec succès',
            'user' => $user->load('roles'),
        ], 201);
    }
}
