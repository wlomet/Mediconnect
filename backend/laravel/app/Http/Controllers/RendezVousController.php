<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class RendezVousController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'medecin_id' => 'required|integer|exists:users,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'name' => 'required|string|max:255',
            'statut' => 'required'
        ]);

        // Chercher l'utilisateur par email
        $user = User::where('email', $validated['email'])->first();

        if ($user) {
            $validated['client_id'] = $user->id;
        }

        // Ajouter automatiquement l'author_id (l'utilisateur connecté)
        $validated['author_id'] = auth()->user()->id;

        $rendezVous = RendezVous::create($validated);
        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'rendez_vous' => $rendezVous
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $rendezVous = RendezVous::findOrFail($id);

        $validated = $request->validate([
            'email' => 'nullable|email',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'name' => 'required|string|max:255',
            'statut' => 'required|string'
        ]);

        // Si le statut passe à "confirmé", ajouter l'ID de l'utilisateur qui confirme
        if ($validated['statut'] === 'confirmé' && $rendezVous->statut !== 'confirmé') {
            $validated['confirmed_by'] = auth()->user()->id;
        }

        // Si email est fourni et différent, chercher le nouvel utilisateur
        if (isset($validated['email']) && $validated['email'] !== $rendezVous->email) {
            $user = User::where('email', $validated['email'])->first();
            if ($user) {
                $validated['client_id'] = $user->id;
            }
        }

        $rendezVous->update($validated);

        return response()->json([
            'message' => 'Rendez-vous mis à jour avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    public function destroy($id)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $rendezVous->supprimer();

        return response()->json([
            'message' => 'Rendez-vous supprimé avec succès'
        ], 200);
    }

    /**
     * Récupérer les rendez-vous du médecin connecté
     */
    public function getMedecinRendezVous(Request $request)
    {
        $user = $request->user();

        // Vérifier que l'utilisateur est bien un médecin
        if (!$user->hasRole('medecin')) {
            return response()->json(['message' => 'Vous devez être médecin pour effectuer cette action'], 403);
        }

        $medecin = $user->medecinProfile;

        $rendezVous = RendezVous::where('medecin_id', $medecin->id)
            ->orderBy('date_debut', 'desc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'name' => $rdv->name,
                    'email' => $rdv->email,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'notes' => $rdv->notes
                ];
            });

        return response()->json([
            'rendez_vous' => $rendezVous
        ]);
    }

    /**
     * Récupérer les rendez-vous d'aujourd'hui pour le médecin connecté
     */
    public function getTodayRendezVous(Request $request)
    {
        $user = $request->user();

        // Vérifier que l'utilisateur est bien un médecin
        if (!$user->hasRole('medecin')) {
            return response()->json(['message' => 'Vous devez être médecin pour effectuer cette action'], 403);
        }

        $medecin = $user->medecinProfile;

        $today = now()->startOfDay();
        $tomorrow = now()->addDay()->startOfDay();

        $rendezVous = RendezVous::where('medecin_id', $medecin->id)
            ->whereBetween('date_debut', [$today, $tomorrow])
            ->orderBy('date_debut', 'asc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'name' => $rdv->name,
                    'email' => $rdv->email,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'notes' => $rdv->notes
                ];
            });

        return response()->json([
            'rendez_vous' => $rendezVous,
            'count' => count($rendezVous)
        ]);
    }

    /**
     * Récupérer les rendez-vous du mois en cours pour le médecin connecté
     */
    public function getMonthRendezVous(Request $request)
    {
        $user = $request->user();

        // Vérifier que l'utilisateur est bien un médecin
        if (!$user->hasRole('medecin')) {
            return response()->json(['message' => 'Vous devez être médecin pour effectuer cette action'], 403);
        }

        $medecin = $user->medecinProfile;

        $startOfMonth = now()->startOfMonth();
        $endOfMonth = now()->endOfMonth();

        $rendezVous = RendezVous::where('medecin_id', $medecin->id)
            ->whereBetween('date_debut', [$startOfMonth, $endOfMonth])
            ->orderBy('date_debut', 'desc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'name' => $rdv->name,
                    'email' => $rdv->email,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'notes' => $rdv->notes
                ];
            });

        return response()->json([
            'rendez_vous' => $rendezVous,
            'count' => count($rendezVous)
        ]);
    }
}
