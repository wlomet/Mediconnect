<?php

namespace App\Models;

use App\Exceptions\BusinessException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;

class RendezVous extends Model
{
    use HasFactory;

    public const STATUTS = ['en_attente', 'confirmé', 'annulé', 'terminé'];

    protected $table = 'rendez_vous';

    protected $fillable = [
        'medecin_id',
        'client_id',
        'author_id',
        'confirmed_by',
        'date_debut',
        'date_fin',
        'statut',
        'motif',
        'notes',
        'name',
        'email',
        'phone'
    ];

    protected $casts = [
        'date_debut' => 'datetime',
        'date_fin' => 'datetime',
    ];

    public function medecin()
    {
        return $this->belongsTo(MedecinProfile::class, 'medecin_id');
    }

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function consultation()
    {
        return $this->hasOne(Consultation::class, 'rendez_vous_id');
    }

    public function hasConsultation(): bool
    {
        return $this->consultation()->exists();
    }

    // Refuse la suppression si une consultation est liée (contrôle applicatif + FK restrictOnDelete).
    public function supprimer(): void
    {
        if ($this->hasConsultation()) {
            throw $this->consultationLieeException();
        }

        try {
            $this->delete();
        } catch (QueryException $e) {
            if (($e->errorInfo[1] ?? null) === 1451) {
                throw $this->consultationLieeException();
            }

            throw $e;
        }
    }

    private function consultationLieeException(): BusinessException
    {
        return new BusinessException('Impossible de supprimer ce rendez-vous : une consultation y est liée.', 409);
    }
}
