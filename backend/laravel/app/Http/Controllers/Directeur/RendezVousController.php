<?php

namespace App\Http\Controllers\Directeur;

use App\Rules\PhoneNumber;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Directeur\Concerns\MedecinsAccessibles;
use Illuminate\Http\Request;
use App\Models\RendezVous;
use App\Models\User;
use Illuminate\Validation\Rule;
use App\Services\RendezVousModificationService;
use App\Services\RendezVousNotificationService;
use App\Services\RendezVousStatutGuard;

class RendezVousController extends Controller
{
    use MedecinsAccessibles;

    /**
     * Détail d'un rendez-vous d'un médecin de l'hôpital
     */
    public function show(Request $request, $id, RendezVousNotificationService $notifications)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $this->autoriserRendezVous($request->user(), $rendezVous);

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
                'notes' => $rendezVous->notes,
                'statut' => $rendezVous->statut,
                'consultation_statut' => $rendezVous->consultation?->statut,
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

    /**
     * Créer un rendez-vous pour un médecin de l'hôpital
     */
    public function store(Request $request, RendezVousNotificationService $notifications)
    {
        $directeur = $request->user();

        $validated = $request->validate([
            'email' => 'nullable|email',
            'medecin_id' => 'required|integer|exists:medecin_profiles,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'name' => 'required|string|max:255',
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber()],
        ]);

        if (empty($validated['email']) && empty($validated['phone'])) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        if (!in_array((int) $validated['medecin_id'], $this->medecinProfileIdsAccessibles($directeur))) {
            return response()->json(['message' => 'Accès non autorisé à ce médecin'], 403);
        }

        if (!empty($validated['email'])) {
            $user = User::where('email', $validated['email'])->first();
            if ($user) {
                $validated['client_id'] = $user->id;
            }
        }

        $validated['author_id'] = $directeur->id;
        $validated['statut'] = 'confirmé';

        $rendezVous = RendezVous::create($validated);
        $notifications->rendezVousCree($rendezVous);

        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'rendez_vous' => $rendezVous
        ], 201);
    }

    /**
     * Modifier un rendez-vous d'un médecin de l'hôpital
     */
    public function update(Request $request, $id, RendezVousNotificationService $notifications, RendezVousModificationService $modifications)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $this->autoriserRendezVous($request->user(), $rendezVous);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|nullable|email|max:255',
            'phone' => ['sometimes', 'nullable', 'string', 'max:20', new PhoneNumber()],
            'motif' => 'sometimes|required|string|max:500',
            'notes' => 'sometimes|nullable|string|max:1000',
            'statut' => ['sometimes', Rule::in(RendezVous::STATUTS)],
            'date_debut' => 'required_with:date_fin|date',
            'date_fin' => 'required_with:date_debut|date|after:date_debut',
            'chevauchement_autorise' => 'sometimes|boolean',
        ]);

        $chevauchementAutorise = (bool) ($validated['chevauchement_autorise'] ?? false);
        unset($validated['chevauchement_autorise']);

        $email = array_key_exists('email', $validated) ? $validated['email'] : $rendezVous->email;
        $phone = array_key_exists('phone', $validated) ? $validated['phone'] : $rendezVous->phone;

        if (empty($email) && empty($phone)) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        $statutAvant = $rendezVous->statut;
        $modifications->modifier($rendezVous, $validated, $chevauchementAutorise);
        $notifications->rendezVousConfirme($rendezVous, $statutAvant);
        $notifications->rendezVousAnnule($rendezVous, $statutAvant);

        return response()->json([
            'message' => 'Rendez-vous mis à jour avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    /**
     * Rendez-vous d'un médecin de l'hôpital (users.id)
     */
    public function getMedecinRendezVous(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $rendezVous = RendezVous::where('medecin_id', $profil->id)
            ->with(['client'])
            ->orderBy('date_debut', 'asc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'name' => $rdv->name ?? ($rdv->client?->name ?? null),
                    'email' => $rdv->email ?? ($rdv->client?->email ?? null),
                    'phone' => $rdv->phone,
                    'patient' => [
                        'id' => $rdv->client?->id ?? null,
                        'name' => $rdv->client?->name ?? $rdv->name,
                        'email' => $rdv->client?->email ?? $rdv->email,
                    ],
                ];
            });

        return response()->json([
            'medecin' => [
                'id' => $profil->user_id,
                'name' => $profil->user?->name,
            ],
            'rendez_vous' => $rendezVous,
        ]);
    }

    /**
     * Annuler un rendez-vous d'un médecin de l'hôpital
     */
    public function cancel(Request $request, $id, RendezVousNotificationService $notifications)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $this->autoriserRendezVous($request->user(), $rendezVous);

        RendezVousStatutGuard::verifier($rendezVous, 'annulé');
        $statutAvant = $rendezVous->statut;
        $rendezVous->update(['statut' => 'annulé']);
        $notifications->rendezVousAnnule($rendezVous, $statutAvant);

        return response()->json([
            'message' => 'Rendez-vous annulé avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    /**
     * Renvoyer l'email de confirmation d'un rendez-vous confirmé
     */
    public function renvoyerEmail(Request $request, $id, RendezVousNotificationService $notifications)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $this->autoriserRendezVous($request->user(), $rendezVous);

        $notifications->renvoyerConfirmation($rendezVous);

        return response()->json([
            'message' => 'Email de confirmation renvoyé avec succès'
        ], 200);
    }

    /**
     * Supprimer un rendez-vous d'un médecin de l'hôpital
     */
    public function destroy(Request $request, $id)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $this->autoriserRendezVous($request->user(), $rendezVous);

        $rendezVous->supprimer();

        return response()->json([
            'message' => 'Rendez-vous supprimé avec succès'
        ], 200);
    }

    // Le rendez-vous doit appartenir à un médecin de l'hôpital du directeur
    private function autoriserRendezVous(User $directeur, RendezVous $rendezVous): void
    {
        abort_unless(
            in_array($rendezVous->medecin_id, $this->medecinProfileIdsAccessibles($directeur)),
            403,
            'Accès non autorisé à ce rendez-vous'
        );
    }
}
