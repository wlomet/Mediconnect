<?php

namespace App\Http\Controllers\Directeur;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Gestionnaire;
use App\Models\Secretaire;
use App\Models\RendezVous;

class DirecteurController extends Controller
{
    /**
     * Dashboard du directeur avec statistiques
     */
    public function dashboard(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $hopital = $directeur->hopital;
        $hopitalId = $directeur->hopital_id;

        // Compter les médecins de l'hôpital
        $medecinUserIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('user_id');
        $medecinProfileIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('id');
        $totalMedecins = $medecinUserIds->count();

        // Compter les gestionnaires de l'hôpital
        $gestionnaireUserIds = Gestionnaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $totalGestionnaires = $gestionnaireUserIds->count();

        // Compter les secrétaires de l'hôpital
        $secretaireUserIds = Secretaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $totalSecretaires = $secretaireUserIds->count();

        // Combiner tous les IDs des utilisateurs de l'hôpital
        $hopitalUserIds = collect()
            ->merge($medecinUserIds)
            ->merge($gestionnaireUserIds)
            ->merge($secretaireUserIds)
            ->unique()
            ->values();

        $totalUsers = $hopitalUserIds->count() + 1; // +1 pour le directeur
        $totalClients = User::role('client')->count();
        $totalRdv = RendezVous::whereIn('medecin_id', $medecinProfileIds)->count();

        return response()->json([
            'message' => 'Dashboard Directeur',
            'directeur' => [
                'id' => $directeur->id,
                'name' => $directeur->name,
                'hopital' => [
                    'id' => $hopital->id,
                    'name' => $hopital->name,
                    'adresse' => $hopital->adresse,
                    'telephone' => $hopital->telephone,
                    'ville' => $hopital->ville,
                ]
            ],
            'stats' => [
                'total_users' => $totalUsers,
                'total_medecins' => $totalMedecins,
                'total_gestionnaires' => $totalGestionnaires,
                'total_secretaires' => $totalSecretaires,
                'total_rdv' => $totalRdv,
            ]
        ]);
    }

