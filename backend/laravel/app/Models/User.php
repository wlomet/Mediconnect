<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory;
    use Notifiable;
    use HasRoles;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'client_id',
        'isVerified',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    // Méthodes helper pour vérifier les rôles
    public function isAdmin()
    {
        return $this->hasRole('admin');
    }

    public function isMedecin()
    {
        return $this->hasRole('medecin');
    }

    public function isClient()
    {
        return $this->hasRole('client');
    }

    public function isGestionnaire()
    {
        return $this->hasRole('gestionnaire');
    }

    public function isSecretaire()
    {
        return $this->hasRole('secretaire');
    }

    public function isSuperAdmin()
    {
        return $this->hasRole('super-admin');
    }

    // Méthode pour obtenir le rôle principal
    public function getMainRoleAttribute()
    {
        return $this->roles->first()->name ?? 'client';
    }

    public function medecinProfile()
    {
        return $this->hasOne(MedecinProfile::class);
    }

    public function gestionnaire()
    {
        return $this->hasOne(Gestionnaire::class);
    }

    public function secretaire()
    {
        return $this->hasOne(Secretaire::class);
    }

    public function directeur()
    {
        return $this->hasOne(Directeur::class);
    }

    public function isDirecteur()
    {
        return $this->hasRole('directeur');
    }

    /**
     * Rôles nécessitant une ligne de profil dédiée pour fonctionner à la connexion.
     */
    public const PROFILE_REQUIRED_ROLES = ['medecin', 'secretaire', 'gestionnaire', 'directeur'];

    /**
     * Vérifie que la ligne de profil liée au rôle principal existe bien.
     */
    public function hasRequiredProfileRow(): bool
    {
        return match ($this->getMainRoleAttribute()) {
            'medecin' => $this->medecinProfile()->exists(),
            'secretaire' => $this->secretaire()->exists(),
            'gestionnaire' => $this->gestionnaire()->exists(),
            'directeur' => $this->directeur()->exists(),
            default => true,
        };
    }

    /**
     * Boot the model with creating event to auto-generate client_id.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (!$model->client_id) {
                $model->client_id = self::generateUniqueClientId();
            }
        });
    }

    /**
     * Generate a unique 10-character alphanumeric client ID.
     */
    public static function generateUniqueClientId()
    {
        do {
            $clientId = strtoupper(substr(bin2hex(random_bytes(5)), 0, 10));
        } while (self::where('client_id', $clientId)->exists());

        return $clientId;
    }
}
