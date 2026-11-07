<?php

namespace App\Http\Controllers\Directeur;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Directeur\Concerns\MedecinsAccessibles;
use App\Models\HoraireMedecin;
use App\Models\IndisponibiliteMedecin;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Services\CsvExportService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PlanningController extends Controller
{
    use MedecinsAccessibles;

    /**
     * Liste des médecins de l'hôpital du directeur (même forme que les liaisons secrétaire/gestionnaire)
     */
    public function medecinsHopital(Request $request)
    {
        $medecins = MedecinProfile::whereIn('id', $this->medecinProfileIdsAccessibles($request->user()))
            ->with(['user', 'specialite'])
            ->get()
            ->map(fn (MedecinProfile $profil) => [
                'liaison_id' => null,
                'id' => $profil->user->id,
                'name' => $profil->user->name,
                'email' => $profil->user->email,
                'specialite' => $profil->specialite?->nom ?? 'Non spécifié',
                'telephone' => $profil->telephone ?? '',
                'adresse' => $profil->adresse ?? '',
            ]);

        return response()->json(['medecins' => $medecins]);
    }

    /**
     * Planning d'un médecin de l'hôpital (horaires, indisponibilités, rendez-vous)
     */
    public function getMedecinPlanning(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);
        $medecin = $profil->user;

        return response()->json([
            'medecin' => [
                'id' => $medecin->id,
                'name' => $medecin->name,
                'specialite' => $profil->specialite?->nom ?? 'Non spécifié',
            ],
            'medecin_profile_id' => $profil->id,
            'horaires' => $profil->horaires()->get(),
            'indisponibilites' => $profil->indisponibilites()->get(),
            'rendez_vous' => RendezVous::where('medecin_id', $profil->id)
                ->with(['client'])
                ->orderBy('date_debut', 'asc')
                ->get(),
        ]);
    }

    /**
     * Ajouter un créneau horaire à un médecin de l'hôpital
     */
    public function addHoraire(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $validated = $request->validate([
            'jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
        ]);

        $horaire = HoraireMedecin::create([
            'medecin_id' => $profil->id,
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
     * Remplacer ou créer les horaires réguliers d'un médecin de l'hôpital
     */
    public function updateHoraires(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

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
            $horairesMisAJour[] = HoraireMedecin::updateOrCreate(
                [
                    'medecin_id' => $profil->id,
                    'jour' => $horaireData['jour'],
                    'creneau' => $horaireData['creneau'],
                ],
                [
                    'heure_debut' => $horaireData['heure_debut'],
                    'heure_fin' => $horaireData['heure_fin'],
                    'actif' => $horaireData['actif'] ?? true,
                ]
            );
        }

        return response()->json([
            'message' => 'Horaires mis à jour avec succès',
            'count' => count($horairesMisAJour),
            'horaires' => $horairesMisAJour,
        ]);
    }

    /**
     * Activer ou désactiver un créneau horaire d'un médecin de l'hôpital
     */
    public function toggleHoraire(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $validated = $request->validate([
            'jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'creneau' => 'required|string|in:matin,apres_midi',
            'actif' => 'required|boolean',
        ]);

        $horaire = HoraireMedecin::where('medecin_id', $profil->id)
            ->where('jour', $validated['jour'])
            ->where('creneau', $validated['creneau'])
            ->first();

        if (!$horaire) {
            return response()->json(['message' => 'Horaire non trouvé'], 404);
        }

        $horaire->update(['actif' => $validated['actif']]);

        return response()->json([
            'message' => $validated['actif'] ? 'Créneau activé' : 'Créneau désactivé',
            'horaire' => $horaire,
        ]);
    }

    /**
     * Supprimer un créneau horaire d'un médecin de l'hôpital
     */
    public function deleteHoraire(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $validated = $request->validate([
            'jour' => 'required|string|in:lundi,mardi,mercredi,jeudi,vendredi,samedi,dimanche',
            'creneau' => 'required|string|in:matin,apres_midi',
        ]);

        $supprime = HoraireMedecin::where('medecin_id', $profil->id)
            ->where('jour', $validated['jour'])
            ->where('creneau', $validated['creneau'])
            ->delete();

        if (!$supprime) {
            return response()->json(['message' => 'Horaire non trouvé'], 404);
        }

        return response()->json(['message' => 'Horaire supprimé avec succès']);
    }

    /**
     * Ajouter une indisponibilité à un médecin de l'hôpital (sans chevauchement)
     */
    public function addIndisponibilite(Request $request, $medecinId)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $validated = $request->validate([
            'date_debut' => 'required|date',
            'date_fin' => 'required|date|after_or_equal:date_debut',
            'motif' => 'nullable|string|max:255',
        ]);

        $chevauchement = IndisponibiliteMedecin::where('medecin_id', $profil->id)
            ->where('date_debut', '<=', $validated['date_fin'])
            ->where('date_fin', '>=', $validated['date_debut'])
            ->exists();

        if ($chevauchement) {
            return response()->json([
                'message' => 'Cette période chevauche avec une indisponibilité existante. Veuillez choisir une autre période.'
            ], 422);
        }

        $indisponibilite = IndisponibiliteMedecin::create([
            'medecin_id' => $profil->id,
            'date_debut' => $validated['date_debut'],
            'date_fin' => $validated['date_fin'],
            'motif' => $validated['motif'] ?? '',
        ]);

        return response()->json(['message' => 'Indisponibilité ajoutée', 'data' => $indisponibilite], 201);
    }

    /**
     * Supprimer une indisponibilité d'un médecin de l'hôpital
     */
    public function deleteIndisponibilite(Request $request, $medecinId, $id)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $indisponibilite = IndisponibiliteMedecin::where('medecin_id', $profil->id)->findOrFail($id);
        $indisponibilite->delete();

        return response()->json(['message' => 'Indisponibilité supprimée']);
    }

    /**
     * Export CSV (ou JSON avec format=json) des rendez-vous d'un médecin de l'hôpital entre deux dates (incluses)
     */
    public function exporterRendezVous(Request $request, CsvExportService $csv, $medecinId)
    {
        $filtres = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'timezone' => ['nullable', 'timezone:all'],
        ]);
        $fuseau = $filtres['timezone'] ?? config('app.timezone');

        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $rdvs = RendezVous::where('medecin_id', $profil->id)
            ->whereBetween('date_debut', [
                Carbon::parse($filtres['from'], $fuseau)->startOfDay()->setTimezone(config('app.timezone')),
                Carbon::parse($filtres['to'], $fuseau)->endOfDay()->setTimezone(config('app.timezone')),
            ])
            ->orderBy('date_debut')
            ->get();

        $heure = fn (Carbon $date, string $format) => $date->copy()->setTimezone($fuseau)->format($format);
        $lignes = $rdvs->map(fn (RendezVous $rdv) => [
            $heure($rdv->date_debut, 'd/m/Y'),
            $heure($rdv->date_debut, 'H:i'),
            $heure($rdv->date_fin, 'H:i'),
            $rdv->name,
            $rdv->email,
            $rdv->statut,
        ]);

        $nomBase = "rendez-vous_{$filtres['from']}_{$filtres['to']}";
        $entetes = ['Date', 'Heure début', 'Heure fin', 'Nom', 'Email', 'Statut'];

        if ($request->query('format') === 'json') {
            return response()->json(['nom_base' => $nomBase, 'entetes' => $entetes, 'lignes' => $lignes]);
        }

        return $csv->telecharger("{$nomBase}.csv", $entetes, $lignes);
    }
}
