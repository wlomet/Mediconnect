<?php

namespace App\Http\Controllers\Secretaire;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RendezVous;
use App\Models\User;
use App\Models\SecretaireMedecin;
use App\Models\Secretaire;
use Carbon\Carbon;
use App\Services\RendezVousStatutGuard;
use Illuminate\Validation\Rule;

class RendezVousController extends Controller
{
    /**
     * Vérifie si la secrétaire peut accéder à un médecin (via MedecinProfile ID)
     * Si hopital_id: tous les médecins de l'hôpital sont accessibles
     * Sinon: seulement les médecins liés via secretaire_medecin
     */
    private function canAccessMedecin(Secretaire $secretaireProfile, $medecinProfileId)
    {
        $medecinProfile = \App\Models\MedecinProfile::findOrFail($medecinProfileId);

        if ($secretaireProfile->hopital_id) {
            // Vérifier que le médecin est du même hôpital
            if ($medecinProfile->hopital_id !== $secretaireProfile->hopital_id) {
                return false;
            }
        } else {
            // Vérifier la liaison via secretaire_medecin
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaireProfile->user_id)
                ->where('medecin_id', $medecinProfile->user_id)
                ->where('statut', 'accepte')
                ->first();

            if (!$liaison) {
                return false;
            }
        }

