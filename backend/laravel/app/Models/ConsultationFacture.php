<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationFacture extends Model
{
    protected $fillable = [
        'consultation_id',
        'total',
    ];

    protected $casts = [
        'total' => 'decimal:2',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function lignes()
    {
        return $this->hasMany(ConsultationFactureLigne::class, 'consultation_facture_id')->orderBy('position');
    }
}
