<?php

namespace App\Services;

use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\User;

class RendezVousBookingService
{
    /**
     * Crée un rendez-vous saisi par le médecin, en conservant le patient saisi.
     *
     * @param array{name: string, email?: ?string, phone?: ?string, motif?: ?string, notes?: ?string, date_debut: mixed, date_fin: mixed, statut: string} $data
     */
    public function createByMedecin(MedecinProfile $profil, User $auteur, array $data): RendezVous
    {
        $clientId = empty($data['email'])
            ? null
            : User::where('email', $data['email'])->value('id');

        return RendezVous::create([
            'medecin_id' => $profil->id,
            'client_id' => $clientId,
            'author_id' => $auteur->id,
            'date_debut' => $data['date_debut'],
            'date_fin' => $data['date_fin'],
            'statut' => $data['statut'],
            'motif' => $data['motif'] ?? '',
            'notes' => $data['notes'] ?? null,
            'name' => $data['name'],
            'email' => $data['email'] ?? null,
            'phone' => $data['phone'] ?? null,
        ]);
    }
}
