<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImpersonationLog extends Model
{
    public const MOTIF_RETOUR_SUPERADMIN = 'retour_superadmin';
    public const MOTIF_COMPTE_DESACTIVE = 'compte_desactive';
    public const MOTIF_DECONNEXION = 'deconnexion';

    protected $table = 'impersonation_logs';

    protected $fillable = [
        'superadmin_id',
        'superadmin_name',
        'superadmin_email',
        'target_user_id',
        'target_name',
        'target_email',
        'target_role',
        'ip_address',
        'user_agent',
        'started_at',
        'ended_at',
        'end_reason',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];
}
