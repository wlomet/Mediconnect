<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedecinProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'hopital_id',
        'specialite_id',
        'description',
        'adresse',
        'ville',
        'telephone',
        'photo_profil',
    ];

    // Relation avec l'utilisateur
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Relation avec l'hôpital
    public function hopital()
    {
        return $this->belongsTo(Hopital::class);
    }

    // Relation avec la spécialité
    public function specialite()
    {
        return $this->belongsTo(Specialite::class);
    }

    // Relations pour le planning et les rendez-vous
    public function horaires()
    {
        return $this->hasMany(HoraireMedecin::class, 'medecin_id');
    }

    public function indisponibilites()
    {
        return $this->hasMany(IndisponibiliteMedecin::class, 'medecin_id');
    }

    public function rendezVous()
    {
        return $this->hasMany(RendezVous::class, 'medecin_id');
    }

    public function consultations()
    {
        return $this->hasMany(Consultation::class, 'medecin_profile_id');
    }

    // Helper pour obtenir le nom de la spécialité
    public function getSpecialiteNomAttribute()
    {
        return $this->specialite ? $this->specialite->nom : null;
    }

    // Accesseur pour le slug de la spécialité
    public function getSpecialiteSlugAttribute()
    {
        return $this->specialite ? $this->specialite->slug : null;
    }

    // Ajouter les accesseurs à l'array du modèle
    protected $appends = ['specialite_nom', 'specialite_slug'];
}
