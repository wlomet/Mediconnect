<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class PhoneNumber implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = preg_replace('/[\s.\-()]/', '', (string) $value);

        if (! preg_match('/^\+[1-9]\d{7,14}$/', $normalized)) {
            $fail('Le numéro de téléphone doit être au format international (ex. +33 6 12 34 56 78).');
        }
    }
}
