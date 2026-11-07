<?php

namespace App\Http\Controllers\Secretaire;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\SecretaireMedecin;
use App\Models\Secretaire;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Récupère le profil de la secrétaire connectée
     */
    public function getProfile(Request $request)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json(['message' => 'Profil secrétaire non trouvé'], 404);
        }

        return response()->json([
            'id' => $secretaireProfile->id,
            'user_id' => $secretaireProfile->user_id,
            'hopital_id' => $secretaireProfile->hopital_id,
            'name' => $secretaireProfile->name,
            'created_at' => $secretaireProfile->created_at,
            'updated_at' => $secretaireProfile->updated_at
        ]);
    }

    /**
     * Dashboard du secrétaire avec statistiques
     * Si hopital_id: retourne tous les médecins de l'hôpital
     * Sinon: retourne les médecins liés via secretaire_medecin
     */
    public function show(Request $request)
    {
        $secretaire = $request->user();
        $secretaireProfile = Secretaire::where('user_id', $secretaire->id)->first();

        if (!$secretaireProfile) {
            return response()->json([
                'message' => 'Dashboard Secrétaire',
                'stats' => [
                    'total_medecins' => 0,
                    'total_rdv_aujourdhui' => 0,
                    'total_rdv_semaine' => 0,
                ],
                'medecins' => []
            ]);
        }

        $medecinProfileIds = [];
        $medecinsData = [];

        // Si la secrétaire est liée à un hôpital
        if ($secretaireProfile->hopital_id) {
            $medecinProfiles = MedecinProfile::where('hopital_id', $secretaireProfile->hopital_id)
                ->with(['user', 'specialite'])
                ->get();

            $medecinProfileIds = $medecinProfiles->pluck('id')->toArray();
            $medecinsData = $medecinProfiles->map(function ($profile) {
                return [
                    'id' => $profile->user->id,
                    'name' => $profile->user->name,
                    'email' => $profile->user->email,
                    'specialite' => $profile->specialite?->nom ?? 'Non spécifié',
                    'telephone' => $profile->telephone ?? '',
                    'adresse' => $profile->adresse ?? '',
                ];
            });
        } else {
            // Sinon, récupérer les médecins liés via secretaire_medecin
            $medecinsLies = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('statut', 'accepte')
                ->with(['medecin.medecinProfile.specialite'])
                ->get();

            $medecinProfileIds = $medecinsLies->pluck('medecin.medecinProfile.id')->toArray();
            $medecinsData = $medecinsLies->map(function ($liaison) {
                return [
                    'id' => $liaison->medecin->id,
                    'name' => $liaison->medecin->name,
                    'email' => $liaison->medecin->email,
                    'specialite' => $liaison->medecin->medecinProfile?->specialite?->nom ?? 'Non spécifié',
                    'telephone' => $liaison->medecin->medecinProfile?->telephone ?? '',
                    'adresse' => $liaison->medecin->medecinProfile?->adresse ?? '',
                ];
            });
        }

        // Statistiques globales (filtrées aux médecins accessibles)
        $stats = [
            'total_medecins' => count($medecinsData),
            'total_rdv_aujourdhui' => RendezVous::whereIn('medecin_id', $medecinProfileIds)
                ->whereDate('date_debut', Carbon::today())
                ->count(),
            'total_rdv_semaine' => RendezVous::whereIn('medecin_id', $medecinProfileIds)
                ->whereBetween('date_debut', [
                    Carbon::now()->startOfWeek(),
                    Carbon::now()->endOfWeek()
                ])->count(),
            'rendez_vous_a_valider' => RendezVous::whereIn('medecin_id', $medecinProfileIds)
                ->where('statut', 'en_attente')
                ->count(),
            'rendez_vous_a_valider_plus_2_semaines' => RendezVous::whereIn('medecin_id', $medecinProfileIds)
                ->where('statut', 'en_attente')
                ->where('date_debut', '>', now()->addWeeks(2))
                ->count(),
        ];

        return response()->json([
            'message' => 'Dashboard Secrétaire',
            'stats' => $stats,
            'medecins' => $medecinsData
        ]);
    }

    /**
     * Récupérer tous les médecins de la plateforme
     */
    public function getAllMedecins()
    {
        $medecins = User::role('medecin')
            ->with(['medecinProfile.specialite'])
            ->get()
            ->map(function ($medecin) {
                return [
                    'id' => $medecin->id,
                    'name' => $medecin->name,
                    'email' => $medecin->email,
                    'specialite' => $medecin->medecinProfile?->specialite?->nom ?? 'Non spécifié',
                    'telephone' => $medecin->medecinProfile?->telephone ?? '',
                    'adresse' => $medecin->medecinProfile?->adresse ?? '',
                    'ville' => $medecin->medecinProfile?->ville ?? '',
                ];
            });

        return response()->json(['medecins' => $medecins]);
    }

    /**
     * Récupérer les patients
     */
    public function getPatients()
    {
        $patients = User::role('client')
            ->select('id', 'name', 'email', 'phone', 'address')
            ->get();

        return response()->json(['patients' => $patients]);
    }

    /**
     * Récupérer le planning d'un médecin lié
     * Vérifie l'accès selon hopital_id de la secrétaire
     */
    public function getMedecinPlanning(Request $request, $medecinId)
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

        $horaires = $profile->horaires()->get();
        $indisponibilites = $profile->indisponibilites()->get();
        $rendezVous = RendezVous::where('medecin_id', $profile->id)
            ->with(['client'])
            ->orderBy('date_debut', 'asc')
            ->get();

        return response()->json([
            'medecin' => [
                'id' => $medecin->id,
                'name' => $medecin->name,
                'specialite' => $profile->specialite?->nom ?? 'Non spécifié',
            ],
            'medecin_profile_id' => $profile->id,
            'horaires' => $horaires,
            'indisponibilites' => $indisponibilites,
            'rendez_vous' => $rendezVous,
        ]);
    }

    /**
     * Récupérer le profil complet d'un médecin lié
     */
    public function getMedecinProfile(Request $request, $medecinId)
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

        return response()->json([
            'id' => $medecin->id,
            'name' => $medecin->name,
            'email' => $medecin->email,
            'specialite' => $profile->specialite?->nom ?? 'Non spécifié',
            'telephone' => $profile->telephone ?? '',
            'adresse' => $profile->adresse ?? '',
            'ville' => $profile->ville ?? '',
            'description' => $profile->description ?? '',
        ]);
    }

    /**
     * Ajouter un horaire pour un médecin
     */
    public function addHoraire(Request $request, $medecinId)
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
            if ($profile->hopital_id !== $secretaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('medecin_id', $medecinId)
                ->where('statut', 'accepte')
                ->first();

            if (!$liaison) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        }

        $validated = $request->validate([
            'jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
        ]);

        $horaire = \App\Models\HoraireMedecin::create([
            'medecin_id' => $profile->id,
            'jour' => $validated['jour'],
            'heure_debut' => $validated['heure_debut'],
            'heure_fin' => $validated['heure_fin'],
            'actif' => true,
        ]);

        return response()->json([
            'message' => 'Disponibilité ajoutée avec succès',
            'horaire' => $horaire,
        ], 201);
    }

    /**
     * Ajouter une indisponibilité pour un médecin
     */
    public function addIndisponibilite(Request $request, $medecinId)
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
            if ($profile->hopital_id !== $secretaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('medecin_id', $medecinId)
                ->where('statut', 'accepte')
                ->first();

            if (!$liaison) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        }

        $validated = $request->validate([
            'date_debut' => 'required|date|after_or_equal:today',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'motif' => 'nullable|string|max:255',
        ]);

        $chevauchement = \App\Models\IndisponibiliteMedecin::where('medecin_id', $profile->id)
            ->where('date_debut', '<=', $validated['date_fin'])
            ->where('date_fin', '>=', $validated['date_debut'])
            ->exists();

        if ($chevauchement) {
            return response()->json([
                'message' => 'Cette période chevauche avec une indisponibilité existante. Veuillez choisir une autre période.'
            ], 422);
        }

        $indisponibilite = \App\Models\IndisponibiliteMedecin::create([
            'medecin_id' => $profile->id,
            'date_debut' => $validated['date_debut'],
            'date_fin' => $validated['date_fin'],
            'motif' => $validated['motif'] ?? '',
        ]);

        return response()->json([
            'message' => 'Indisponibilité ajoutée avec succès',
            'indisponibilite' => $indisponibilite,
        ], 201);
    }

    /**
     * Mettre à jour les horaires d'un médecin (pour les secrétaires)
     */
    public function updateHoraires(Request $request, $medecinId)
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
            if ($profile->hopital_id !== $secretaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = SecretaireMedecin::where('secretaire_id', $secretaire->id)
                ->where('medecin_id', $medecinId)
                ->where('statut', 'accepte')
                ->first();

            if (!$liaison) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        }

        $validated = $request->validate([
            'horaires' => 'required|array',
            'horaires.*.jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'horaires.*.creneau' => 'required|string|in:matin,apres_midi',
            'horaires.*.heure_debut' => 'required|date_format:H:i',
            'horaires.*.heure_fin' => 'required|date_format:H:i|after:horaires.*.heure_debut',
            'horaires.*.actif' => 'sometimes|boolean',
        ]);

        $horairesMisAJour = [];

        foreach ($validated['horaires'] as $horaireData) {
            $horaire = \App\Models\HoraireMedecin::updateOrCreate(
                [
                    'medecin_id' => $profile->id,
                    'jour' => $horaireData['jour'],
                    'creneau' => $horaireData['creneau'],
                ],
                [
                    'heure_debut' => $horaireData['heure_debut'],
                    'heure_fin' => $horaireData['heure_fin'],
                    'actif' => $horaireData['actif'] ?? true,
                ]
            );

            $horairesMisAJour[] = $horaire;
        }

        return response()->json([
            'message' => 'Horaires mis à jour avec succès',
            'count' => count($horairesMisAJour),
            'horaires' => $horairesMisAJour
        ]);
    }
}
