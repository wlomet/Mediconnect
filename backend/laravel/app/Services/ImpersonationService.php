<?php

namespace App\Services;

use App\Models\ImpersonationLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class ImpersonationService
{
    public const SESSION_SUPERADMIN = 'impersonator_id';
    public const SESSION_LOG = 'impersonation_log_id';
    public const CANAL_LOG = 'impersonation';

    public function __construct(private ConnexionService $connexion)
    {
    }

    /**
     * Motif de refus pour une cible, ou null si elle peut être impersonnée.
     */
    public function motifRefus(User $cible): ?string
    {
        if ($cible->hasAnyRole(['super-admin', 'admin'])) {
            return 'Impossible de se connecter à un compte administrateur.';
        }

        return $this->connexion->motifRefus($cible)['message'] ?? null;
    }

    public function demarrer(User $superAdmin, User $cible, Request $request): void
    {
        $log = ImpersonationLog::create([
            'superadmin_id' => $superAdmin->id,
            'superadmin_name' => $superAdmin->name,
            'superadmin_email' => $superAdmin->email,
            'target_user_id' => $cible->id,
            'target_name' => $cible->name,
            'target_email' => $cible->email,
            'target_role' => $cible->getMainRoleAttribute(),
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 255),
            'started_at' => now(),
        ]);

        Auth::guard('web')->loginUsingId($cible->id);
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_SUPERADMIN, $superAdmin->id);
        $request->session()->put(self::SESSION_LOG, $log->id);

        $this->journaliser('Impersonation démarrée', $log);
    }

    /**
     * Restaure le superadmin à la déconnexion. Renvoie null si aucune impersonation
     * n'est active ou si le superadmin n'est plus valide (la déconnexion est alors complète).
     */
    public function quitter(Request $request): ?User
    {
        $superAdminId = $request->session()->get(self::SESSION_SUPERADMIN);

        if (!$superAdminId) {
            return null;
        }

        $superAdmin = User::find($superAdminId);
        $valide = $superAdmin !== null && $superAdmin->is_active && $superAdmin->hasRole('super-admin');

        $this->terminer($request, $valide ? ImpersonationLog::MOTIF_RETOUR_SUPERADMIN : ImpersonationLog::MOTIF_DECONNEXION);

        if (!$valide) {
            return null;
        }

        Auth::guard('web')->loginUsingId($superAdmin->id);
        $request->session()->regenerate();

        return $superAdmin;
    }

    public function terminer(Request $request, string $motif): void
    {
        $logId = $request->session()->pull(self::SESSION_LOG);
        $request->session()->forget(self::SESSION_SUPERADMIN);

        $log = $logId ? ImpersonationLog::find($logId) : null;

        if ($log === null) {
            return;
        }

        $log->update(['ended_at' => now(), 'end_reason' => $motif]);

        $this->journaliser('Impersonation terminée', $log);
    }

    /**
     * Superadmin qui a lancé l'impersonation en cours, pour la bannière.
     */
    public function impersonateur(Request $request): ?array
    {
        $superAdminId = $request->session()->get(self::SESSION_SUPERADMIN);

        if (!$superAdminId) {
            return null;
        }

        $superAdmin = User::find($superAdminId);

        return $superAdmin ? ['id' => $superAdmin->id, 'name' => $superAdmin->name] : null;
    }

    private function journaliser(string $message, ImpersonationLog $log): void
    {
        Log::channel(self::CANAL_LOG)->info($message, [
            'impersonation_id' => $log->id,
            'superadmin_id' => $log->superadmin_id,
            'superadmin_email' => $log->superadmin_email,
            'target_user_id' => $log->target_user_id,
            'target_email' => $log->target_email,
            'target_role' => $log->target_role,
            'ip' => $log->ip_address,
            'end_reason' => $log->end_reason,
        ]);
    }
}
