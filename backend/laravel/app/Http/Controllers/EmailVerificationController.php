<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Active le compte à partir du lien reçu par email.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|string|email',
        ], [
            'token.required' => 'Le lien d\'activation est incomplet',
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
        ]);

        $user = User::where('email', $validated['email'])->first();

        // Même réponse pour compte inconnu, token faux ou déjà utilisé
        $tokenValide = $user !== null
            && $user->email_verification_token !== null
            && hash_equals($user->email_verification_token, hash('sha256', $validated['token']));

        if (! $tokenValide) {
            return response()->json([
                'message' => 'Ce lien d\'activation est invalide ou a déjà été utilisé. Si votre compte est déjà activé, connectez-vous.',
            ], 422);
        }

        if ($user->email_verification_expires_at === null || $user->email_verification_expires_at->isPast()) {
            return response()->json([
                'message' => 'Ce lien d\'activation a expiré. Demandez un nouvel email d\'activation.',
                'expired' => true,
            ], 422);
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'email_verification_token' => null,
            'email_verification_expires_at' => null,
        ])->save();

        return response()->json([
            'message' => 'Votre adresse email est vérifiée. Vous pouvez maintenant vous connecter.',
        ]);
    }

    /**
     * Renvoie l'email d'activation, limité à une demande par minute et par adresse.
     */
    public function resend(Request $request, EmailVerificationService $emailVerification): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ], [
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
        ]);

        $email = $validated['email'];

        if ($emailVerification->isRateLimited($email)) {
            return response()->json([
                'message' => 'Un email d\'activation a déjà été envoyé. Veuillez patienter avant d\'en demander un nouveau.',
                'retry_after' => $emailVerification->retryAfter($email),
            ], 429);
        }

        $emailVerification->recordAttempt($email);

        $user = User::where('email', $email)->first();

        // Même réponse que le compte existe ou non, pour ne pas révéler les adresses enregistrées
        if ($user && ! $user->hasVerifiedEmail() && ! $user->isEmailExempt()) {
            $emailVerification->sendActivation($user);
        }

        return response()->json([
            'message' => 'Si un compte non activé existe pour cette adresse, un email d\'activation a été envoyé.',
        ]);
    }
}
