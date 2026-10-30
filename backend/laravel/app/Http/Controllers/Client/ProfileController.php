<?php

namespace App\Http\Controllers\Client;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Récupérer le profil du client
     */
    public function show(Request $request)
    {
        $client = $request->user();

        return response()->json([
            'user' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'client_id' => $client->client_id,
                'address' => $client->address,
                'roles' => $client->getRoleNames()
            ]
        ]);
    }

    /**
     * Mettre à jour le profil du client
     */
    public function update(Request $request)
    {
        $client = $request->user();

        // Déterminer si c'est une mise à jour de mot de passe
        $isPasswordChange = $request->has('password') && $request->has('current_password');

        // Règles de validation
        $rules = [
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $client->id,
            'phone' => ['sometimes', 'nullable', 'string', 'max:15', new PhoneNumber],
            'address' => 'sometimes|string|max:255'
        ];

        // Ajouter les règles de validation du mot de passe si changement
        if ($isPasswordChange) {
            $rules['current_password'] = 'required|string';
            $rules['password'] = 'required|string|min:6|confirmed';
        }

        $validated = $request->validate($rules, [
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'email.email' => 'L\'adresse email n\'est pas valide',
            'email.unique' => 'Il existe déjà un compte avec cette adresse email',
            'phone.max' => 'Le téléphone ne peut pas dépasser 15 caractères',
            'current_password.required' => 'Le mot de passe actuel est requis',
            'password.required' => 'Le nouveau mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères',
            'password.confirmed' => 'Les mots de passe ne correspondent pas'
        ]);

        // Vérifier le mot de passe actuel si changement
        if ($isPasswordChange) {
            if (!Hash::check($validated['current_password'], $client->password)) {
                return response()->json([
                    'message' => 'Erreur de validation',
                    'errors' => [
                        'current_password' => ['Le mot de passe actuel est incorrect']
                    ]
                ], 422);
            }

            // Mettre à jour le mot de passe
            $validated['password'] = Hash::make($validated['password']);
            // Supprimer current_password et password_confirmation de validated
            unset($validated['current_password']);
            if (isset($validated['password_confirmation'])) {
                unset($validated['password_confirmation']);
            }
        }

        // Convertir les strings vides en null pour les champs optionnels
        if (isset($validated['phone']) && $validated['phone'] === '') {
            $validated['phone'] = null;
        }

        $client->update($validated);

        return response()->json([
            'message' => 'Profil mis à jour avec succès',
            'user' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'phone' => $client->phone,
                'client_id' => $client->client_id,
                'address' => $client->address
            ]
        ]);
    }
}
