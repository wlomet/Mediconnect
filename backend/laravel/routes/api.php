<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\EmailVerificationController;
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
use App\Http\Controllers\Client\AntecedentController as ClientAntecedentController;
use App\Http\Controllers\Client\DossierController as ClientDossierController;
use App\Http\Controllers\Medecin\RendezVousController as MedecinRendezVousController;
use App\Http\Controllers\Medecin\LiaisonController as MedecinLiaisonController;
use App\Http\Controllers\Medecin\ProfileController as MedecinProfileControllerNamespace;
use App\Http\Controllers\Medecin\PdfImageController;
use App\Http\Controllers\Medecin\PdfTemplateController;
use App\Http\Controllers\Medecin\PdfDataController;
use App\Http\Controllers\Medecin\GeneratedDocumentController;
use App\Http\Controllers\Medecin\ConsultationController;
use App\Http\Controllers\Medecin\DashboardController as MedecinDashboardController;
use App\Http\Controllers\Secretaire\RendezVousController as SecretaireRendezVousController;
use App\Http\Controllers\Secretaire\LiaisonController as SecretaireLiaisonController;
use App\Http\Controllers\Secretaire\DashboardController as SecretaireDashboardController;
use App\Http\Controllers\Gestionnaire\RendezVousController as GestionnaireRendezVousController;
use App\Http\Controllers\Gestionnaire\LiaisonController as GestionnaireLiaisonController;
use App\Http\Controllers\Gestionnaire\DashboardController as GestionnaireDashboardController;
use App\Http\Controllers\SuperAdmin\UserController as SuperAdminUserController;
use App\Http\Controllers\SuperAdmin\RoleController as SuperAdminRoleController;
use App\Http\Controllers\SuperAdmin\DashboardController as SuperAdminDashboardController;
use App\Http\Controllers\SuperAdmin\HopitalController as SuperAdminHopitalController;
use App\Http\Controllers\SuperAdmin\UserCreationController as SuperAdminUserCreationController;
use App\Http\Controllers\SuperAdmin\AntecedentOptionController as SuperAdminAntecedentOptionController;
use App\Http\Controllers\SuperAdmin\SpecialiteController as SuperAdminSpecialiteController;
use App\Http\Controllers\SuperAdmin\RendezVousController as SuperAdminRendezVousController;
use App\Http\Controllers\SuperAdmin\ActeurController as SuperAdminActeurController;
use App\Http\Controllers\SuperAdmin\PdfTemplateController as SuperAdminPdfTemplateController;
use App\Http\Controllers\SuperAdmin\PdfImageController as SuperAdminPdfImageController;
use App\Http\Controllers\SuperAdminController;
// Admin Controllers
use App\Http\Controllers\Admin\AdminUserController;
use App\Http\Controllers\Admin\InactivityController;

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
Route::post('/forgot-password', [PasswordResetController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::post('/verify-email', [EmailVerificationController::class, 'verify'])->middleware('throttle:10,1');
Route::post('/resend-verification', [EmailVerificationController::class, 'resend'])->middleware('throttle:5,1');
Route::post('/logout', [AuthController::class, 'logout']);
Route::get('/user', [AuthController::class, 'user']);

Route::get('/test', function () {
    return response()->json(['message' => 'API fonctionne !']);
});

// Public search routes
Route::get('/search/medecins', [SearchMedecinController::class, 'search']);
Route::get('/search/suggestions', [SearchMedecinController::class, 'suggestions']);
Route::get('/search/villes', [SearchMedecinController::class, 'villes']);
Route::get('/hopital/{id}/medecins', [SearchMedecinController::class, 'getHopitalMedecins']);
Route::get('/hopitaux', [SearchMedecinController::class, 'listAll']);
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
Route::post('/rendezvous', [ClientRendezVousController::class, 'store'])->middleware('medecin.bookable');

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

        // Antécédents médicaux
        Route::get('/antecedents', [ClientAntecedentController::class, 'show']);
        Route::put('/antecedents', [ClientAntecedentController::class, 'update']);

        // Rendez-vous
        Route::post('/rendez-vous', [ClientRendezVousController::class, 'store'])->middleware('medecin.bookable');
        Route::get('/rendez-vous/{id}', [ClientRendezVousController::class, 'show']);
        Route::get('/rendez-vous', [ClientRendezVousController::class, 'getMyRendezVous']);
        Route::patch('/rendez-vous/{id}/cancel', [ClientRendezVousController::class, 'cancel']);

        // Consultations, documents archivés (ordonnances, factures) et leur téléchargement
        Route::get('/consultations', [ClientDossierController::class, 'consultations']);
        Route::get('/documents', [ClientDossierController::class, 'documents']);
        Route::post('/documents/marquer-vus', [ClientDossierController::class, 'marquerDocumentsVus']);
        Route::get('/documents/{id}/download', [ClientDossierController::class, 'downloadDocument']);

        // Tableau de bord
        Route::get('/dashboard/stats', [ClientDossierController::class, 'dashboardStats']);
    });

    // ============================================
    // MEDECIN ROUTES
    // ============================================
    Route::middleware('role:medecin')->prefix('medecin')->name('medecin.')->group(function () {
        // Profile
        Route::get('/profile', [MedecinProfileControllerNamespace::class, 'show']);
        Route::put('/profile', [MedecinProfileControllerNamespace::class, 'update']);
        Route::post('/profile/photo', [MedecinProfileControllerNamespace::class, 'uploadPhoto']);

        // Dashboard
        Route::get('/dashboard/stats', [MedecinDashboardController::class, 'stats']);

        // Planning
        Route::get('/planning/export', [MedecinPlanningController::class, 'exportRendezVous']);

        // Rendez-vous Management
        Route::get('/rendez-vous', [MedecinRendezVousController::class, 'getAll']);
        Route::get('/rendez-vous/today', [MedecinRendezVousController::class, 'getToday']);
        Route::get('/rendez-vous/month', [MedecinRendezVousController::class, 'getThisMonth']);
        Route::get('/rendez-vous/{id}', [MedecinRendezVousController::class, 'show']);
        Route::put('/rendez-vous/{id}', [MedecinRendezVousController::class, 'update']);
        Route::post('/rendez-vous/{id}/renvoyer-email', [MedecinRendezVousController::class, 'renvoyerEmail']);
        Route::post('/rendez-vous', [MedecinRendezVousController::class, 'store'])->middleware('medecin.bookable');
        Route::delete('/rendez-vous/{id}', [MedecinRendezVousController::class, 'destroy']);

        // Consultations
        Route::prefix('consultations')->name('consultations.')->group(function () {
            Route::get('/', [ConsultationController::class, 'index']);
            Route::get('/export', [ConsultationController::class, 'export']);
            Route::get('/en-cours', [ConsultationController::class, 'enCours']);
            Route::get('/rendez-vous-disponibles', [ConsultationController::class, 'rendezVousDisponibles']);
            Route::post('/', [ConsultationController::class, 'store']);
            Route::get('/{id}', [ConsultationController::class, 'show']);
            Route::put('/{id}/heure-debut', [ConsultationController::class, 'updateHeureDebut']);
            Route::put('/{id}/ordonnance', [ConsultationController::class, 'saveOrdonnance']);
            Route::put('/{id}/facture', [ConsultationController::class, 'saveFacture']);
            Route::post('/{id}/abandon', [ConsultationController::class, 'abandon']);
            Route::post('/{id}/reprendre', [ConsultationController::class, 'reprendre']);
            Route::post('/{id}/terminer', [ConsultationController::class, 'terminer']);
        });



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

        // Documents PDF (ordonnances et factures)
        Route::prefix('pdf-images')->name('pdf-images.')->group(function () {
            Route::get('/', [PdfImageController::class, 'index']);
            Route::post('/', [PdfImageController::class, 'store']);
            Route::get('/{id}/file', [PdfImageController::class, 'file']);
            Route::delete('/{id}', [PdfImageController::class, 'destroy']);
        });

        Route::prefix('pdf-templates')->name('pdf-templates.')->group(function () {
            Route::get('/', [PdfTemplateController::class, 'index']);
            Route::post('/', [PdfTemplateController::class, 'store']);
            Route::post('/from-default', [PdfTemplateController::class, 'storeFromDefault']);
            Route::get('/{id}', [PdfTemplateController::class, 'show']);
            Route::put('/{id}', [PdfTemplateController::class, 'update']);
            Route::delete('/{id}', [PdfTemplateController::class, 'destroy']);
        });

        Route::get('/pdf-data/{rendezVousId}', [PdfDataController::class, 'show']);

        // Archivage des ordonnances et factures, toujours lié à une consultation en cours
        Route::post('/generated-documents', [GeneratedDocumentController::class, 'store']);
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
            Route::post('/', [SecretaireRendezVousController::class, 'store'])->middleware('medecin.bookable');
            Route::put('/{id}', [SecretaireRendezVousController::class, 'update']);
            Route::delete('/{id}', [SecretaireRendezVousController::class, 'destroy']);
            Route::get('/medecin/{medecinId}', [SecretaireRendezVousController::class, 'getMedecinRendezVous']);
            Route::patch('/{id}/cancel', [SecretaireRendezVousController::class, 'cancel']);
            Route::post('/{id}/renvoyer-email', [SecretaireRendezVousController::class, 'renvoyerEmail']);
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
            Route::post('/', [GestionnaireRendezVousController::class, 'store'])->middleware('medecin.bookable');
            Route::put('/{id}', [GestionnaireRendezVousController::class, 'update']);
            Route::delete('/{id}', [GestionnaireRendezVousController::class, 'destroy']);
            Route::get('/medecin/{medecinId}', [GestionnaireRendezVousController::class, 'getMedecinRendezVous']);
            Route::patch('/{id}/cancel', [GestionnaireRendezVousController::class, 'cancel']);
            Route::post('/{id}/renvoyer-email', [GestionnaireRendezVousController::class, 'renvoyerEmail']);
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

        // Modèles PDF de l'établissement (ordonnances et factures)
        Route::prefix('pdf-images')->name('pdf-images.')->group(function () {
            Route::get('/', [PdfImageController::class, 'index']);
            Route::post('/', [PdfImageController::class, 'store']);
            Route::get('/{id}/file', [PdfImageController::class, 'file']);
            Route::delete('/{id}', [PdfImageController::class, 'destroy']);
        });

        Route::prefix('pdf-templates')->name('pdf-templates.')->group(function () {
            Route::get('/', [PdfTemplateController::class, 'index']);
            Route::post('/', [PdfTemplateController::class, 'store']);
            Route::post('/from-default', [PdfTemplateController::class, 'storeFromDefault']);
            Route::get('/{id}', [PdfTemplateController::class, 'show']);
            Route::put('/{id}', [PdfTemplateController::class, 'update']);
            Route::delete('/{id}', [PdfTemplateController::class, 'destroy']);
        });

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
        Route::get('/inactivity', [InactivityController::class, 'index']);

        // User Management
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [SuperAdminUserController::class, 'getAll']);
            Route::get('/{id}', [SuperAdminUserController::class, 'show']);
            Route::put('/{id}', [SuperAdminUserController::class, 'update']);
            Route::put('/{id}/status', [SuperAdminUserController::class, 'toggleActive']);
            Route::put('/{id}/hide', [SuperAdminUserController::class, 'toggleHide']);
            Route::put('/{id}/change-password', [SuperAdminController::class, 'changeUserPassword']);
            Route::post('/assign-role', [SuperAdminUserController::class, 'assignRole']);
            Route::post('/remove-role', [SuperAdminUserController::class, 'removeRole']);
        });

        // Establishment Management (liste + masquage en cascade des médecins)
        Route::prefix('etablissements')->name('etablissements.')->group(function () {
            Route::get('/', [SuperAdminHopitalController::class, 'getAll']);
            Route::put('/{id}/hide', [SuperAdminHopitalController::class, 'toggleHide']);
            Route::get('/{id}/medecins', [SuperAdminHopitalController::class, 'medecins']);
            Route::put('/{id}/medecins/unhide-all', [SuperAdminHopitalController::class, 'unhideAllMedecins']);
        });

        // Référentiels : antécédents et spécialités
        Route::prefix('antecedent-options')->name('antecedent-options.')->group(function () {
            Route::get('/', [SuperAdminAntecedentOptionController::class, 'index']);
            Route::post('/', [SuperAdminAntecedentOptionController::class, 'store']);
            Route::put('/{id}', [SuperAdminAntecedentOptionController::class, 'update']);
            Route::delete('/{id}', [SuperAdminAntecedentOptionController::class, 'destroy']);
        });

        Route::prefix('specialites')->name('specialites.')->group(function () {
            Route::get('/', [SuperAdminSpecialiteController::class, 'index']);
            Route::post('/', [SuperAdminSpecialiteController::class, 'store']);
            Route::put('/{id}', [SuperAdminSpecialiteController::class, 'update']);
            Route::delete('/{id}', [SuperAdminSpecialiteController::class, 'destroy']);
        });

        // Rendez-vous de l'application
        Route::get('/rendez-vous', [SuperAdminRendezVousController::class, 'index']);
        Route::get('/rendez-vous/export', [SuperAdminRendezVousController::class, 'export']);

        // Établissements et médecins (filtres et attributions)
        Route::get('/acteurs', [SuperAdminActeurController::class, 'index']);

        // Modèles PDF et bibliothèque, attribués à un établissement ou à un médecin
        Route::prefix('pdf-templates')->name('pdf-templates.')->group(function () {
            Route::get('/', [SuperAdminPdfTemplateController::class, 'index']);
            Route::post('/from-default', [SuperAdminPdfTemplateController::class, 'storeFromDefault']);
            Route::get('/{id}', [SuperAdminPdfTemplateController::class, 'show']);
            Route::put('/{id}', [SuperAdminPdfTemplateController::class, 'update']);
            Route::delete('/{id}', [SuperAdminPdfTemplateController::class, 'destroy']);
        });

        Route::prefix('pdf-images')->name('pdf-images.')->group(function () {
            Route::get('/', [SuperAdminPdfImageController::class, 'index']);
            Route::post('/', [SuperAdminPdfImageController::class, 'store']);
            Route::get('/{id}/file', [SuperAdminPdfImageController::class, 'file']);
            Route::delete('/{id}', [SuperAdminPdfImageController::class, 'destroy']);
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
        Route::get('/utilisateurs/{id}/documents/{type}', [AdminUserController::class, 'getDocument'])
            ->where('type', 'identite|justificatif');

        // Comptes et établissements inactifs (suppression prévue)
        Route::get('/inactivity', [InactivityController::class, 'index']);
    });
});
