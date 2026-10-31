<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfImage extends Model
{
    use HasFactory;

    protected $fillable = [
        'medecin_profile_id',
        'hopital_id',
        'nom',
        'chemin',
        'mime',
        'taille',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_profile_id');
    }
}
