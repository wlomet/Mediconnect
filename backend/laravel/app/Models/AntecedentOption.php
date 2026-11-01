<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AntecedentOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'categorie',
        'code',
        'libelle',
        'est_aucun',
        'actif',
    ];

    protected $casts = [
        'est_aucun' => 'boolean',
        'actif' => 'boolean',
    ];

    public function clients()
    {
        return $this->belongsToMany(User::class, 'client_antecedent_options', 'antecedent_option_id', 'user_id');
    }

    public function scopeActif($query)
    {
        return $query->where('actif', true);
    }
}
