<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PdfImage extends Model
{
    use HasFactory;

    public const TYPE_LOGO = 'logo';
    public const TYPE_IMAGE = 'image';

    protected $fillable = [
        'medecin_profile_id',
        'hopital_id',
        'nom',
        'type',
        'chemin',
        'mime',
        'taille',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_profile_id');
    }
}
