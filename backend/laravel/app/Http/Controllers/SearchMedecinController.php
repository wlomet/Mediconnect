<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Hopital;
use App\Models\MedecinProfile;
use App\Models\Specialite;
use Illuminate\Http\Request;

class SearchMedecinController extends Controller
{
    public function search(Request $request)
    {
        try {
            $query = trim($request->input('query', ''));
            $ville = trim($request->input('ville', ''));

            // ---- Médecins ----
            $medecinQuery = MedecinProfile::with('user', 'specialite', 'hopital');

            if (!empty($query)) {
                $medecinQuery->where(function ($q) use ($query) {
                    $q->where('ville', 'LIKE', "%{$query}%")
                        ->orWhereHas('user', function ($userQuery) use ($query) {
                            $userQuery->where('name', 'LIKE', "%{$query}%");
                        })
                        ->orWhereHas('specialite', function ($specQuery) use ($query) {
                            $specQuery->where('nom', 'LIKE', "%{$query}%");
                        })
                        ->orWhereHas('hopital', function ($hopQuery) use ($query) {
                            $hopQuery->where('name', 'LIKE', "%{$query}%");
                        });
                });
            }

            if (!empty($ville)) {
                $medecinQuery->where(function ($q) use ($ville) {
                    $q->where('ville', 'LIKE', "%{$ville}%")
                        ->orWhereHas('hopital', function ($hopQuery) use ($ville) {
                            $hopQuery->where('ville', 'LIKE', "%{$ville}%");
                        });
                });
            }

            $medecinProfiles = $medecinQuery->limit(20)->get();

            $medecins = $medecinProfiles->map(function ($profile) use ($request) {
                return [
                    'type'            => 'medecin',
                    'id'              => $profile->user->id,
                    'medecin_id'      => $profile->id,
                    'name'            => $profile->user->name,
                    'email'           => $profile->user->email,
                    'specialite'      => $profile->specialite->nom ?? 'Non renseignée',
                    'ville'           => $profile->ville ?? 'Non renseignée',
                    'adresse'         => $profile->adresse ?? '',
                    'telephone'       => $profile->telephone ?? '',
                    'description'     => $profile->description ?? '',
                    'hopital_id'      => $profile->hopital_id,
                    'hopital_nom'     => $profile->hopital ? $profile->hopital->name : null,
                    'hopital_adresse' => $profile->hopital ? $profile->hopital->adresse : null,
                    'hopital_ville'   => $profile->hopital ? $profile->hopital->ville : null,
                    'photo_url'       => $profile->photo_profil
                        ? $request->getSchemeAndHttpHost() . '/api/photo-profile/' . $profile->photo_profil
                        : null,
                ];
            });

            // ---- Hôpitaux ----
            $hopitalQuery = Hopital::withCount('medecins');

            if (!empty($query)) {
                $hopitalQuery->where(function ($q) use ($query) {
                    $q->where('name', 'LIKE', "%{$query}%")
                        ->orWhere('ville', 'LIKE', "%{$query}%")
                        ->orWhere('description', 'LIKE', "%{$query}%")
                        ->orWhereHas('medecins.specialite', function ($specQuery) use ($query) {
                            $specQuery->where('nom', 'LIKE', "%{$query}%");
                        });
                });
            }

            if (!empty($ville)) {
                $hopitalQuery->where('ville', 'LIKE', "%{$ville}%");
            }

            $hopitalModels = $hopitalQuery->limit(10)->get();

            $hopitaux = $hopitalModels->map(function ($hopital) {
                return [
                    'type'           => 'hopital',
                    'id'             => $hopital->id,
                    'name'           => $hopital->name,
                    'ville'          => $hopital->ville,
                    'telephone'      => $hopital->telephone,
                    'email'          => $hopital->email ?? '',
                    'description'    => $hopital->description ?? '',
                    'medecins_count' => $hopital->medecins_count,
                ];
            });

            $results = $medecins->concat($hopitaux)->values();

            return response()->json($results);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Erreur lors de la recherche',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suggestions d'autocomplétion pour la barre de recherche principale
     * (spécialités, médecins, établissements).
     */
    public function suggestions(Request $request)
    {
        $query = trim($request->input('query', ''));

        if (mb_strlen($query) < 1) {
            return response()->json([]);
        }

        $specialites = Specialite::where('nom', 'LIKE', "%{$query}%")
            ->orderBy('nom')
            ->limit(5)
            ->get(['id', 'nom'])
            ->map(function ($specialite) {
                return [
                    'type'  => 'specialite',
                    'id'    => $specialite->id,
                    'label' => $specialite->nom,
                    'meta'  => 'Spécialité',
                ];
            });

        $medecins = MedecinProfile::with('user', 'specialite')
            ->whereHas('user', function ($q) use ($query) {
                $q->where('name', 'LIKE', "%{$query}%");
            })
            ->limit(5)
            ->get()
            ->filter(fn ($profile) => $profile->user)
            ->map(function ($profile) {
                return [
                    'type'  => 'medecin',
                    'id'    => $profile->user->id,
                    'label' => $profile->user->name,
                    'meta'  => $profile->specialite->nom ?? 'Médecin',
                ];
            })
            ->values();

        $hopitaux = Hopital::where('name', 'LIKE', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'ville'])
            ->map(function ($hopital) {
                return [
                    'type'  => 'hopital',
                    'id'    => $hopital->id,
                    'label' => $hopital->name,
                    'meta'  => $hopital->ville ?? 'Établissement',
                ];
            });

        $suggestions = $specialites->concat($medecins)->concat($hopitaux)->values();

        return response()->json($suggestions);
    }

    /**
     * Suggestions de villes pour l'autocomplétion du champ "Où ?".
     */
    public function villes(Request $request)
    {
        $query = trim($request->input('query', ''));

        $medecinVilles = MedecinProfile::whereNotNull('ville')
            ->where('ville', '!=', '')
            ->when($query !== '', function ($q) use ($query) {
                $q->where('ville', 'LIKE', "%{$query}%");
            })
            ->distinct()
            ->pluck('ville');

        $hopitalVilles = Hopital::whereNotNull('ville')
            ->where('ville', '!=', '')
            ->when($query !== '', function ($q) use ($query) {
                $q->where('ville', 'LIKE', "%{$query}%");
            })
            ->distinct()
            ->pluck('ville');

        $villes = $medecinVilles->concat($hopitalVilles)
            ->unique()
            ->sort()
            ->values()
            ->take(8);

        return response()->json($villes);
    }

    public function getHopitalMedecins($id, Request $request)
    {
        try {
            $hopital = Hopital::findOrFail($id);

            $profiles = MedecinProfile::with('user', 'specialite')
                ->where('hopital_id', $hopital->id)
                ->get();

            // Grouper par spécialité
            $grouped = $profiles->groupBy(function ($profile) {
                return $profile->specialite->nom ?? 'Non renseignée';
            });

            $medecinsParSpecialite = $grouped->map(function ($items, $specialite) use ($hopital, $request) {
                return [
                    'specialite' => $specialite,
                    'medecins'   => $items->map(function ($profile) use ($hopital, $request) {
                        return [
                            'id'          => $profile->user->id,
                            'medecin_id'  => $profile->id,
                            'name'        => $profile->user->name,
                            'specialite'  => $profile->specialite->nom ?? 'Non renseignée',
                            'telephone'   => $profile->telephone ?? '',
                            'adresse'     => $profile->adresse ?? '',
                            'description' => $profile->description ?? '',
                            'hopital_id'  => $hopital->id,
                            'photo_url'   => $profile->photo_profil
                                ? $request->getSchemeAndHttpHost() . '/api/photo-profile/' . $profile->photo_profil
                                : null,
                        ];
                    })->values(),
                ];
            })->values();

            return response()->json([
                'hopital' => [
                    'id'          => $hopital->id,
                    'name'        => $hopital->name,
                    'adresse'     => $hopital->adresse,
                    'ville'       => $hopital->ville,
                    'telephone'   => $hopital->telephone,
                    'email'       => $hopital->email ?? '',
                    'description' => $hopital->description ?? '',
                ],
                'medecins_par_specialite' => $medecinsParSpecialite,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error'   => 'Erreur lors du chargement',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
