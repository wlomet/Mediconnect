<?php

namespace Tests\Feature\Concerns;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

// Le modèle User n'utilise pas HasApiTokens : l'app authentifie par session (guard web), comme AuthController.
class SessionAuth
{
    public static function actingAs(User $user): void
    {
        Auth::forgetGuards();
        Auth::guard('web')->setUser($user);
    }
}
