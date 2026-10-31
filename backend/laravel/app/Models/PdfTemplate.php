<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PdfTemplate extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $fillable = [
        'medecin_profile_id',
        'hopital_id',
        'nom',
        'type',
        'format',
        'layout',
    ];

    protected $casts = [
        'layout' => 'array',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_profile_id');
    }
}
