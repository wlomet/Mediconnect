<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\MedecinProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class AdminUserController extends Controller
{
    /**
     * Get all unverified users with pagination
     */
    public function getUnverifiedUsers(Request $request)
    {
        try {
            $draw = intval($request->input('draw', 0));
            $start = intval($request->input('start', 0));
            $length = intval($request->input('length', 10));
            $searchValue = $request->input('search.value', '');
            $sortColumn = intval($request->input('order.0.column', 0));
            $sortDir = strtoupper($request->input('order.0.dir', 'ASC')) === 'DESC' ? 'DESC' : 'ASC';

            // Colonnes disponibles
            $columns = ['id', 'name', 'email', 'phone', 'created_at', 'isVerified'];
            $orderColumnName = isset($columns[$sortColumn]) ? $columns[$sortColumn] : 'created_at';

            // Récupérer les utilisateurs non vérifiés
            $query = User::where('isVerified', 0)->with('roles');

            // Copier pour le filtrage
            $queryFilter = clone $query;

            // Compter les enregistrements totaux non vérifiés
            $recordsTotal = User::where('isVerified', 0)->count();

            // Appliquer le filtrage
            if (!empty($searchValue)) {
                $queryFilter->where(function ($q) use ($searchValue) {
                    $q->where('name', 'like', "%{$searchValue}%")
                      ->orWhere('email', 'like', "%{$searchValue}%")
                      ->orWhere('phone', 'like', "%{$searchValue}%");
                });
            }

            // Compter après filtrage
            $recordsFiltered = $queryFilter->count();

            // Appliquer le tri et la pagination
            $users = $queryFilter
                ->orderBy($orderColumnName, $sortDir)
                ->skip($start)
                ->take($length)
                ->get();

            // Formater les données
            $data = [];
            foreach ($users as $user) {
                $data[] = [
                    'id' => (int)$user->id,
                    'name' => (string)$user->name,
                    'email' => (string)$user->email,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'phone' => (string)($user->phone ?? ''),
                    'role' => isset($user->roles[0]) ? (string)$user->roles[0]->name : 'user',
                    'created_at' => $user->created_at->format('d/m/Y H:i'),
                    'has_document_identite' => !empty($user->document_identite),
                    'has_justificatif_validite' => !empty($user->justificatif_validite),
                ];
            }

            return response()->json([
                'draw' => $draw,
                'recordsTotal' => (int)$recordsTotal,
                'recordsFiltered' => (int)$recordsFiltered,
                'data' => $data,
            ])->header('Content-Type', 'application/json; charset=utf-8');

        } catch (\Exception $e) {
            Log::error('AdminUserController getUnverifiedUsers Error: ' . $e->getMessage());

            return response()->json([
                'draw' => intval($request->input('draw', 0)),
                'recordsTotal' => 0,
                'recordsFiltered' => 0,
                'data' => []
            ], 500);
        }
    }

    /**
     * Get list of unverified users (simple format for frontend)
     */
    public function getUnverifiedUsersList(Request $request)
    {
        try {
            $perPage = $request->input('per_page', 10);
            $page = $request->input('page', 1);
            $search = $request->input('search', '');

            $query = User::where('isVerified', 0)->with('roles');

            if (!empty($search)) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%");
                });
            }

            $users = $query->orderBy('created_at', 'desc')
                ->paginate($perPage, ['*'], 'page', $page);

            return response()->json([
                'data' => collect($users->items())->map(fn (User $user) => array_merge($user->toArray(), [
                    'email_verified' => $user->hasVerifiedEmail(),
                ]))->values(),
                'paginate' => [
                    'total' => $users->total(),
                    'per_page' => $users->perPage(),
                    'current_page' => $users->currentPage(),
                    'last_page' => $users->lastPage(),
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('AdminUserController getUnverifiedUsersList Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la récupération des utilisateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Verify a user
     */
    public function verifyUser($id)
    {
        try {
            $user = User::findOrFail($id);

            if ($user->isVerified == 1) {
                return response()->json([
                    'message' => 'Cet utilisateur est déjà vérifié'
                ], 422);
            }

            DB::beginTransaction();

            // Valider le compte : isVerified et is_active (connexion possible)
            $user->update(['isVerified' => 1, 'is_active' => 1]);

            // Assigner automatiquement le rôle "medecin" à l'utilisateur
            $user->assignRole('medecin');

            // Créer un profil médecin
            $existingProfile = MedecinProfile::where('user_id', $user->id)->first();

            if (!$existingProfile) {
                MedecinProfile::create([
                    'user_id' => $user->id,
                    'hopital_id' => null, // Sera défini plus tard par le médecin ou l'admin
                    'specialite_id' => null, // Sera défini plus tard
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Utilisateur vérifié avec succès',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'isVerified' => $user->isVerified,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('AdminUserController verifyUser Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Utilisateur non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Consulter un document de vérification fourni à l'inscription (type: identite | justificatif)
     */
    public function getDocument($id, $type)
    {
        $column = match ($type) {
            'identite' => 'document_identite',
            'justificatif' => 'justificatif_validite',
            default => abort(404),
        };

        $user = User::findOrFail($id);
        $path = $user->{$column};

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('local');

        abort_unless($path && $disk->exists($path), 404);

        return $disk->response($path);
    }

    /**
     * Reject a user (mark as rejected by setting isVerified to -1)
     */
    public function rejectUser($id)
    {
        try {
            $user = User::findOrFail($id);

            if ($user->isVerified == 1) {
                return response()->json([
                    'message' => 'Cet utilisateur est déjà vérifié, impossible de le rejeter'
                ], 422);
            }

            // Mark as rejected with -1
            $user->update(['isVerified' => -1]);

            return response()->json([
                'message' => 'Utilisateur rejeté avec succès',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'isVerified' => $user->isVerified,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('AdminUserController rejectUser Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Utilisateur non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }
}
