<?php

namespace App\Exceptions;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class BusinessException extends RuntimeException
{
    /** @param array<string, mixed> $extra */
    public function __construct(string $message, private int $status = 422, private array $extra = [])
    {
        parent::__construct($message);
    }

    public function render(Request $request): JsonResponse
    {
        return response()->json(['message' => $this->getMessage(), ...$this->extra], $this->status);
    }
}
