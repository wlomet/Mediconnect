<?php

namespace App\Http\Controllers\Secretaire;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Secretaire\Concerns\MedecinsAccessibles;
use App\Models\HoraireMedecin;
use App\Models\IndisponibiliteMedecin;
use App\Models\RendezVous;
use App\Services\CsvExportService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class PlanningController extends Controller
{
    use MedecinsAccessibles;

    /**
     * Export CSV (ou JSON avec format=json) des rendez-vous d'un médecin accessible entre deux dates (incluses)
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

    /**
     * Activer ou désactiver un créneau horaire d'un médecin accessible
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
     * Supprimer un créneau horaire d'un médecin accessible
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
     * Supprimer une indisponibilité d'un médecin accessible
     */
    public function deleteIndisponibilite(Request $request, $medecinId, $id)
    {
        $profil = $this->profilMedecinAccessible($request->user(), (int) $medecinId);

        $indisponibilite = IndisponibiliteMedecin::where('medecin_id', $profil->id)->findOrFail($id);
        $indisponibilite->delete();

        return response()->json(['message' => 'Indisponibilité supprimée']);
    }
}
