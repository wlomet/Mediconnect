<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Rules\PhoneNumber;
use App\Services\ConsultationService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ConsultationController extends Controller
{
    public function __construct(private ConsultationService $consultations)
    {
    }

    private function profil(Request $request): MedecinProfile
    {
        $profil = $request->user()->medecinProfile;
        abort_unless($profil, 403);

        return $profil;
    }

    private function consultationsDuProfil(MedecinProfile $profil)
    {
        return Consultation::where('medecin_profile_id', $profil->id)
            ->with(['rendezVous', 'facture.lignes', 'documents']);
    }

    public function index(Request $request)
    {
        $filtres = $request->validate([
            'statut' => ['nullable', Rule::in([Consultation::EN_COURS, Consultation::ABANDONNEE, Consultation::TERMINEE])],
        ]);

        $consultations = $this->consultationsDuProfil($this->profil($request))
            ->when(isset($filtres['statut']), fn ($q) => $q->where('statut', $filtres['statut']))
            ->orderByDesc('started_at')
            ->get();

        return response()->json([
            'consultations' => $consultations->map(fn (Consultation $c) => $this->consultations->formater($c))->values(),
        ]);
    }

    public function enCours(Request $request)
    {
        $consultation = $this->consultationsDuProfil($this->profil($request))
            ->where('statut', Consultation::EN_COURS)
            ->first();

        return response()->json([
            'consultation' => $consultation ? $this->consultations->formater($consultation) : null,
        ]);
    }

    public function rendezVousDisponibles(Request $request)
    {
        $profil = $this->profil($request);
        $recherche = trim((string) $request->query('search', ''));

        $rendezVous = RendezVous::where('medecin_id', $profil->id)
            ->whereIn('statut', ['en_attente', 'confirmé'])
            ->whereDoesntHave('consultation')
            ->where('date_debut', '<=', now()->endOfDay())
            ->when($recherche !== '', function ($q) use ($recherche) {
                $q->where(function ($q) use ($recherche) {
                    $q->where('name', 'like', "%{$recherche}%")
                        ->orWhere('email', 'like', "%{$recherche}%")
                        ->orWhere('phone', 'like', "%{$recherche}%");
                });
            })
            ->orderBy('date_debut')
            ->limit(100)
            ->get(['id', 'name', 'email', 'phone', 'motif', 'date_debut', 'date_fin', 'statut']);

        return response()->json(['rendez_vous' => $rendezVous]);
    }

    public function store(Request $request)
    {
        $profil = $this->profil($request);

        $data = $request->validate([
            'rendez_vous_id' => ['nullable', 'integer', Rule::exists('rendez_vous', 'id')->where('medecin_id', $profil->id)],
            'name' => ['required_without:rendez_vous_id', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber()],
            'motif' => ['required_without:rendez_vous_id', 'string', 'max:500'],
        ]);

        if (empty($data['rendez_vous_id']) && empty($data['email']) && empty($data['phone'])) {
            return response()->json([
                'message' => 'Vous devez fournir un email ou un téléphone.',
            ], 422);
        }

        $consultation = empty($data['rendez_vous_id'])
            ? $this->consultations->demarrerRapide($profil, $request->user(), $data)
            : $this->consultations->demarrerRendezVous($profil, $request->user(), RendezVous::findOrFail($data['rendez_vous_id']));

        return response()->json([
            'message' => 'Consultation démarrée',
            'consultation' => $this->consultations->formater($consultation),
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $profil = $this->profil($request);
        $consultation = $this->consultationsDuProfil($profil)->findOrFail($id);

        return response()->json([
            'consultation' => $this->consultations->formater($consultation),
            'historique' => $this->consultations->historiquePatient($profil, $consultation),
            'journal' => $consultation->events()->with('user:id,name')->get()->map(fn ($e) => [
                'type' => $e->type,
                'payload' => $e->payload,
                'user' => $e->user?->name,
                'created_at' => $e->created_at,
            ])->values(),
        ]);
    }

    public function updateHeureDebut(Request $request, int $id)
    {
        $data = $request->validate([
            'heure_debut_reelle' => ['required', 'date', 'before_or_equal:now'],
        ]);

        $consultation = $this->consultations->mettreAJourHeureDebut(
            $this->profil($request),
            $request->user(),
            $id,
            Carbon::parse($data['heure_debut_reelle'])
        );

        return response()->json([
            'message' => 'Heure de début enregistrée',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }

    public function saveOrdonnance(Request $request, int $id)
    {
        $data = $request->validate([
            'texte' => ['nullable', 'string', 'max:10000'],
        ]);

        $consultation = $this->consultations->enregistrerOrdonnance(
            $this->profil($request),
            $request->user(),
            $id,
            $data['texte'] ?? null
        );

        return response()->json([
            'message' => 'Ordonnance enregistrée',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }

    public function saveFacture(Request $request, int $id)
    {
        $data = $request->validate([
            'lignes' => ['required', 'array', 'min:1', 'max:100'],
            'lignes.*.libelle' => ['required', 'string', 'max:255'],
            'lignes.*.quantite' => ['required', 'numeric', 'min:0.01', 'max:999999'],
            'lignes.*.prix_unitaire' => ['required', 'numeric', 'min:0', 'max:9999999'],
        ]);

        $consultation = $this->consultations->enregistrerFacture(
            $this->profil($request),
            $request->user(),
            $id,
            $data['lignes']
        );

        return response()->json([
            'message' => 'Facture enregistrée',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }

    public function abandon(Request $request, int $id)
    {
        $data = $request->validate([
            'motif' => ['required', 'string', 'min:3', 'max:1000'],
        ]);

        $consultation = $this->consultations->abandonner(
            $this->profil($request),
            $request->user(),
            $id,
            $data['motif']
        );

        return response()->json([
            'message' => 'Consultation abandonnée',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }

    public function reprendre(Request $request, int $id)
    {
        $consultation = $this->consultations->reprendre($this->profil($request), $request->user(), $id);

        return response()->json([
            'message' => 'Consultation reprise',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }

    public function terminer(Request $request, int $id)
    {
        $consultation = $this->consultations->terminer($this->profil($request), $request->user(), $id);

        return response()->json([
            'message' => 'Consultation terminée',
            'consultation' => $this->consultations->formater($consultation),
        ]);
    }
}
