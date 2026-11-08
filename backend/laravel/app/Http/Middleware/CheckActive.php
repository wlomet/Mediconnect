<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Models\ImpersonationLog;
use App\Services\ImpersonationService;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckActive
{
    /**
     * Force-logout any authenticated user whose account was deactivated mid-session.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // auth:sanctum resolves to the 'sanctum' RequestGuard (no logout()); the real session lives on the 'web' guard
        $guard = Auth::guard('web');

        if ($guard->check() && !$guard->user()->is_active) {
            app(ImpersonationService::class)->terminer($request, ImpersonationLog::MOTIF_COMPTE_DESACTIVE);
            $guard->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return response()->json([
                'message' => 'Votre compte a été désactivé par un administrateur.',
                'isDisabled' => true
            ], 401);
        }

        return $next($request);
    }
}
