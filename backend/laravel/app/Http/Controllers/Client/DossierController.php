<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\ConsultationFactureLigne;
use App\Models\GeneratedDocument;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class DossierController extends Controller
{
    // Consultations des rendez-vous du patient, avec rendez-vous, facture et documents liés.
    public function consultations(Request $request)
    {
        $consultations = Consultation::query()
            ->whereHas('rendezVous', fn ($q) => $q->duClient($request->user()->id))
            ->with([
                'rendezVous.medecin.user',
                'rendezVous.medecin.specialite',
                'rendezVous.medecin.hopital',
                'rendezVous.documents.medecin.user',
                'facture.lignes',
            ])
            ->orderByDesc('started_at')
            ->get()
            ->map(fn (Consultation $c) => $this->formaterConsultation($c))
            ->values();

        return response()->json(['consultations' => $consultations]);
    }

    // Tous les documents archivés (ordonnances, factures) sur les rendez-vous du patient.
    public function documents(Request $request)
    {
        $documents = $this->documentsDuClient($request->user()->id)
            ->with(['medecin.user', 'rendezVous'])
            ->latest()
            ->get()
            ->map(fn (GeneratedDocument $d) => $this->formaterDocument($d) + [
                'rendez_vous' => [
                    'id' => $d->rendezVous->id,
                    'date_debut' => $d->rendezVous->date_debut,
                    'motif' => $d->rendezVous->motif,
                ],
            ])
            ->values();

        return response()->json(['documents' => $documents]);
    }

    // Le téléchargement marque le document comme vu pour ce patient.
    public function downloadDocument(Request $request, int $id)
    {
        $userId = $request->user()->id;

        $document = $this->documentsDuClient($userId)->findOrFail($id);

        abort_unless(Storage::disk('local')->exists($document->chemin), 404);

        $document->vues()->syncWithoutDetaching([$userId => ['vu_at' => now()]]);

        return response(Storage::disk('local')->get($document->chemin), 200, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    // Compteur du tableau de bord : documents du patient jamais consultés.
    public function dashboardStats(Request $request)
    {
        $userId = $request->user()->id;

        $documentsNonVus = $this->documentsDuClient($userId)
            ->whereDoesntHave('vues', fn ($q) => $q->where('users.id', $userId))
            ->count();

        return response()->json(['documents_non_vus' => $documentsNonVus]);
    }

    // Ouverture de la page Mes Documents : tous les documents du patient deviennent vus.
    public function marquerDocumentsVus(Request $request)
    {
        $userId = $request->user()->id;
        $maintenant = now();

        $vues = $this->documentsDuClient($userId)
            ->pluck('id')
            ->map(fn ($documentId) => [
                'user_id' => $userId,
                'generated_document_id' => $documentId,
                'vu_at' => $maintenant,
            ])
            ->all();

        if ($vues !== []) {
            DB::table('generated_document_vues')->insertOrIgnore($vues);
        }

        return response()->noContent();
    }

    private function formaterConsultation(Consultation $c): array
    {
        $rdv = $c->rendezVous;
        $medecin = $rdv->medecin;
        $facture = $c->facture;

        return [
            'id' => $c->id,
            'statut' => $c->statut,
            'started_at' => $c->started_at,
            'heure_debut_reelle' => $c->heure_debut_reelle,
            'ended_at' => $c->ended_at,
            'ordonnance_texte' => $c->ordonnance_texte,
            'rendez_vous' => [
                'id' => $rdv->id,
                'date_debut' => $rdv->date_debut,
                'date_fin' => $rdv->date_fin,
                'motif' => $rdv->motif,
                'statut' => $rdv->statut,
                'notes' => $rdv->notes,
            ],
            'medecin' => $medecin ? [
                'name' => $medecin->user?->name,
                'specialite' => $medecin->specialite?->nom,
                'hopital' => $medecin->hopital ? [
                    'name' => $medecin->hopital->name,
                    'adresse' => $medecin->hopital->adresse,
                    'telephone' => $medecin->hopital->telephone,
                ] : null,
            ] : null,
            'facture' => $facture ? [
                'total' => $facture->total,
                'lignes' => $facture->lignes->map(fn (ConsultationFactureLigne $l) => [
                    'libelle' => $l->libelle,
                    'quantite' => $l->quantite,
                    'prix_unitaire' => $l->prix_unitaire,
                    'total' => $l->total,
                ])->values(),
            ] : null,
            // Le premier document de chaque type est le plus récemment archivé.
            'documents' => $rdv->documents->sortByDesc('id')->map(fn (GeneratedDocument $d) => $this->formaterDocument($d))->values(),
        ];
    }

    private function documentsDuClient(int $userId): Builder
    {
        return GeneratedDocument::query()
            ->whereHas('rendezVous', fn ($q) => $q->duClient($userId));
    }

    private function formaterDocument(GeneratedDocument $d): array
    {
        return [
            'id' => $d->id,
            'type' => $d->type,
            'titre' => $d->titre,
            'taille' => $d->taille,
            'created_at' => $d->created_at,
            'medecin' => $d->medecin?->user?->name,
        ];
    }
}
