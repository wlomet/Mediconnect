<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\MailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Throwable;

class PasswordResetController extends Controller
{
    /**
     * Envoie un lien de réinitialisation par email, uniquement si le compte existe.
     */
    public function forgotPassword(Request $request, MailService $mail): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
        ], [
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
        ]);

        // Même réponse que le compte existe ou non, pour ne pas révéler les adresses enregistrées
        Password::broker()->sendResetLink(
            ['email' => $validated['email']],
            fn(User $user, string $token) => $this->sendResetEmail($mail, $user, $token)
        );

        return response()->json([
            'message' => 'Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.',
        ]);
    }

    /**
     * Change le mot de passe à partir du token reçu par email.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => 'required|string',
            'email' => 'required|string|email',
            'password' => 'required|string|min:6|confirmed',
        ], [
            'token.required' => 'Le lien de réinitialisation est incomplet',
            'email.required' => 'L\'adresse email est requise',
            'email.email' => 'L\'adresse email n\'est pas valide',
            'password.required' => 'Le mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 6 caractères',
            'password.confirmed' => 'Les mots de passe ne correspondent pas',
        ]);

        $status = Password::broker()->reset(
            [
                'token' => $validated['token'],
                'email' => $validated['email'],
                'password' => $validated['password'],
            ],
            function (User $user, string $password) {
                $user->forceFill(['password' => Hash::make($password)])
                    ->setRememberToken(Str::random(60));

                $user->save();
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Ce lien de réinitialisation est invalide ou a expiré.',
            ], 422);
        }

        return response()->json([
            'message' => 'Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.',
        ]);
    }

    /**
     * Envoie l'email de réinitialisation via MailService, sans faire échouer la requête.
     */
    private function sendResetEmail(MailService $mail, User $user, string $token): void
    {
        $expire = config('auth.passwords.users.expire');
        $url = rtrim(config('app.frontend_url'), '/') . '/reinitialiser-mot-de-passe?' . http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]);

        try {
            $mail->send(
                to: $user->email,
                subject: 'MediConnect : réinitialisation de votre mot de passe',
                options: [
                    'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                    'html' => view('emails.reset-password', [
                        'name' => $user->name,
                        'url' => $url,
                        'expire' => $expire,
                    ])->render(),
                    'text' => "Bonjour {$user->name},\n\nPour réinitialiser votre mot de passe MediConnect, ouvrez ce lien (valable {$expire} minutes) :\n{$url}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
                ],
            );
        } catch (Throwable $e) {
            Log::error('Échec de l\'envoi de l\'email de réinitialisation : ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);
        }
    }
}
