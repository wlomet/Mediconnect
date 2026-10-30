<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\InactivityService;
use Illuminate\Http\JsonResponse;

class InactivityController extends Controller
{
    public function index(InactivityService $inactivity): JsonResponse
    {
        $items = $inactivity->atRisk()->map(fn(array $row) => [
            'type' => $row['type'],
            'id' => $row['id'],
            'label' => $row['label'],
            'last_activity' => $row['last_activity']->toDateString(),
            'deadline' => $row['deadline']->toDateString(),
            'overdue' => $row['overdue'],
        ])->values();

        return response()->json(['items' => $items]);
    }
}
