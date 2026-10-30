<?php

namespace App\Services;

use App\Models\Directeur;
use App\Models\Hopital;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class InactivityService
{
    public const RETENTION_YEARS = 2;

    public const WARNING_MONTHS = 1;

    /** Comptes de staff jamais concernés par la suppression pour inactivité. */
    private const EXCLUDED_ROLES = ['admin', 'super-admin'];

    /**
     * Comptes et établissements dont la suppression est échue ou prévue dans le mois.
     *
     * @return Collection<int, array{type: string, id: int, label: string, recipients: array<int, string>, last_activity: Carbon, deadline: Carbon, overdue: bool}>
     */
    public function atRisk(): Collection
    {
        $limit = now()->addMonths(self::WARNING_MONTHS);

        return $this->inactiveUsers($limit)
            ->merge($this->inactiveHopitaux($limit))
            ->sortBy('deadline')
            ->values();
    }

    /**
     * Dernière activité : dernière connexion, sinon date de création du compte.
     */
    private function inactiveUsers(Carbon $limit): Collection
    {
        $cutoff = $limit->copy()->subYears(self::RETENTION_YEARS)->format('Y-m-d H:i:s');

        return User::query()
            ->whereDoesntHave('roles', fn($query) => $query->whereIn('name', self::EXCLUDED_ROLES))
            ->whereRaw('COALESCE(last_login_at, created_at) <= ?', [$cutoff])
            ->get()
            ->map(fn(User $user) => $this->row(
                'user',
                $user->id,
                $user->name,
                [$user->email],
                $user->last_login_at ?? $user->created_at,
            ));
    }

    /**
     * Un établissement reste actif tant qu'un de ses membres s'est connecté récemment.
     */
    private function inactiveHopitaux(Carbon $limit): Collection
    {
        return Hopital::with(['directeurs.user', 'gestionnaires.user', 'secretaires.user', 'medecins.user'])
            ->get()
            ->map(function (Hopital $hopital) {
                $members = $hopital->directeurs
                    ->concat($hopital->gestionnaires)
                    ->concat($hopital->secretaires)
                    ->concat($hopital->medecins)
                    ->map->user
                    ->filter();

                $lastActivity = $members
                    ->map(fn(User $user) => $user->last_login_at ?? $user->created_at)
                    ->max() ?? $hopital->created_at ?? now();

                $recipients = $hopital->directeurs
                    ->map(fn(Directeur $directeur) => $directeur->user?->email)
                    ->prepend($hopital->email)
                    ->filter(fn($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
                    ->unique()
                    ->values()
                    ->all();

                return $this->row('hopital', $hopital->id, $hopital->name, $recipients, $lastActivity);
            })
            ->filter(fn(array $row) => $row['deadline']->lte($limit))
            ->values();
    }

    /**
     * @param  array<int, string>  $recipients
     * @return array{type: string, id: int, label: string, recipients: array<int, string>, last_activity: Carbon, deadline: Carbon, overdue: bool}
     */
    private function row(string $type, int $id, string $label, array $recipients, Carbon $lastActivity): array
    {
        $deadline = $lastActivity->copy()->addYears(self::RETENTION_YEARS);

        return [
            'type' => $type,
            'id' => $id,
            'label' => $label,
            'recipients' => $recipients,
            'last_activity' => $lastActivity,
            'deadline' => $deadline,
            'overdue' => $deadline->lte(now()),
        ];
    }
}
