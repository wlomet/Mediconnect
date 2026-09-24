<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Hopital;
use App\Models\Directeur;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class SuperAdminController extends Controller
{
    /**
     * Dashboard du super admin
     */
    public function dashboard()
    {
        $roles = Role::all();
        $usersByRole = [];

        foreach ($roles as $role) {
            $usersByRole[] = [
                'id' => $role->id,
                'name' => $role->name,
                'users_count' => User::role($role->name)->count()
            ];
        }

        $stats = [
            'total_users' => User::count(),
            'total_roles' => Role::count(),
            'users_by_role' => $usersByRole,
        ];

        return response()->json([
            'message' => 'Bienvenue Super Admin',
            'user' => auth()->user(),
            'stats' => $stats
        ]);
    }

    /**
     * Gérer tous les utilisateurs
     */
    public function getAllUsers()
    {
        $users = User::with('roles')->get();

        return response()->json([
            'users' => $users
        ]);
    }

    /**
     * Assigner un rôle à un utilisateur
     */
    public function assignRole(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => 'required|exists:roles,name'
        ]);

        $user = User::findOrFail($request->user_id);

        if ($user->hasRole('super-admin') && $request->role !== 'super-admin') {
            return response()->json([
                'message' => 'Impossible de modifier le rôle d\'un compte Super Admin',
            ], 422);
        }

        $user->syncRoles([$request->role]);

        return response()->json([
            'message' => "Rôle {$request->role} assigné avec succès",
            'user' => $user->load('roles')
        ]);
    }

    /**
     * Créer un nouveau rôle
     */
    public function createRole(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name'
        ]);

        $role = Role::create(['name' => $request->name]);

        return response()->json([
            'message' => 'Rôle créé avec succès',
            'role' => $role
        ], 201);
    }

    /**
     * Obtenir tous les rôles
     */
    public function getAllRoles()
    {
        $roles = Role::all()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'guard_name' => $role->guard_name,
                'users_count' => User::role($role->name)->count(),
                'created_at' => $role->created_at,
                'updated_at' => $role->updated_at,
            ];
        });

        return response()->json([
            'roles' => $roles
        ]);
    }

    /**
     * Changer le mot de passe d'un utilisateur
     */
    public function changeUserPassword(Request $request, $userId)
    {
        $request->validate([
            'password' => 'required|string|min:6'
        ]);

        $user = User::findOrFail($userId);
        $user->update(['password' => Hash::make($request->password)]);

        return response()->json([
            'message' => 'Mot de passe changé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }

    /**
     * Créer un directeur avec son hôpital
     */
    public function createDirector(Request $request)
    {
        $request->validate([
            // Infos User
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'phone' => 'required|string',
            // Infos Hopital
            'hopital_name' => 'required|string|max:255',
            'hopital_adresse' => 'required|string',
            'hopital_telephone' => 'required|string',
            'hopital_ville' => 'required|string|max:255',
            'hopital_email' => 'nullable|email',
            'hopital_description' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Créer l'hôpital
            $hopital = Hopital::create([
                'name' => $request->hopital_name,
                'adresse' => $request->hopital_adresse,
                'telephone' => $request->hopital_telephone,
                'ville' => $request->hopital_ville,
                'email' => $request->hopital_email,
                'description' => $request->hopital_description,
            ]);

            // Créer l'utilisateur
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'phone' => $request->phone,
                'email_verified_at' => now(),
            ]);

            // Assigner le rôle directeur
            $user->assignRole('directeur');

            // Créer le profil directeur
            Directeur::create([
                'user_id' => $user->id,
                'hopital_id' => $hopital->id,
                'name' => $request->name,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Directeur et hôpital créés avec succès',
                'user' => $user->load('roles'),
                'hopital' => $hopital,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error creating director: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la création du directeur',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
