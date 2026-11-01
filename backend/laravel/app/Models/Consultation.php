<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Consultation extends Model
{
    public const EN_COURS = 'en_cours';
    public const ABANDONNEE = 'abandonnee';
    public const TERMINEE = 'terminee';

    protected $fillable = [
        'medecin_profile_id',
        'rendez_vous_id',
        'statut',
        'started_at',
        'heure_debut_reelle',
        'ended_at',
        'abandoned_at',
        'abandon_motif',
        'ordonnance_texte',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'heure_debut_reelle' => 'datetime',
        'ended_at' => 'datetime',
        'abandoned_at' => 'datetime',
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

    public function documents()
    {
        return $this->hasMany(GeneratedDocument::class);
    }
}
