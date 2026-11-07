<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    public const EN_COURS = 'en_cours';
    public const EN_ATTENTE = 'en_attente';
    public const ABANDONNEE = 'abandonnee';
    public const TERMINEE = 'terminee';

    public const MAX_EN_ATTENTE = 2;

    public const GENEREE = 'generee';
    public const NON_GENEREE = 'non_generee';

    protected $fillable = [
        'medecin_profile_id',
        'rendez_vous_id',
        'statut',
        'started_at',
        'heure_debut_reelle',
        'ended_at',
        'abandoned_at',
        'abandon_motif',
        'paused_at',
        'ordonnance_texte',
        'ordonnance_commentaire',
        'ordonnance_non_generee',
        'facture_non_generee',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'heure_debut_reelle' => 'datetime',
        'ended_at' => 'datetime',
        'abandoned_at' => 'datetime',
        'paused_at' => 'datetime',
        'ordonnance_non_generee' => 'boolean',
        'facture_non_generee' => 'boolean',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_profile_id');
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }

    public function events()
    {
        return $this->hasMany(ConsultationEvent::class)->orderBy('id');
    }

    public function facture()
    {
        return $this->hasOne(ConsultationFacture::class);
    }

    public function ordonnanceLignes()
    {
        return $this->hasMany(ConsultationOrdonnanceLigne::class)->orderBy('position');
    }

    public function documents()
    {
        return $this->hasMany(GeneratedDocument::class);
    }

    // Null tant que le médecin n'a ni rédigé ni déclaré l'absence d'ordonnance.
    public function decisionOrdonnance(): ?string
    {
        if ($this->ordonnance_non_generee) {
            return self::NON_GENEREE;
        }

        return $this->ordonnance_texte !== null ? self::GENEREE : null;
    }

    // Null tant que le médecin n'a ni établi ni déclaré l'absence de facture.
    public function decisionFacture(): ?string
    {
        if ($this->facture_non_generee) {
            return self::NON_GENEREE;
        }

        return $this->facture?->lignes->isNotEmpty() ? self::GENEREE : null;
    }
}
