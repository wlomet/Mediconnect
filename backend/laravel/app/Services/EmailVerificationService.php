<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Throwable;

class EmailVerificationService
{
    private const DELAI_SECONDES = 60;

    public function __construct(private MailService $mail)
    {
    }

    public function isRateLimited(string $email): bool
    {
        return RateLimiter::tooManyAttempts($this->limiterKey($email), 1);
    }

    public function retryAfter(string $email): int
    {
        return RateLimiter::availableIn($this->limiterKey($email));
    }

    // Par adresse, qu'un compte existe ou non, pour ne pas révéler les comptes enregistrés
    public function recordAttempt(string $email): void
    {
        RateLimiter::hit($this->limiterKey($email), self::DELAI_SECONDES);
    }

    public function sendActivation(User $user): void
    {
        $token = $user->issueEmailVerificationToken();
        $url = rtrim(config('app.frontend_url'), '/') . '/verifier-email?' . http_build_query([
            'token' => $token,
            'email' => $user->email,
        ]);
        $suite = $user->isMedecin() ? 'Votre compte médecin sera ensuite validé par un administrateur.' : '';

        try {
            $this->mail->send(
                to: $user->email,
                subject: 'MediConnect : activez votre compte',
                options: [
                    'sender' => ['email' => 'noreply@medi-connect.info', 'name' => 'MediConnect'],
                    'html' => view('emails.verify-email', [
                        'name' => $user->name,
                        'url' => $url,
                        'suite' => $suite,
                    ])->render(),
                    'text' => "Bonjour {$user->name},\n\nPour activer votre compte MediConnect, ouvrez ce lien (valable 24 heures) :\n{$url}\n\n{$suite}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez ce message.",
                ],
            );
        } catch (Throwable $e) {
            Log::error('Échec de l\'envoi de l\'email d\'activation : ' . $e->getMessage(), [
                'user_id' => $user->id,
            ]);
        }
    }

    private function limiterKey(string $email): string
    {
        return 'email-verification:' . mb_strtolower($email);
    }
}