        return true;
    }

    /**
     * Vérifie si la secrétaire peut accéder à un rendez-vous
     */
    private function canAccessRendezVous(Secretaire $secretaireProfile, RendezVous $rendezVous)
    {
        $medecinProfile = \App\Models\MedecinProfile::find($rendezVous->medecin_id);

        if (!$medecinProfile) {
            return false;
        }

        if ($secretaireProfile->hopital_id) {
            // Vérifier que le médecin est du même hôpital
            return $medecinProfile->hopital_id === $secretaireProfile->hopital_id;
        } else {
            // Vérifier la liaison via secretaire_medecin
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaireProfile->user_id)
                ->where('medecin_id', $medecinProfile->user_id)
                ->where('statut', 'accepte')
                ->first();

            return $liaison !== null;
        }
    }

    /**
     * Récupère les détails d'un rendez-vous spécifique
     * Vérifie que la secrétaire a accès au rendez-vous
     */
    public function show(Request $request, $id)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier l'accès au rendez-vous
        if (!$this->canAccessRendezVous($secretaireProfile, $rendezVous)) {
            return response()->json(['message' => 'Accès non autorisé à ce rendez-vous'], 403);
        }

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
            ]
        ]);
    }

    /**
     * Vérifie que le médecin est accessible (hopital ou liaison)
     */
    public function store(Request $request)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        $validated = $request->validate([
            'email' => 'nullable|email',
            'medecin_id' => 'required|integer|exists:medecin_profiles,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'name' => 'required|string|max:255',
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber],
        ]);

        // Vérifier qu'au moins l'email ou le téléphone est fourni
        if (empty($validated['email']) && empty($validated['phone'])) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        // Vérifier l'accès au médecin
        if (!$this->canAccessMedecin($secretaireProfile, $validated['medecin_id'])) {
            return response()->json(['message' => 'Accès non autorisé à ce médecin'], 403);
        }

        // Chercher l'utilisateur par email
        if (!empty($validated['email'])) {
            $user = User::where('email', $validated['email'])->first();
            if ($user) {
                $validated['client_id'] = $user->id;
            }
        }

        // Ajouter automatiquement l'author_id (le secrétaire connecté)
        $validated['author_id'] = $secretaire->id;
        $validated['statut'] = 'confirmé';

        $rendezVous = RendezVous::create($validated);
        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'rendez_vous' => $rendezVous
        ], 201);
    }

    /**
     * Secrétaire met à jour un rendez-vous
     * Vérifie que la secrétaire a accès au rendez-vous
     * Vérifie qu'au moins l'email ou le téléphone est fourni
     */
    public function update(Request $request, $id)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier l'accès au rendez-vous
        if (!$this->canAccessRendezVous($secretaireProfile, $rendezVous)) {
            return response()->json(['message' => 'Accès non autorisé à ce rendez-vous'], 403);
        }

        $validated = $request->validate([
            'email' => 'nullable|email',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'name' => 'required|string|max:255',
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber],
            'statut' => ['sometimes', Rule::in(RendezVous::STATUTS)]
        ]);

        // Vérifier qu'au moins l'email ou le téléphone est fourni
        $email = $validated['email'] ?? $rendezVous->email;
        $phone = $validated['phone'] ?? $rendezVous->phone;

        if (empty($email) && empty($phone)) {
            return response()->json(
                ['message' => 'Vous devez fournir au moins un email ou un téléphone'],
                422
            );
        }

        // Si email est fourni et différent, chercher le nouvel utilisateur
        if (isset($validated['email']) && $validated['email'] !== $rendezVous->email && !empty($validated['email'])) {
            $user = User::where('email', $validated['email'])->first();
            if ($user) {
                $validated['client_id'] = $user->id;
            }
        }

        RendezVousStatutGuard::verifier($rendezVous, $validated['statut'] ?? null);
        $rendezVous->update($validated);

        return response()->json([
            'message' => 'Rendez-vous mis à jour avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    /**
     * Secrétaire récupére les rendez-vous d'un médecin lié
     * Vérifie l'accès selon hopital_id de la secrétaire
     */
    public function getMedecinRendezVous(Request $request, $medecinId)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($secretaireProfile->hopital_id) {
            // Si la secrétaire est liée à un hôpital, vérifier que le médecin est aussi du même hôpital
            if ($profile->hopital_id !== $secretaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            // Sinon, vérifier la liaison via secretaire_medecin
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('medecin_id', $medecinId)
                ->where('statut', 'accepte')
                ->first();

            if (!$liaison) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        }

        $rendezVous = RendezVous::where('medecin_id', $profile->id)
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
                'id' => $medecin->id,
                'name' => $medecin->name,
            ],
            'rendez_vous' => $rendezVous,
        ]);
    }

    /**
     * Secrétaire récupère les rendez-vous d'aujourd'hui de ses médecins accessibles
     * Si hopital_id: retourne les RDV de tous les médecins de l'hôpital
     * Sinon: retourne les RDV des médecins liés via secretaire_medecin
     */
    public function getTodayRendezVous(Request $request)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['rendez_vous' => []]);
        }

        $medecinProfileIds = [];

        // Si la secrétaire est liée à un hôpital
        if ($secretaireProfile->hopital_id) {
            // Récupérer tous les médecins de l'hôpital
            $medecinProfiles = \App\Models\MedecinProfile::where('hopital_id', $secretaireProfile->hopital_id)
                ->pluck('id')
                ->toArray();
            $medecinProfileIds = $medecinProfiles;
        } else {
            // Récupérer les médecins liés avec le statut "accepte"
            $medecinsLies = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('statut', 'accepte')
                ->with(['medecin.medecinProfile'])
                ->get();

            if ($medecinsLies->isEmpty()) {
                return response()->json(['rendez_vous' => []]);
            }

            $medecinProfileIds = $medecinsLies->pluck('medecin.medecinProfile.id')->toArray();
        }

        if (empty($medecinProfileIds)) {
            return response()->json(['rendez_vous' => []]);
        }

        // Récupérer les rendez-vous d'aujourd'hui
        $rendezVous = RendezVous::whereIn('medecin_id', $medecinProfileIds)
            ->whereDate('date_debut', Carbon::today())
            ->with(['medecin.user'])
            ->orderBy('date_debut', 'asc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'name' => $rdv->name,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'email' => $rdv->email,
                    'phone' => $rdv->phone,
                    'medecin' => [
                        'id' => $rdv->medecin?->user_id ?? null,
                        'name' => $rdv->medecin?->user?->name ?? 'Inconnu',
                    ],
                ];
            });

        return response()->json(['rendez_vous' => $rendezVous]);
    }

    /**
     * Secrétaire annule un rendez-vous
     * Vérifie que la secrétaire a accès au rendez-vous
     */
    public function cancel(Request $request, $id)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier l'accès au rendez-vous
        if (!$this->canAccessRendezVous($secretaireProfile, $rendezVous)) {
            return response()->json(['message' => 'Accès non autorisé à ce rendez-vous'], 403);
        }

        RendezVousStatutGuard::verifier($rendezVous, 'annulé');
        $rendezVous->update(['statut' => 'annulé']);

        return response()->json([
            'message' => 'Rendez-vous annulé avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    /**
     * Secrétaire supprime un rendez-vous
     * Vérifie que la secrétaire a accès au rendez-vous
     */
    public function destroy(Request $request, $id)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        $rendezVous = RendezVous::findOrFail($id);

        // Vérifier l'accès au rendez-vous
        if (!$this->canAccessRendezVous($secretaireProfile, $rendezVous)) {
            return response()->json(['message' => 'Accès non autorisé à ce rendez-vous'], 403);
        }

        $rendezVous->supprimer();

        return response()->json([
            'message' => 'Rendez-vous supprimé avec succès'
        ], 200);
    }
}
