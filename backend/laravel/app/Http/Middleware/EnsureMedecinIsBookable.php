<?php

namespace App\Http\Middleware;

use App\Models\MedecinProfile;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureMedecinIsBookable
{
    /**
     * Bloque toute création de rendez-vous ciblant un médecin masqué (hide),
     * quel que soit le contexte (public, client, secrétaire, gestionnaire, médecin).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $medecinId = $request->input('medecin_id');

        if ($medecinId) {
            $profile = MedecinProfile::with('user')->find($medecinId);

            if ($profile && $profile->user && $profile->user->hide) {
                $estLuiMeme = $request->user()?->medecinProfile?->id === $profile->id;

                return response()->json([
                    'message' => $estLuiMeme
                        ? MedecinProfile::MESSAGE_COMPTE_MASQUE
                        : "Ce médecin n'est plus disponible pour la prise de rendez-vous.",
                ], 403);
            }
        }

        return $next($request);
    }
}
