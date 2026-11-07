<?php

namespace App\Http\Controllers\Directeur;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Directeur\Concerns\MedecinsAccessibles;
use App\Models\Consultation;
use App\Models\ConsultationFacture;
use App\Models\RendezVous;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class StatistiqueController extends Controller
{
    use MedecinsAccessibles;

    // Au-delà de ce nombre de jours, les montants sont regroupés par mois
    private const JOURS_MAX_PAR_JOUR = 62;

    public function rendezVous(Request $request): JsonResponse
    {
        $profilIds = $this->profilsSelectionnes($request);
        $periode = $this->periode($request);

        $rendezVous = RendezVous::whereIn('medecin_id', $profilIds)
            ->whereBetween('date_debut', [$periode['debut'], $periode['fin']])
            ->get(['date_debut', 'statut']);

        // Un rendez-vous terminé a été confirmé avant sa consultation
        return $this->serie($periode, $rendezVous, fn (RendezVous $rdv) => $rdv->date_debut, [
            'confirmes' => fn (RendezVous $rdv) => (int) in_array($rdv->statut, ['confirmé', 'terminé'], true),
            'annules' => fn (RendezVous $rdv) => (int) ($rdv->statut === 'annulé'),
        ]);
    }

    public function consultations(Request $request): JsonResponse
    {
        $profilIds = $this->profilsSelectionnes($request);
        $periode = $this->periode($request);

        $consultations = $this->consultationsDuPeriode($profilIds, $periode)->get(['started_at', 'statut']);

        return $this->serie($periode, $consultations, fn (Consultation $c) => $c->started_at, [
            'terminees' => fn (Consultation $c) => (int) ($c->statut === Consultation::TERMINEE),
            'abandonnees' => fn (Consultation $c) => (int) ($c->statut === Consultation::ABANDONNEE),
        ]);
    }

    public function documents(Request $request): JsonResponse
    {
        $profilIds = $this->profilsSelectionnes($request);
        $periode = $this->periode($request);

        $consultations = $this->consultationsDuPeriode($profilIds, $periode)
            ->with('facture:id,consultation_id')
            ->get(['id', 'started_at', 'ordonnance_texte']);

        return $this->serie($periode, $consultations, fn (Consultation $c) => $c->started_at, [
            'ordonnances' => fn (Consultation $c) => (int) ($c->ordonnance_texte !== null),
            'factures' => fn (Consultation $c) => (int) ($c->facture !== null),
        ]);
    }

    public function factures(Request $request): JsonResponse
    {
        $profilIds = $this->profilsSelectionnes($request);
        $periode = $this->periode($request);

        $factures = ConsultationFacture::whereHas('consultation', fn ($q) => $q
                ->whereIn('medecin_profile_id', $profilIds)
                ->whereBetween('started_at', [$periode['debut'], $periode['fin']]))
            ->with('consultation:id,started_at')
            ->get(['id', 'consultation_id', 'total']);

        return $this->serie($periode, $factures, fn (ConsultationFacture $f) => $f->consultation->started_at, [
            'montant' => fn (ConsultationFacture $f) => (float) $f->total,
        ]);
    }

    // Médecin filtré (s'il est accessible), sinon l'ensemble des médecins de l'hôpital
    private function profilsSelectionnes(Request $request): array
    {
        $donnees = $request->validate(['medecin_id' => ['nullable', 'integer']]);
        $medecinUserId = $donnees['medecin_id'] ?? null;

        if ($medecinUserId === null) {
            return $this->medecinProfileIdsAccessibles($request->user());
        }

        return [$this->profilMedecinAccessible($request->user(), (int) $medecinUserId)->id];
    }

    private function consultationsDuPeriode(array $profilIds, array $periode)
    {
        return Consultation::whereIn('medecin_profile_id', $profilIds)
            ->whereBetween('started_at', [$periode['debut'], $periode['fin']]);
    }

    // Bornes incluses en UTC pour la base ; le fuseau du navigateur sert aux regroupements par jour ou mois
    private function periode(Request $request): array
    {
        $donnees = $request->validate([
            'from' => ['required', 'date_format:Y-m-d'],
            'to' => ['required', 'date_format:Y-m-d', 'after_or_equal:from'],
            'timezone' => ['nullable', 'timezone:all'],
        ]);

        $fuseau = $donnees['timezone'] ?? config('app.timezone');
        $premierJour = Carbon::parse($donnees['from']);
        $dernierJour = Carbon::parse($donnees['to']);
        $parJour = $premierJour->diffInDays($dernierJour) + 1 <= self::JOURS_MAX_PAR_JOUR;

        return [
            'debut' => Carbon::parse($donnees['from'], $fuseau)->startOfDay()->setTimezone(config('app.timezone')),
            'fin' => Carbon::parse($donnees['to'], $fuseau)->endOfDay()->setTimezone(config('app.timezone')),
            'fuseau' => $fuseau,
            'granularite' => $parJour ? 'jour' : 'mois',
            'premier' => $parJour ? $premierJour : $premierJour->copy()->startOfMonth(),
            'dernier' => $dernierJour,
        ];
    }

    // Chaque courbe reçoit un élément et renvoie sa contribution (0 s'il n'est pas compté)
    private function serie(array $periode, Collection $elements, callable $dateDe, array $courbes): JsonResponse
    {
        $formatCle = $periode['granularite'] === 'jour' ? 'Y-m-d' : 'Y-m-01';
        $pas = $periode['granularite'] === 'jour' ? '1 day' : '1 month';

        $points = [];
        foreach (CarbonPeriod::create($periode['premier'], $pas, $periode['dernier']) as $date) {
            $points[$date->format($formatCle)] = array_fill_keys(array_keys($courbes), 0);
        }

        foreach ($elements as $element) {
            $cle = $dateDe($element)->copy()->setTimezone($periode['fuseau'])->format($formatCle);

            foreach ($courbes as $nom => $contribution) {
                $points[$cle][$nom] += $contribution($element);
            }
        }

        return response()->json([
            'granularite' => $periode['granularite'],
            'points' => collect($points)->map(fn (array $valeurs, string $debut) => ['debut' => $debut] + array_map(
                fn ($valeur) => round($valeur, 2),
                $valeurs,
            ))->values(),
        ]);
    }
}
