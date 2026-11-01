<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GeneratedDocument extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'medecin_profile_id',
        'rendez_vous_id',
        'consultation_id',
        'pdf_template_id',
        'type',
        'titre',
        'chemin',
        'donnees',
        'taille',
    ];

    protected $casts = [
        'donnees' => 'array',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_profile_id');
    }

    public function rendezVous()
    {
        return $this->belongsTo(RendezVous::class, 'rendez_vous_id');
    }

    public function template()
    {
        return $this->belongsTo(PdfTemplate::class, 'pdf_template_id');
    }

    public function consultation()
    {
        return $this->belongsTo(Consultation::class, 'consultation_id');
    }

    // Clients ayant consulté le document ; absent de la table = non vu.
    public function vues()
    {
        return $this->belongsToMany(User::class, 'generated_document_vues')->withPivot('vu_at');
    }
}
