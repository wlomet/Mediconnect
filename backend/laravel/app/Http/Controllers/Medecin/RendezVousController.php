<?php

namespace App\Http\Controllers\Medecin;

use App\Rules\PhoneNumber;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RendezVous;
use App\Services\RendezVousBookingService;
use App\Services\RendezVousModificationService;
use App\Services\RendezVousNotificationService;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class RendezVousController extends Controller
{
    /**
     * Médecin récupère ses rendez-vous
     */
    public function getAll(Request $request)
    {
        $user = $request->user();

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
     * Médecin récupère ses rendez-vous d'aujourd'hui
     */
    public function getToday(Request $request)
    {
        $user = $request->user();

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
            'count' => $rendezVous->where('statut', '!=', 'annulé')->count()
        ]);
    }

    /**
     * Médecin récupère ses rendez-vous du mois
     */
    public function getThisMonth(Request $request)
    {
        $user = $request->user();

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
            'count' => $rendezVous->where('statut', '!=', 'annulé')->count()
        ]);
    }

    /**
     * Médecin met à jour un rendez-vous (statut, notes, email, name, phone, etc)
     */
    public function update(Request $request, $id, RendezVousNotificationService $notifications, RendezVousModificationService $modifications)
    {
        $user = $request->user();

        if (!$user->hasRole('medecin')) {
            return response()->json(['message' => 'Vous devez être médecin pour effectuer cette action'], 403);
        }

        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier que le rendez-vous appartient au médecin
        $medecinProfile = $user->medecinProfile;
        if ($rendezVous->medecin_id !== $medecinProfile->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $validated = $request->validate([
            'statut' => ['sometimes', Rule::in(RendezVous::STATUTS)],
            'motif' => 'sometimes|required|string|max:500',
            'notes' => 'sometimes|nullable|string|max:1000',
            'email' => 'sometimes|nullable|email|max:255',
            'name' => 'sometimes|required|string|max:255',
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', new PhoneNumber()],
            'date_debut' => 'required_with:date_fin|date',
            'date_fin' => 'required_with:date_debut|date|after:date_debut',
            'chevauchement_autorise' => 'sometimes|boolean',
        ]);

        $chevauchementAutorise = (bool) ($validated['chevauchement_autorise'] ?? false);
        unset($validated['chevauchement_autorise']);

        // Vérifier qu'au moins l'email ou le téléphone est fourni
        $email = array_key_exists('email', $validated) ? $validated['email'] : $rendezVous->email;
        $phone = array_key_exists('phone', $validated) ? $validated['phone'] : $rendezVous->phone;

        if (empty($email) && empty($phone)) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        // Si le statut passe à "confirmé", ajouter l'ID du médecin qui confirme
        if (isset($validated['statut']) && $validated['statut'] === 'confirmé' && $rendezVous->statut !== 'confirmé') {
            $validated['confirmed_by'] = $user->id;
        }

        $statutAvant = $rendezVous->statut;
        $modifications->modifier($rendezVous, $validated, $chevauchementAutorise);
        $notifications->rendezVousConfirme($rendezVous, $statutAvant);

        return response()->json([
            'message' => 'Rendez-vous mis à jour avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    /**
     * Médecin récupère un rendez-vous spécifique
     */
    public function show(Request $request, $id, RendezVousNotificationService $notifications)
    {
        $user = $request->user();
        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier que le rendez-vous appartient au médecin (optionnel mais recommandé)
        if ($user && $user->hasRole('medecin')) {
            $medecinProfile = $user->medecinProfile;
            if ($rendezVous->medecin_id !== $medecinProfile->id) {
                return response()->json(['message' => 'Non autorisé'], 403);
            }
        }

        $rendezVous->load(['medecin.user', 'consultation']);

        return response()->json([
            'rendez_vous' => [
                'id' => $rendezVous->id,
                'name' => $rendezVous->name,
                'email' => $rendezVous->email,
                'phone' => $rendezVous->phone,
                'date_debut' => $rendezVous->date_debut,
                'date_fin' => $rendezVous->date_fin,
                'motif' => $rendezVous->motif,
                'statut' => $rendezVous->statut,
                'consultation_statut' => $rendezVous->consultation?->statut,
                'notes' => $rendezVous->notes,
                'medecin' => [
                    'id' => $rendezVous->medecin?->user_id,
                    'name' => $rendezVous->medecin?->user?->name,
                ],
                'patient_verrouille' => $rendezVous->clientAPrisLeRendezVous(),
                'modifiable' => $rendezVous->consultation === null,
                'peut_renvoyer_email' => $notifications->peutRenvoyerConfirmation($rendezVous),
            ]
        ]);
    }

    public function store(Request $request, RendezVousBookingService $bookings)
    {
        $profil = $request->user()->medecinProfile;
        abort_unless($profil, 403);

        $validated = $request->validate([
            'medecin_id' => ['required', 'integer', Rule::in([$profil->id])],
            'email' => 'nullable|email|max:255',
            'name' => 'required|string|max:255',
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber()],
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after:date_debut',
            'statut' => ['required', Rule::in(['en_attente', 'confirmé'])],
        ]);

        if (empty($validated['email']) && empty($validated['phone'])) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        $rendezVous = $bookings->createByMedecin($profil, $request->user(), $validated);

        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'rendez_vous' => $rendezVous
        ], 201);
    }

    /**
     * Médecin renvoie l'email de confirmation d'un rendez-vous confirmé
     */
    public function renvoyerEmail(Request $request, $id, RendezVousNotificationService $notifications)
    {
        $user = $request->user();

        if (!$user->hasRole('medecin')) {
            return response()->json(['message' => 'Vous devez être médecin pour effectuer cette action'], 403);
        }

        $rendezVous = RendezVous::findOrFail($id);

        if ($rendezVous->medecin_id !== $user->medecinProfile->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $notifications->renvoyerConfirmation($rendezVous);

        return response()->json([
            'message' => 'Email de confirmation renvoyé avec succès'
        ], 200);
    }

    public function destroy(Request $request, $id)
    {
        $profil = $request->user()->medecinProfile;
        abort_unless($profil, 403);

        $rendezVous = RendezVous::findOrFail($id);

        if ($rendezVous->medecin_id !== $profil->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        $rendezVous->supprimer();

        return response()->json([
            'message' => 'Rendez-vous supprimé avec succès'
        ], 200);
    }

}
