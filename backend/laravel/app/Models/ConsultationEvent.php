<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConsultationEvent extends Model
{
    protected $fillable = [
        'consultation_id',
        'user_id',
        'type',
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    public function consultation()
    {
        return $this->belongsTo(Consultation::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
