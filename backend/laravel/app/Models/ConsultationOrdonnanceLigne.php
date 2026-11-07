<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationOrdonnanceLigne extends Model
{
    // Même liste côté front (PRISE_OPTIONS dans consultationFormat.js).
    public const PRISES = [
        '1_fois_par_jour' => '1 fois par jour',
        '2_fois_par_jour' => '2 fois par jour',
        '3_fois_par_jour' => '3 fois par jour',
        '4_fois_par_jour' => '4 fois par jour',
        'matin' => 'Le matin',
        'midi' => 'Le midi',
        'soir' => 'Le soir',
        'matin_et_soir' => 'Matin et soir',
        'au_coucher' => 'Au coucher',
        'si_besoin' => 'Si besoin',
    ];

    protected $fillable = [
        'consultation_id',
        'libelle',
        'quantite',
        'prise',
        'position',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function texte(): string
    {
        return "{$this->libelle} (qté {$this->quantite}) - ".self::PRISES[$this->prise];
    }
}
