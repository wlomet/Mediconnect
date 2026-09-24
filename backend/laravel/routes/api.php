<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ProfileCompletionController;
use App\Http\Controllers\MedecinProfileController;
use App\Http\Controllers\SpecialiteController;
use App\Http\Controllers\MedecinPlanningController;
use App\Http\Controllers\SearchMedecinController;
// Directeur Controllers
use App\Http\Controllers\Directeur\DirecteurRequestController;
use App\Http\Controllers\Directeur\DirecteurController;
use App\Http\Controllers\Directeur\HopitalController;
// Controllers par rôle
use App\Http\Controllers\Client\RendezVousController as ClientRendezVousController;
use App\Http\Controllers\Client\SearchController as ClientSearchController;
use App\Http\Controllers\Client\ProfileController as ClientProfileController;
use App\Http\Controllers\Medecin\RendezVousController as MedecinRendezVousController;
use App\Http\Controllers\Medecin\LiaisonController as MedecinLiaisonController;
use App\Http\Controllers\Medecin\ProfileController as MedecinProfileControllerNamespace;
use App\Http\Controllers\Secretaire\RendezVousController as SecretaireRendezVousController;
use App\Http\Controllers\Secretaire\LiaisonController as SecretaireLiaisonController;
use App\Http\Controllers\Secretaire\DashboardController as SecretaireDashboardController;
use App\Http\Controllers\Gestionnaire\RendezVousController as GestionnaireRendezVousController;
use App\Http\Controllers\Gestionnaire\LiaisonController as GestionnaireLiaisonController;
use App\Http\Controllers\Gestionnaire\DashboardController as GestionnaireDashboardController;
use App\Http\Controllers\SuperAdmin\UserController as SuperAdminUserController;
use App\Http\Controllers\SuperAdmin\RoleController as SuperAdminRoleController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\UserCreationController as SuperAdminUserCreationController;
use App\Http\Controllers\SuperAdminController;
// Admin Controllers
use App\Http\Controllers\Admin\AdminUserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Structured API routes organized by role for better separation of concerns.
| All protected routes require 'auth:sanctum' middleware and appropriate role.
|
*/

// ============================================
// PUBLIC ROUTES - Non-authenticated
// ============================================

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);

Route::get('/test', function () {
    return response()->json(['message' => 'API fonctionne !']);
});

// Public search routes
Route::get('/search/medecins', [SearchMedecinController::class, 'search']);
Route::get('/hopital/{id}/medecins', [SearchMedecinController::class, 'getHopitalMedecins']);
Route::get('/specialites', [ClientSearchController::class, 'getSpecialites']);
Route::get('/medecin/planningbyid/{id}', [MedecinPlanningController::class, 'getPlanningById']);

// Servir les photos de profil (stockées dans storage/photo-profile/)
Route::get('/photo-profile/{filename}', function (string $filename) {
    if ($filename !== basename($filename)) {
        abort(404);
    }
    $path = storage_path('photo-profile/' . $filename);
    if (!file_exists($path)) {
        abort(404);
    }
    return response()->file($path, ['Cache-Control' => 'public, max-age=86400']);
})->where('filename', '[a-zA-Z0-9_\.\-]+');

// Routes pour les demandes de directeur
Route::post('/demande-directeur', [DirecteurRequestController::class, 'store']);

