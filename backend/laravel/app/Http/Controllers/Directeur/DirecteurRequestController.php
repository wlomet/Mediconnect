<?php

namespace App\Http\Controllers\Directeur;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use App\Models\DemandeDirecteur;
use App\Models\User;
use App\Models\Directeur;
use App\Models\Hopital;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class DirecteurRequestController extends Controller
{
    public function store(Request $request)
    {
        // Validation avec messages en français
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:demandes_directeur,email',
            'password' => 'required|string|min:6',
            'hopital_name' => 'required|string|max:255',
            'hopital_adresse' => 'required|string|max:255',
            'hopital_telephone' => ['required', 'string', 'max:20', new PhoneNumber],
            'hopital_ville' => 'required|string|max:255',
        ], [
            'name.required' => 'Le nom est requis',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
            'email.unique' => 'Une demande avec cette adresse email existe déjà',
            'password.required' => 'Le mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères',
            'hopital_name.required' => 'Le nom de l\'hôpital est requis',
            'hopital_name.max' => 'Le nom de l\'hôpital ne peut pas dépasser 255 caractères',
            'hopital_adresse.required' => 'L\'adresse de l\'hôpital est requise',
            'hopital_adresse.max' => 'L\'adresse ne peut pas dépasser 255 caractères',
            'hopital_telephone.required' => 'Le numéro de téléphone de l\'hôpital est requis',
            'hopital_telephone.max' => 'Le numéro de téléphone ne peut pas dépasser 20 caractères',
            'hopital_ville.required' => 'La ville de l\'hôpital est requise',
            'hopital_ville.max' => 'La ville ne peut pas dépasser 255 caractères',
        ]);

        $demande = DemandeDirecteur::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'hopital_name' => $request->hopital_name,
            'hopital_adresse' => $request->hopital_adresse,
            'hopital_telephone' => $request->hopital_telephone,
            'hopital_ville' => $request->hopital_ville,
            'statut' => 'en_attente',
        ]);

        return response()->json([
            'message' => 'Votre demande a été envoyée avec succès. Vous serez notifié par email.',
            'demande' => [
                'id' => $demande->id,
                'name' => $demande->name,
                'email' => $demande->email,
                'statut' => $demande->statut,
            ]
        ], 201);
    }

    public function index()
    {
        $demandes = DemandeDirecteur::orderBy('created_at', 'desc')->get();
        return response()->json($demandes);
    }

    public function show($id)
    {
        $demande = DemandeDirecteur::findOrFail($id);
        return response()->json($demande);
    }

    public function updateStatut(Request $request, $id)
    {
        $request->validate([
            'statut' => 'required|in:en_attente,approuvee,refusee',
            'commentaire_admin' => 'nullable|string',
        ]);

        $demande = DemandeDirecteur::findOrFail($id);

        // Si la demande est approuvée, créer le user, l'hôpital et le directeur
        if ($request->statut === 'approuvee' && $demande->statut !== 'approuvee') {
            DB::beginTransaction();
            try {
                // Vérifier si un utilisateur avec cet email existe déjà
                $existingUser = User::where('email', $demande->email)->first();

                if ($existingUser) {
                    DB::rollBack();
                    return response()->json([
                        'message' => 'Un utilisateur avec cet email existe déjà'
                    ], 422);
                }

                // Créer ou récupérer l'hôpital
                $hopital = Hopital::where('name', $demande->hopital_name)
                    ->where('ville', $demande->hopital_ville)
                    ->first();

                if (!$hopital) {
                    $hopital = Hopital::create([
                        'name' => $demande->hopital_name,
                        'adresse' => $demande->hopital_adresse,
                        'telephone' => $demande->hopital_telephone,
                        'ville' => $demande->hopital_ville,
                    ]);
                }

                // Créer l'utilisateur
                $user = User::create([
                    'name' => $demande->name,
                    'email' => $demande->email,
                    'password' => $demande->password, // Déjà hashé
                ]);

                // Assigner le rôle directeur
                $user->assignRole('directeur');

                // Créer le profil directeur
                Directeur::create([
                    'user_id' => $user->id,
                    'hopital_id' => $hopital->id,
                    'name' => $demande->name,
                ]);

                // Mettre à jour la demande
                $demande->update([
                    'statut' => 'approuvee',
                    'commentaire_admin' => $request->commentaire_admin,
                ]);

                DB::commit();

                return response()->json([
                    'message' => 'La demande a été approuvée. Un nouvel utilisateur et directeur ont été créés.',
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'hopital' => $hopital->name,
                    ]
                ], 200);
            } catch (\Exception $e) {
                DB::rollBack();
                return response()->json([
                    'message' => 'Une erreur est survenue lors de l\'approbation de la demande',
                    'error' => $e->getMessage()
                ], 500);
            }
        } else {
            // Si la demande n'est pas approuvée, mettre à jour le statut et le commentaire
            $demande->update([
                'statut' => $request->statut,
                'commentaire_admin' => $request->commentaire_admin,
            ]);

            return response()->json([
                'message' => 'Le statut de la demande a été mis à jour.',
                'demande' => $demande
            ], 200);
        }
    }
}
