<?php

namespace App\Console\Commands;

use App\Services\InactivityService;
use Illuminate\Console\Command;

class ListInactiveAccounts extends Command
{
    protected $signature = 'inactivity:list';

    protected $description = 'Liste les comptes et établissements inactifs dont la suppression est échue ou prévue dans le mois';

    public function handle(InactivityService $inactivity): int
    {
        $rows = $inactivity->atRisk();

        if ($rows->isEmpty()) {
            $this->info('Aucun compte ou établissement à échéance.');

            return self::SUCCESS;
        }

        $this->table(
            ['Type', 'ID', 'Nom', 'Dernière activité', 'Suppression prévue', 'Statut'],
            $rows->map(fn(array $row) => [
                $row['type'] === 'user' ? 'Compte' : 'Établissement',
                $row['id'],
                $row['label'],
                $row['last_activity']->format('d/m/Y'),
                $row['deadline']->format('d/m/Y'),
                $row['overdue'] ? 'Échue' : 'Dans moins d\'un mois',
            ])->all(),
        );

        return self::SUCCESS;
    }
}