// Route pour créer un rendez-vous (accessible à tous: connectés ou non)
Route::post('/rendezvous', [ClientRendezVousController::class, 'store']);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    // Shared resources for authenticated users
    Route::get('/profile-completion/status', [ProfileCompletionController::class, 'status']);
    Route::post('/profile-completion', [ProfileCompletionController::class, 'store']);
    Route::get('/medecin/profile', [MedecinProfileController::class, 'show']);
    Route::put('/medecin/profile', [MedecinProfileController::class, 'update']);
    Route::get('/medecin/planning', [MedecinPlanningController::class, 'getPlanning']);
    Route::get('/medecin/horaires', [MedecinPlanningController::class, 'getHoraires']);
    Route::put('/medecin/horaires', [MedecinPlanningController::class, 'updateHoraires']);
    Route::patch('/medecin/horaires/toggle', [MedecinPlanningController::class, 'toggleHoraire']);
    Route::delete('/medecin/horaires', [MedecinPlanningController::class, 'deleteHoraire']);
    Route::post('/medecin/indisponibilites', [MedecinPlanningController::class, 'addIndisponibilite']);
    Route::delete('/medecin/indisponibilites/{id}', [MedecinPlanningController::class, 'deleteIndisponibilite']);


    // ============================================
    // CLIENT ROUTES
    // ============================================
    Route::middleware('role:client')->prefix('client')->name('client.')->group(function () {
        // Profile
        Route::get('/profile', [ClientProfileController::class, 'show']);
        Route::put('/profile', [ClientProfileController::class, 'update']);

        // Rendez-vous
        Route::post('/rendez-vous', [ClientRendezVousController::class, 'store']);
        Route::get('/rendez-vous/{id}', [ClientRendezVousController::class, 'show']);
        Route::get('/rendez-vous', [ClientRendezVousController::class, 'getMyRendezVous']);
        Route::patch('/rendez-vous/{id}/cancel', [ClientRendezVousController::class, 'cancel']);
    });

    // ============================================
    // MEDECIN ROUTES
    // ============================================
    Route::middleware('role:medecin')->prefix('medecin')->name('medecin.')->group(function () {
        // Profile
        Route::get('/profile', [MedecinProfileControllerNamespace::class, 'show']);
        Route::put('/profile', [MedecinProfileControllerNamespace::class, 'update']);
        Route::post('/profile/photo', [MedecinProfileControllerNamespace::class, 'uploadPhoto']);

        // Rendez-vous Management
        Route::get('/rendez-vous', [MedecinRendezVousController::class, 'getAll']);
        Route::get('/rendez-vous/today', [MedecinRendezVousController::class, 'getToday']);
        Route::get('/rendez-vous/month', [MedecinRendezVousController::class, 'getThisMonth']);
        Route::get('/rendez-vous/{id}', [MedecinRendezVousController::class, 'show']);
        Route::put('/rendez-vous/{id}', [MedecinRendezVousController::class, 'update']);
        Route::post('/rendez-vous', [ClientRendezVousController::class, 'store']);
        Route::delete('/rendez-vous/{id}', [MedecinRendezVousController::class, 'destroy']);



        // Liaisons with Secrétaires
        Route::prefix('liaisons-secretaire')->name('liaisons.')->group(function () {
            Route::get('/demandes', [MedecinLiaisonController::class, 'getSecretaireRequests']);
            Route::patch('/{id}/accepter', [MedecinLiaisonController::class, 'acceptSecretaire']);
            Route::patch('/{id}/refuser', [MedecinLiaisonController::class, 'refuseSecretaire']);
            Route::get('/', [MedecinLiaisonController::class, 'getMySecretaires']);
            Route::get('/all', [MedecinLiaisonController::class, 'getAllSecretaires']);
            Route::delete('/{id}', [MedecinLiaisonController::class, 'deleteSecretaire']);
        });

        // Create Secrétaire (separate from liaisons prefix)
        Route::post('/secretaires/create', [MedecinLiaisonController::class, 'createSecretaire']);

        // Liaisons with Gestionnaires
        Route::prefix('liaisons-gestionnaires')->name('liaisons-gestionnaires.')->group(function () {
            Route::get('/demandes', [MedecinLiaisonController::class, 'getGestionnaireRequests']);
            Route::patch('/{id}/accepter', [MedecinLiaisonController::class, 'acceptGestionnaire']);
            Route::patch('/{id}/refuser', [MedecinLiaisonController::class, 'refuseGestionnaire']);
            Route::get('/', [MedecinLiaisonController::class, 'getAllGestionnaires']);
            Route::get('/mes-gestionnaires', [MedecinLiaisonController::class, 'getMyGestionnaires']);
            Route::delete('/{id}', [MedecinLiaisonController::class, 'deleteGestionnaire']);
        });
    });

    // ============================================
    // SECRETAIRE ROUTES
    // ============================================
    Route::middleware('role:secretaire')->prefix('secretaire')->name('secretaire.')->group(function () {
        // Dashboard
        Route::get('/dashboard', [SecretaireDashboardController::class, 'show']);
        Route::get('/profile', [SecretaireDashboardController::class, 'getProfile']);
        Route::get('/medecins/all', [SecretaireDashboardController::class, 'getAllMedecins']);
        Route::get('/patients', [SecretaireDashboardController::class, 'getPatients']);

        // Rendez-vous Management
        Route::prefix('rendez-vous')->name('rendez-vous.')->group(function () {
            Route::get('/today', [SecretaireRendezVousController::class, 'getTodayRendezVous']);
            Route::get('/{id}', [SecretaireRendezVousController::class, 'show']);
            Route::post('/', [SecretaireRendezVousController::class, 'store']);
            Route::put('/{id}', [SecretaireRendezVousController::class, 'update']);
            Route::delete('/{id}', [SecretaireRendezVousController::class, 'destroy']);
            Route::get('/medecin/{medecinId}', [SecretaireRendezVousController::class, 'getMedecinRendezVous']);
            Route::patch('/{id}/cancel', [SecretaireRendezVousController::class, 'cancel']);
        });

        // Médecins Management
        Route::prefix('medecins')->name('medecins.')->group(function () {
            Route::get('/{medecinId}/planning', [SecretaireDashboardController::class, 'getMedecinPlanning']);
            Route::get('/{medecinId}/profile', [SecretaireDashboardController::class, 'getMedecinProfile']);
            Route::post('/{medecinId}/horaires', [SecretaireDashboardController::class, 'addHoraire']);
            Route::put('/{medecinId}/horaires', [SecretaireDashboardController::class, 'updateHoraires']);
            Route::post('/{medecinId}/indisponibilites', [SecretaireDashboardController::class, 'addIndisponibilite']);
        });

        // Liaisons with Médecins
        Route::prefix('liaisons')->name('liaisons.')->group(function () {
            Route::post('/', [SecretaireLiaisonController::class, 'sendRequest']);
            Route::get('/', [SecretaireLiaisonController::class, 'getAll']);
            Route::get('/medecins', [SecretaireLiaisonController::class, 'getLinked']);
            Route::delete('/{id}', [SecretaireLiaisonController::class, 'cancel']);
        });
    });

    // ============================================
    // GESTIONNAIRE ROUTES
    // ============================================
    Route::middleware('role:gestionnaire')->prefix('gestionnaire')->name('gestionnaire.')->group(function () {
        // Dashboard
        Route::get('/dashboard', [GestionnaireDashboardController::class, 'show']);
        Route::get('/profile', [GestionnaireDashboardController::class, 'getProfile']);
        Route::get('/medecins/all', [GestionnaireDashboardController::class, 'getAllMedecins']);
        Route::get('/patients', [GestionnaireDashboardController::class, 'getPatients']);

        // Rendez-vous Management
        Route::prefix('rendez-vous')->name('rendez-vous.')->group(function () {
            Route::get('/today', [GestionnaireRendezVousController::class, 'getTodayRendezVous']);
            Route::get('/{id}', [GestionnaireRendezVousController::class, 'show']);
            Route::post('/', [GestionnaireRendezVousController::class, 'store']);
            Route::put('/{id}', [GestionnaireRendezVousController::class, 'update']);
            Route::delete('/{id}', [GestionnaireRendezVousController::class, 'destroy']);
            Route::get('/medecin/{medecinId}', [GestionnaireRendezVousController::class, 'getMedecinRendezVous']);
            Route::patch('/{id}/cancel', [GestionnaireRendezVousController::class, 'cancel']);
        });

        // Médecins Management
        Route::prefix('medecins')->name('medecins.')->group(function () {
            Route::get('/{medecinId}/planning', [GestionnaireDashboardController::class, 'getMedecinPlanning']);
            Route::get('/{medecinId}/profile', [GestionnaireDashboardController::class, 'getMedecinProfile']);
            Route::post('/{medecinId}/horaires', [GestionnaireDashboardController::class, 'addHoraire']);
            Route::put('/{medecinId}/horaires', [GestionnaireDashboardController::class, 'updateHoraires']);
            Route::post('/{medecinId}/indisponibilites', [GestionnaireDashboardController::class, 'addIndisponibilite']);
        });

        // Liaisons with Médecins
        Route::prefix('liaisons')->name('liaisons.')->group(function () {
            Route::post('/', [GestionnaireLiaisonController::class, 'sendRequest']);
            Route::get('/', [GestionnaireLiaisonController::class, 'getAll']);
            Route::get('/medecins', [GestionnaireLiaisonController::class, 'getLinked']);
            Route::delete('/{id}', [GestionnaireLiaisonController::class, 'cancel']);
        });
    });

    // ============================================
    // DIRECTEUR ROUTES
    // ============================================
    Route::middleware('role:directeur')->prefix('directeur')->name('directeur.')->group(function () {
        // Dashboard
        Route::get('/dashboard', [DirecteurController::class, 'dashboard']);
        Route::get('/stats', [DirecteurController::class, 'getStats']);
        Route::get('/users', [DirecteurController::class, 'getUsers']);
        Route::get('/personnel-data', [DirecteurController::class, 'getPersonnelData']);
        Route::get('/personnel-datatable', [DirecteurController::class, 'getPersonnelDatatable']);
        Route::get('/hopital', [DirecteurController::class, 'getHopital']);
        Route::put('/hopital', [DirecteurController::class, 'updateHopital']);

        // Création d'utilisateurs
        Route::post('/create-medecin', [DirecteurController::class, 'createMedecin']);
        Route::post('/create-gestionnaire', [DirecteurController::class, 'createGestionnaire']);
        Route::post('/create-secretaire', [DirecteurController::class, 'createSecretaire']);

        // Récupération des données individuelles (GET)
        Route::get('/medecins/{id}', [DirecteurController::class, 'showMedecin']);
        Route::get('/gestionnaires/{id}', [DirecteurController::class, 'showGestionnaire']);
        Route::get('/secretaires/{id}', [DirecteurController::class, 'showSecretaire']);

        // Modification des utilisateurs (PUT)
        Route::put('/medecins/{id}', [DirecteurController::class, 'updateMedecin']);
        Route::put('/gestionnaires/{id}', [DirecteurController::class, 'updateGestionnaire']);
        Route::put('/secretaires/{id}', [DirecteurController::class, 'updateSecretaire']);

        // Changer le mot de passe d'un utilisateur
        Route::put('/users/{userId}/password', [DirecteurController::class, 'updateUserPassword']);
    });

    // ============================================
    // SUPER-ADMIN ROUTES
    // ============================================
    Route::middleware('role:super-admin')->prefix('super-admin')->name('super-admin.')->group(function () {
        // Dashboard
        Route::get('/dashboard', [SuperAdminDashboardController::class, 'show']);
        Route::get('/users/by-role/{role}', [SuperAdminDashboardController::class, 'getUsersByRole']);

        // User Management
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [SuperAdminUserController::class, 'getAll']);
            Route::get('/{id}', [SuperAdminUserController::class, 'show']);
            Route::put('/{id}', [SuperAdminUserController::class, 'update']);
            Route::put('/{id}/status', [SuperAdminUserController::class, 'toggleActive']);
            Route::put('/{id}/change-password', [SuperAdminController::class, 'changeUserPassword']);
            Route::post('/assign-role', [SuperAdminUserController::class, 'assignRole']);
            Route::post('/remove-role', [SuperAdminUserController::class, 'removeRole']);
        });

        // Director Management
        Route::prefix('directors')->name('directors.')->group(function () {
            Route::post('/create', [SuperAdminController::class, 'createDirector']);
        });

        // Création d'utilisateurs par rôle
        Route::get('/hopitaux', [SuperAdminUserCreationController::class, 'getHopitaux']);
        Route::post('/admins/create', [SuperAdminUserCreationController::class, 'createAdmin']);
        Route::post('/clients/create', [SuperAdminUserCreationController::class, 'createClient']);
        Route::post('/gestionnaires/create', [SuperAdminUserCreationController::class, 'createGestionnaire']);
        Route::post('/secretaires/create', [SuperAdminUserCreationController::class, 'createSecretaire']);
        Route::post('/medecins/create', [SuperAdminUserCreationController::class, 'createMedecin']);

        // Role Management
        Route::prefix('roles')->name('roles.')->group(function () {
            Route::get('/', [SuperAdminRoleController::class, 'getAll']);
            Route::post('/', [SuperAdminRoleController::class, 'create']);
            Route::get('/permissions', [SuperAdminRoleController::class, 'getPermissions']);
            Route::post('/assign-permission', [SuperAdminRoleController::class, 'assignPermission']);
        });
    });

    // ============================================
    // ADMIN ROUTES - Protected
    // ============================================
    Route::middleware('role:admin')->prefix('admin')->name('admin.')->group(function () {
        // Directeur Requests Management
        Route::get('/demande-directeur', [DirecteurRequestController::class, 'index']);
        Route::get('/demande-directeur/{id}', [DirecteurRequestController::class, 'show']);
        Route::put('/demande-directeur/{id}/statut', [DirecteurRequestController::class, 'updateStatut']);
        Route::patch('/demande-directeur/{id}/approve', [DirecteurRequestController::class, 'approve']);
        Route::patch('/demande-directeur/{id}/reject', [DirecteurRequestController::class, 'reject']);

        // User Verification Management
        Route::get('/utilisateurs-non-verifies', [AdminUserController::class, 'getUnverifiedUsers']);
        Route::get('/utilisateurs-non-verifies-list', [AdminUserController::class, 'getUnverifiedUsersList']);
        Route::put('/utilisateurs/{id}/verify', [AdminUserController::class, 'verifyUser']);
        Route::put('/utilisateurs/{id}/reject', [AdminUserController::class, 'rejectUser']);
    });
});
