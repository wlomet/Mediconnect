<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        // Validation avec messages en français
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'phone' => 'nullable|string|max:15',
            'role' => 'required|string|in:client,medecin,admin',
        ], [
            'name.required' => 'Le nom est requis',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
            'email.unique' => 'Il existe déjà un compte avec cette adresse email',
            'password.required' => 'Le mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères',
            'phone.max' => 'Le téléphone ne peut pas dépasser 15 caractères',
            'role.required' => 'Le rôle est requis',
            'role.in' => 'Le rôle sélectionné n\'est pas valide'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->input('phone') ?: null,
            'isVerified' => $request->role === 'medecin' ? 0 : 1,
        ]);

        // Assigner le rôle avec spatie/laravel-permission
        $user->assignRole($request->role);

        Auth::login($user);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'client_id' => $user->client_id,
                'role' => $user->getMainRoleAttribute(),
                'isVerified' => $user->isVerified,
            ],
            'token' => 'session-based',
            'roles' => $user->getRoleNames()->toArray()
        ]);
    }

    public function login(Request $request)
    {
        // Validation des champs requis
        $request->validate([
            'email' => 'required|string',
            'password' => 'required|min:6',
        ], [
            'email.required' => 'L\'email ou numéro client est requis',
            'password.required' => 'Le mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères'
        ]);

        $identifier = $request->input('email');

        // Déterminer si c'est un email ou un client_id
        $isEmail = filter_var($identifier, FILTER_VALIDATE_EMAIL);

        // Chercher l'utilisateur
        if ($isEmail) {
            $user = \App\Models\User::where('email', $identifier)->first();
        } else {
            // C'est un client_id
            $user = \App\Models\User::where('client_id', strtoupper($identifier))->first();
        }

        // Vérifier le mot de passe et isVerified si l'utilisateur existe
        if ($user && Hash::check($request->input('password'), $user->password)) {
            // Compte désactivé par un administrateur : message explicite, distinct du cas "en attente"
            if (!$user->is_active) {
                return response()->json([
                    'message' => 'Votre compte a été désactivé par un administrateur. Veuillez contacter le support pour plus d\'informations.',
                    'isDisabled' => true
                ], 403);
            }

            // Vérifier que l'utilisateur est vérifié
            if (!$user->isVerified) {
                return response()->json([
                    'message' => 'Votre compte est en attente de vérification par un administrateur',
                    'isPending' => true
                ], 403);
            }

            Auth::login($user);
            $request->session()->regenerate();

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'client_id' => $user->client_id,
                    'role' => $user->getMainRoleAttribute(),
                ],
                'token' => 'session-based',
                'roles' => $user->getRoleNames()->toArray()
            ]);
        }

        // Message générique pour ne pas révéler d'informations
        return response()->json([
            'message' => 'Identifiant ou mot de passe incorrect'
        ], 401);
    }

    public function logout(Request $request)
    {
        try {
            Auth::logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json(['message' => 'Déconnexion réussie']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur lors de la déconnexion'], 500);
        }
    }

    public function user(Request $request)
    {
        try {
            if (Auth::check()) {
                $user = Auth::user();

                return response()->json([
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'phone' => $user->phone,
                        'client_id' => $user->client_id,
                        'role' => $user->getMainRoleAttribute(),
                        'isVerified' => $user->isVerified,
                    ],
                    'roles' => $user->getRoleNames()->toArray()
                ]);
            } else {
                return response()->json([
                    'user' => null,
                    'roles' => 'Non authentifié'
                ]);
            }
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erreur serveur'], 500);
        }
    }
}
