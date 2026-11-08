<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ImpersonationLog;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);
        $perPage = min(max((int) $request->input('per_page', 25), 1), 100);

        $logs = ImpersonationLog::query()
            ->orderByDesc('started_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'impersonations' => collect($logs->items())->map(fn (ImpersonationLog $log) => [
                'id' => $log->id,
                'started_at' => $log->started_at,
                'ended_at' => $log->ended_at,
                'end_reason' => $log->end_reason,
                'superadmin' => [
                    'id' => $log->superadmin_id,
                    'name' => $log->superadmin_name,
                    'email' => $log->superadmin_email,
                ],
                'target' => [
                    'id' => $log->target_user_id,
                    'name' => $log->target_name,
                    'email' => $log->target_email,
                    'role' => $log->target_role,
                ],
                'ip_address' => $log->ip_address,
            ])->values(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
