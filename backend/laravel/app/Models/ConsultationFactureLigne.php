<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationFactureLigne extends Model
{
    protected $fillable = [
        'consultation_facture_id',
        'libelle',
        'quantite',
        'prix_unitaire',
        'total',
        'position',
    ];

    protected $casts = [
        'quantite' => 'decimal:2',
        'prix_unitaire' => 'decimal:2',
        'total' => 'decimal:2',
    ];

    public function facture()
    {
        return $this->belongsTo(ConsultationFacture::class, 'consultation_facture_id');
    }
}
