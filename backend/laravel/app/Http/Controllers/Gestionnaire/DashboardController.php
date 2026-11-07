<?php

namespace App\Http\Controllers\Gestionnaire;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\GestionnaireMedecin;
use App\Models\Gestionnaire;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Récupère le profil du gestionnaire connecté
     */
    public function getProfile(Request $request)
    {
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();

        if (!$gestionnaireProfile) {
            return response()->json(['message' => 'Profil gestionnaire non trouvé'], 404);
        }

        return response()->json([
            'id' => $gestionnaireProfile->id,
            'user_id' => $gestionnaireProfile->user_id,
            'hopital_id' => $gestionnaireProfile->hopital_id,
            'name' => $gestionnaireProfile->name,
            'created_at' => $gestionnaireProfile->created_at,
            'updated_at' => $gestionnaireProfile->updated_at
        ]);
    }

    /**
     * Dashboard du gestionnaire avec statistiques
     * Si hopital_id: retourne tous les médecins de l'hôpital
     * Sinon: retourne les médecins liés via gestionnaire_medecin
     */
    public function show(Request $request)
    {
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();

        if (!$gestionnaireProfile) {
            return response()->json([
                'message' => 'Dashboard Gestionnaire',
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

        // Si le gestionnaire est lié à un hôpital
        if ($gestionnaireProfile->hopital_id) {
            $medecinProfiles = MedecinProfile::where('hopital_id', $gestionnaireProfile->hopital_id)
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
            // Sinon, récupérer les médecins liés via gestionnaire_medecin
            $medecinsLies = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
        ];

        return response()->json([
            'message' => 'Dashboard Gestionnaire',
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
     * Vérifie l'accès selon hopital_id du gestionnaire
     */
    public function getMedecinPlanning(Request $request, $medecinId)
    {
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($gestionnaireProfile->hopital_id) {
            // Si le gestionnaire est lié à un hôpital, vérifier que le médecin est aussi du même hôpital
            if ($profile->hopital_id !== $gestionnaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            // Sinon, vérifier la liaison via gestionnaire_medecin
            $liaison = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($gestionnaireProfile->hopital_id) {
            // Si le gestionnaire est lié à un hôpital, vérifier que le médecin est aussi du même hôpital
            if ($profile->hopital_id !== $gestionnaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            // Sinon, vérifier la liaison via gestionnaire_medecin
            $liaison = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($gestionnaireProfile->hopital_id) {
            if ($profile->hopital_id !== $gestionnaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($gestionnaireProfile->hopital_id) {
            if ($profile->hopital_id !== $gestionnaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
     * Mettre à jour les horaires d'un médecin (pour les gestionnaires)
     */
    public function updateHoraires(Request $request, $medecinId)
    {
        $gestionnaire = $request->user();
        $gestionnaireProfile = Gestionnaire::where('user_id', $gestionnaire->id)->first();
        $medecin = User::findOrFail($medecinId);
        $profile = $medecin->medecinProfile;

        if (!$profile) {
            return response()->json(['message' => 'Profil médecin non trouvé'], 404);
        }

        // Vérifier l'accès
        if ($gestionnaireProfile->hopital_id) {
            if ($profile->hopital_id !== $gestionnaireProfile->hopital_id) {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }
        } else {
            $liaison = GestionnaireMedecin::where('gestionnaire_id', $gestionnaire->id)
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
