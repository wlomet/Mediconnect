<?php

namespace App\Http\Controllers\Gestionnaire;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Gestionnaire\Concerns\MedecinsAccessibles;
use App\Services\ConsultationListeService;
use App\Services\CsvExportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultationController extends Controller
{
    use MedecinsAccessibles;

    // Tableau DataTables (AJAX) des consultations des médecins accessibles
    public function datatable(Request $request, ConsultationListeService $liste): JsonResponse
    {
        $donnees = $request->validate(ConsultationListeService::REGLES);

        return response()->json($liste->tableau($this->profilIds($request, $donnees), $donnees));
    }

    // Export CSV, ou JSON (format=json) pour l'Excel et le PDF générés côté front
    public function export(Request $request, ConsultationListeService $liste, CsvExportService $csv)
    {
        $donnees = $request->validate(ConsultationListeService::REGLES);
        $export = $liste->export($this->profilIds($request, $donnees), $donnees);

        if ($request->query('format') === 'json') {
            return response()->json($export);
        }

        return $csv->telecharger("{$export['nom_base']}.csv", $export['entetes'], $export['lignes']);
    }

    // Le médecin choisi (s'il est accessible), sinon tous les médecins accessibles
    private function profilIds(Request $request, array $donnees): array
    {
        if (isset($donnees['medecin_id'])) {
            return [$this->profilMedecinAccessible($request->user(), (int) $donnees['medecin_id'])->id];
        }

        return $this->medecinProfileIdsAccessibles($request->user());
    }
}