    /**
     * Récupérer les statistiques détaillées
     */
    public function getStats(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $hopitalId = $directeur->hopital_id;

        // Récupérer les statistiques de l'hôpital
        $medecinUserIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('user_id');
        $medecinProfileIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('id');
        $gestionnaireUserIds = Gestionnaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $secretaireUserIds = Secretaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $directeurUserIds = Directeur::where('hopital_id', $hopitalId)->pluck('user_id');

        // Combiner tous les IDs
        $hopitalUserIds = collect()
            ->merge($medecinUserIds)
            ->merge($gestionnaireUserIds)
            ->merge($secretaireUserIds)
            ->merge($directeurUserIds)
            ->unique()
            ->values();

        $totalUsers = $hopitalUserIds->count();
        $totalMedecins = $medecinUserIds->count();
        $totalSecretaires = $secretaireUserIds->count();
        $totalGestionnaires = $gestionnaireUserIds->count();
        $totalDirecteurs = $directeurUserIds->count();
        $totalRdv = RendezVous::whereIn('medecin_id', $medecinProfileIds)->count();

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'total_medecins' => $totalMedecins,
                'total_gestionnaires' => $totalGestionnaires,
                'total_secretaires' => $totalSecretaires,
                'total_directeurs' => $totalDirecteurs,
                'total_rdv' => $totalRdv,
            ]
        ]);
    }

    /**
     * Récupérer les utilisateurs liés au même hôpital
     */
    public function getUsers(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $hopitalId = $directeur->hopital_id;

        // Récupérer les IDs des utilisateurs liés à l'hôpital
        $medecinUserIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('user_id');
        $gestionnaireUserIds = Gestionnaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $secretaireUserIds = Secretaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $directeurUserIds = Directeur::where('hopital_id', $hopitalId)->pluck('user_id');

        // Combiner tous les IDs et supprimer les doublons
        $userIds = collect()
            ->merge($medecinUserIds)
            ->merge($gestionnaireUserIds)
            ->merge($secretaireUserIds)
            ->merge($directeurUserIds)
            ->unique()
            ->values();

        // Récupérer les utilisateurs
        $users = User::whereIn('id', $userIds)
            ->with('roles')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'created_at' => $user->created_at,
                    'roles' => $user->getRoleNames(),
                ];
            });

        return response()->json([
            'users' => $users,
            'total' => count($users)
        ]);
    }

    /**
     * Récupérer les données du personnel pour DataTables
     */
    public function getPersonnelData(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $hopitalId = $directeur->hopital_id;

        // Récupérer les IDs des utilisateurs liés à l'hôpital
        $medecinUserIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('user_id');
        $gestionnaireUserIds = Gestionnaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $secretaireUserIds = Secretaire::where('hopital_id', $hopitalId)->pluck('user_id');
        $directeurUserIds = Directeur::where('hopital_id', $hopitalId)->pluck('user_id');

        // Combiner tous les IDs et supprimer les doublons
        $userIds = collect()
            ->merge($medecinUserIds)
            ->merge($gestionnaireUserIds)
            ->merge($secretaireUserIds)
            ->merge($directeurUserIds)
            ->unique()
            ->values();

        // Récupérer les paramètres de pagination et filtrage
        $sortBy = $request->get('sortBy', 'created_at');
        $sortOrder = $request->get('sortOrder', 'desc');
        $searchTerm = $request->get('search', '');

        // Construire la requête
        $query = User::whereIn('id', $userIds)->with('roles');

        // Appliquer le filtrage
        if ($searchTerm) {
            $query->where(function ($q) use ($searchTerm) {
                $q->where('name', 'like', "%{$searchTerm}%")
                  ->orWhere('email', 'like', "%{$searchTerm}%");
            });
        }

        // Compter l'avant filtrage
        $totalRecords = User::whereIn('id', $userIds)->count();

        // Appliquer le tri et la pagination
        $query->orderBy($sortBy, $sortOrder);
        $perPage = $request->get('perPage', 10);
        $page = $request->get('page', 1);
        $skip = ($page - 1) * $perPage;

        $users = $query->skip($skip)->take($perPage)->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->roles[0]->name ?? 'user',
                    'created_at' => $user->created_at->format('Y-m-d'),
                ];
            });

        $filteredRecords = User::whereIn('id', $userIds)
            ->when($searchTerm, function ($q) use ($searchTerm) {
                $q->where(function ($subq) use ($searchTerm) {
                    $subq->where('name', 'like', "%{$searchTerm}%")
                          ->orWhere('email', 'like', "%{$searchTerm}%");
                });
            })
            ->count();

        return response()->json([
            'data' => $users,
            'totalRecords' => $totalRecords,
            'filteredRecords' => $filteredRecords,
            'page' => $page,
            'perPage' => $perPage,
        ]);
    }

    /**
     * DataTables AJAX endpoint
     */
    public function getPersonnelDatatable(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'draw' => intval($request->input('draw', 0)),
                    'recordsTotal' => 0,
                    'recordsFiltered' => 0,
                    'data' => []
                ], 200);
            }

            $directeur = Directeur::where('user_id', $user->id)->first();

            if (!$directeur) {
                return response()->json([
                    'draw' => intval($request->input('draw', 0)),
                    'recordsTotal' => 0,
                    'recordsFiltered' => 0,
                    'data' => []
                ], 200);
            }

            $hopitalId = $directeur->hopital_id;

            // Récupérer les IDs des utilisateurs liés à l'hôpital
            $medecinUserIds = MedecinProfile::where('hopital_id', $hopitalId)->pluck('user_id')->toArray();
            $gestionnaireUserIds = Gestionnaire::where('hopital_id', $hopitalId)->pluck('user_id')->toArray();
            $secretaireUserIds = Secretaire::where('hopital_id', $hopitalId)->pluck('user_id')->toArray();
            $directeurUserIds = Directeur::where('hopital_id', $hopitalId)->pluck('user_id')->toArray();

            $userIds = array_unique(array_merge(
                $medecinUserIds,
                $gestionnaireUserIds,
                $secretaireUserIds,
                $directeurUserIds
            ));

            if (empty($userIds)) {
                return response()->json([
                    'draw' => intval($request->input('draw', 0)),
                    'recordsTotal' => 0,
                    'recordsFiltered' => 0,
                    'data' => []
                ], 200);
            }

            $draw = intval($request->input('draw', 0));
            $start = intval($request->input('start', 0));
            $length = intval($request->input('length', 10));
            $searchValue = $request->input('search.value', '');
            $sortColumn = intval($request->input('order.0.column', 0));
            $sortDir = strtoupper($request->input('order.0.dir', 'ASC')) === 'DESC' ? 'DESC' : 'ASC';

            // Colonnes disponibles
            $columns = ['name', 'email', 'role', 'created_at', 'id'];
            $orderColumnName = isset($columns[$sortColumn]) ? $columns[$sortColumn] : 'created_at';

            // Compter les enregistrements totaux
            $recordsTotal = User::whereIn('id', $userIds)->count();

            // Construire la requête de base
            $query = User::whereIn('id', $userIds)->with('roles');

            // Copier pour le filtrage
            $queryFilter = clone $query;

            // Appliquer le filtrage
            if (!empty($searchValue)) {
                $queryFilter->where(function ($q) use ($searchValue) {
                    $q->where('name', 'like', "%{$searchValue}%")
                      ->orWhere('email', 'like', "%{$searchValue}%");
                });
            }

            // Compter après filtrage
            $recordsFiltered = $queryFilter->count();

            // Appliquer le tri et la pagination
            $usersData = $queryFilter
                ->orderBy($orderColumnName, $sortDir)
                ->skip($start)
                ->take($length)
                ->get();

            // Formater les données
            $data = [];
            foreach ($usersData as $user) {
                $data[] = [
                    'id' => (int)$user->id,
                    'name' => (string)$user->name,
                    'email' => (string)$user->email,
                    'role' => isset($user->roles[0]) ? (string)$user->roles[0]->name : 'user',
                    'created_at' => $user->created_at->format('d/m/Y'),
                ];
            }

            return response()->json([
                'draw' => $draw,
                'recordsTotal' => (int)$recordsTotal,
                'recordsFiltered' => (int)$recordsFiltered,
                'data' => $data,
            ])->header('Content-Type', 'application/json; charset=utf-8');

        } catch (\Exception $e) {
            \Log::error('DataTables Error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' line ' . $e->getLine());

            return response()->json([
                'draw' => intval($request->input('draw', 0)),
                'recordsTotal' => 0,
                'recordsFiltered' => 0,
                'data' => [],
                'error' => 'Erreur serveur: ' . $e->getMessage(),
            ], 200)->header('Content-Type', 'application/json; charset=utf-8');
        }
    }

    /**
     * Créer un médecin lié à l'hôpital
     */
    public function createMedecin(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
            'specialite_id' => 'required|integer|exists:specialites,id',
            'telephone' => ['required', 'string', new PhoneNumber],
            'adresse' => 'nullable|string',
            'ville' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('medecin');

        MedecinProfile::create([
            'user_id' => $user->id,
            'hopital_id' => $directeur->hopital_id,
            'specialite_id' => $validated['specialite_id'],
            'telephone' => $validated['telephone'],
            'adresse' => $validated['adresse'],
            'ville' => $validated['ville'],
            'description' => $validated['description'],
        ]);

        return response()->json([
            'message' => 'Médecin créé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ], 201);
    }

    /**
     * Créer un gestionnaire lié à l'hôpital
     */
    public function createGestionnaire(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('gestionnaire');

        Gestionnaire::create([
            'user_id' => $user->id,
            'hopital_id' => $directeur->hopital_id,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Gestionnaire créé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ], 201);
    }

    /**
     * Créer un secrétaire lié à l'hôpital
     */
    public function createSecretaire(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole('secretaire');

        Secretaire::create([
            'user_id' => $user->id,
            'hopital_id' => $directeur->hopital_id,
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Secrétaire créé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ], 201);
    }

    /**
     * Récupérer l'hôpital du directeur
     */
    public function getHopital(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $hopital = $directeur->hopital;

        return response()->json([
            'hopital' => [
                'id' => $hopital->id,
                'name' => $hopital->name,
                'adresse' => $hopital->adresse,
                'telephone' => $hopital->telephone,
                'ville' => $hopital->ville,
                'email' => $hopital->email,
                'description' => $hopital->description,
                'created_at' => $hopital->created_at,
            ]
        ]);
    }

    /**
     * Mettre à jour les informations de l'hôpital
     */
    public function updateHopital(Request $request)
    {
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        if (!$directeur) {
            return response()->json([
                'message' => 'Profil directeur non trouvé'
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'adresse' => 'sometimes|nullable|string',
            'telephone' => ['sometimes', 'nullable', 'string', new PhoneNumber],
            'ville' => 'sometimes|nullable|string',
            'email' => 'sometimes|nullable|email',
            'description' => 'sometimes|nullable|string',
        ]);

        $hopital = $directeur->hopital;
        $hopital->update($validated);

        return response()->json([
            'message' => 'Informations de l\'hôpital mises à jour avec succès',
            'hopital' => [
                'id' => $hopital->id,
                'name' => $hopital->name,
                'adresse' => $hopital->adresse,
                'telephone' => $hopital->telephone,
                'ville' => $hopital->ville,
                'email' => $hopital->email,
                'description' => $hopital->description,
            ]
        ]);
    }

    /**
     * Récupérer les données d'un médecin spécifique
     */
    public function showMedecin(Request $request, $id)
    {
        $user = User::with(['roles', 'medecinProfile'])->findOrFail($id);

        // Vérifier que l'utilisateur est bien un médecin de l'hôpital du directeur
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('medecin') || $user->medecinProfile->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'specialite_id' => $user->medecinProfile->specialite_id,
                'telephone' => $user->medecinProfile->telephone,
                'adresse' => $user->medecinProfile->adresse,
                'ville' => $user->medecinProfile->ville,
                'description' => $user->medecinProfile->description,
                'roles' => $user->roles->pluck('name'),
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Récupérer les données d'un gestionnaire spécifique
     */
    public function showGestionnaire(Request $request, $id)
    {
        $user = User::with(['roles', 'gestionnaire'])->findOrFail($id);

        // Vérifier que l'utilisateur est bien un gestionnaire de l'hôpital du directeur
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('gestionnaire') || $user->gestionnaire->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Récupérer les données d'un secrétaire spécifique
     */
    public function showSecretaire(Request $request, $id)
    {
        $user = User::with(['roles', 'secretaire'])->findOrFail($id);

        // Vérifier que l'utilisateur est bien un secrétaire de l'hôpital du directeur
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('secretaire') || $user->secretaire->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Mettre à jour un médecin
     */
    public function updateMedecin(Request $request, $id)
    {
        $user = User::with('medecinProfile')->findOrFail($id);

        // Vérifier l'accès
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('medecin') || $user->medecinProfile->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'specialite_id' => 'sometimes|exists:specialites,id',
            'telephone' => ['sometimes', 'nullable', 'string', new PhoneNumber],
            'adresse' => 'sometimes|nullable|string',
            'ville' => 'sometimes|nullable|string',
            'description' => 'sometimes|nullable|string',
        ]);

        // Mettre à jour l'utilisateur
        $user->update($validated);

        // Mettre à jour le profil médecin
        $user->medecinProfile->update($validated);

        return response()->json([
            'message' => 'Médecin modifié avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }

    /**
     * Mettre à jour un gestionnaire
     */
    public function updateGestionnaire(Request $request, $id)
    {
        $user = User::with('gestionnaire')->findOrFail($id);

        // Vérifier l'accès
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('gestionnaire') || $user->gestionnaire->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ]);

        // Mettre à jour l'utilisateur
        $user->update($validated);

        // Mettre à jour le gestionnaire
        $user->gestionnaire->update($validated);

        return response()->json([
            'message' => 'Gestionnaire modifié avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }

    /**
     * Mettre à jour un secrétaire
     */
    public function updateSecretaire(Request $request, $id)
    {
        $user = User::with('secretaire')->findOrFail($id);

        // Vérifier l'accès
        $directeur = Directeur::where('user_id', $request->user()->id)->first();
        if (!$user->hasRole('secretaire') || $user->secretaire->hopital_id !== $directeur->hopital_id) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ]);

        // Mettre à jour l'utilisateur
        $user->update($validated);

        // Mettre à jour le secrétaire
        $user->secretaire->update($validated);

        return response()->json([
            'message' => 'Secrétaire modifiée avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }

    /**
     * Changer le mot de passe d'un utilisateur
     */
    public function updateUserPassword(Request $request, $userId)
    {
        $user = User::findOrFail($userId);

        // Vérifier que c'est un utilisateur de l'hôpital du directeur
        $directeur = Directeur::where('user_id', $request->user()->id)->first();

        // Récupérer tous les IDs d'utilisateurs de l'hôpital
        $medecinUserIds = MedecinProfile::where('hopital_id', $directeur->hopital_id)->pluck('user_id')->toArray();
        $gestionnaireUserIds = Gestionnaire::where('hopital_id', $directeur->hopital_id)->pluck('user_id')->toArray();
        $secretaireUserIds = Secretaire::where('hopital_id', $directeur->hopital_id)->pluck('user_id')->toArray();
        $directeurUserIds = Directeur::where('hopital_id', $directeur->hopital_id)->pluck('user_id')->toArray();

        $hopitalUserIds = array_unique(array_merge(
            $medecinUserIds,
            $gestionnaireUserIds,
            $secretaireUserIds,
            $directeurUserIds
        ));

        // Vérifier que l'utilisateur fait partie de l'hôpital
        if (!in_array($userId, $hopitalUserIds)) {
            return response()->json([
                'message' => 'Accès refusé'
            ], 403);
        }

        // Valider le mot de passe
        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        // Mettre à jour le mot de passe
        $user->update([
            'password' => Hash::make($validated['password'])
        ]);

        return response()->json([
            'message' => 'Mot de passe modifié avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ]
        ]);
    }
}
