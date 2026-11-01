<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\RendezVous;
use App\Services\CsvExportService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class RendezVousController extends Controller
{
    private const STATUT_LIBELLES = [
        'en_attente' => 'En attente',
        'confirmé' => 'Confirmé',
        'annulé' => 'Annulé',
        'terminé' => 'Terminé',
    ];

    public function index(Request $request)
    {
        $this->validerFiltres($request);
        $perPage = min(max((int) $request->input('per_page', 25), 1), 100);

        $rendezVous = $this->requete($request)
            ->orderByDesc('date_debut')
            ->paginate($perPage);

        return response()->json([
            'rendez_vous' => collect($rendezVous->items())->map(fn (RendezVous $rdv) => $this->formater($rdv))->values(),
            'pagination' => [
                'current_page' => $rendezVous->currentPage(),
                'last_page' => $rendezVous->lastPage(),
                'total' => $rendezVous->total(),
            ],
        ]);
    }

    public function export(Request $request, CsvExportService $csv)
    {
        $this->validerFiltres($request);

        $lignes = $this->requete($request)
            ->orderBy('date_debut')
            ->get()
            ->map(function (RendezVous $rdv) {
                $f = $this->formater($rdv);

                return [
                    $rdv->date_debut->format('d/m/Y'),
                    $rdv->date_debut->format('H:i'),
                    $f['patient'],
                    $f['patient_email'],
                    $f['patient_telephone'],
                    $f['medecin'],
                    $f['specialite'],
                    $f['hopital'],
                    $f['motif'],
                    self::STATUT_LIBELLES[$f['statut']] ?? $f['statut'],
                ];
            });

        return $csv->telecharger(
            'rendez_vous_' . now()->format('Y-m-d') . '.csv',
            ['Date', 'Heure', 'Patient', 'Email', 'Téléphone', 'Médecin', 'Spécialité', 'Établissement', 'Motif', 'Statut'],
            $lignes
        );
    }

    private function validerFiltres(Request $request): void
    {
        $request->validate([
            'statut' => 'nullable|in:' . implode(',', RendezVous::STATUTS),
            'hopital_id' => 'nullable|integer|exists:hopitals,id',
            'medecin_id' => 'nullable|integer|exists:medecin_profiles,id',
            'from' => 'nullable|date_format:Y-m-d',
            'to' => 'nullable|date_format:Y-m-d',
            'search' => 'nullable|string|max:255',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);
    }

    private function requete(Request $request): Builder
    {
        $terme = '%' . addcslashes(trim((string) $request->input('search', '')), '%_\\') . '%';

        return RendezVous::with([
                'client:id,name,email,phone',
                'medecin.user:id,name',
                'medecin.specialite:id,nom',
                'medecin.hopital:id,name',
            ])
            ->when($request->filled('statut'), fn (Builder $q) => $q->where('statut', $request->input('statut')))
            ->when($request->filled('medecin_id'), fn (Builder $q) => $q->where('medecin_id', $request->input('medecin_id')))
            ->when($request->filled('hopital_id'), fn (Builder $q) => $q->whereHas(
                'medecin',
                fn (Builder $m) => $m->where('hopital_id', $request->input('hopital_id'))
            ))
            ->when($request->filled('from'), fn (Builder $q) => $q->whereDate('date_debut', '>=', $request->input('from')))
            ->when($request->filled('to'), fn (Builder $q) => $q->whereDate('date_debut', '<=', $request->input('to')))
            ->when(trim((string) $request->input('search', '')) !== '', function (Builder $q) use ($terme) {
                $q->where(function (Builder $q) use ($terme) {
                    $q->where('name', 'like', $terme)
                        ->orWhere('email', 'like', $terme)
                        ->orWhere('phone', 'like', $terme)
                        ->orWhere('motif', 'like', $terme)
                        ->orWhereHas('client', fn (Builder $c) => $c->where('name', 'like', $terme))
                        ->orWhereHas('medecin.user', fn (Builder $u) => $u->where('name', 'like', $terme));
                });
            });
    }

    private function formater(RendezVous $rdv): array
    {
        return [
            'id' => $rdv->id,
            'date_debut' => $rdv->date_debut?->toIso8601String(),
            'date_fin' => $rdv->date_fin?->toIso8601String(),
            'statut' => $rdv->statut,
            'motif' => $rdv->motif,
            'patient' => $rdv->client?->name ?? $rdv->name,
            'patient_email' => $rdv->client?->email ?? $rdv->email,
            'patient_telephone' => $rdv->client?->phone ?? $rdv->phone,
            'patient_inscrit' => $rdv->client_id !== null,
            'medecin_id' => $rdv->medecin_id,
            'medecin' => $rdv->medecin?->user?->name,
            'specialite' => $rdv->medecin?->specialite?->nom,
            'hopital' => $rdv->medecin?->hopital?->name,
        ];
    }
}
