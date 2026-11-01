<?php

namespace App\Services;

use App\Models\Consultation;
use App\Models\ConsultationFactureLigne;
use App\Models\GeneratedDocument;

class ClientConsultationFormatter
{
    // Consultation telle qu'affichée au patient : rendez-vous, facture et documents.
    public function formater(Consultation $c): array
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

    public function formaterDocument(GeneratedDocument $d): array
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
