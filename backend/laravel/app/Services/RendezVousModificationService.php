<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RendezVousModificationService
{
    // Identité du patient, figée quand le patient a pris le rendez-vous lui-même.
    private const CHAMPS_PATIENT = ['name', 'email', 'phone'];

    // Statuts qui occupent un créneau.
    private const STATUTS_OCCUPANTS = ['en_attente', 'confirmé'];

    // Champs qui ne changent pas le contenu du rendez-vous.
    private const CHAMPS_STATUT = ['statut', 'confirmed_by'];

    /**
     * Applique les modifications validées d'un rendez-vous.
     *
     * @param  array<string, mixed>  $donnees  Champs validés par le contrôleur.
     */
    public function modifier(RendezVous $rendezVous, array $donnees, bool $chevauchementAutorise = false): void
    {
        $nouveauCreneau = $this->nouveauCreneau($rendezVous, $donnees);
        unset($donnees['date_debut'], $donnees['date_fin']);

        // Un simple changement de statut (annulation, confirmation) suit uniquement RendezVousStatutGuard.
        if ($nouveauCreneau !== null || $this->modifieAutreChoseQueLeStatut($rendezVous, $donnees)) {
            $rendezVous->verifierModifiable();
        }

        if ($rendezVous->clientAPrisLeRendezVous()) {
            $this->verifierPatientInchange($rendezVous, $donnees);
        }

        RendezVousStatutGuard::verifier($rendezVous, $donnees['statut'] ?? null);

        if (array_key_exists('email', $donnees) && $donnees['email'] !== $rendezVous->email) {
            $donnees['client_id'] = User::where('email', $donnees['email'])->value('id');
        }

        DB::transaction(function () use ($rendezVous, $donnees, $nouveauCreneau, $chevauchementAutorise) {
            if ($nouveauCreneau !== null) {
                // Verrou sur le médecin : deux réservations simultanées ne peuvent pas prendre le même créneau.
                MedecinProfile::whereKey($rendezVous->medecin_id)->lockForUpdate()->first();
                $this->verifierCreneau($rendezVous, $nouveauCreneau, $chevauchementAutorise);

                $donnees['date_debut'] = $nouveauCreneau['debut'];
                $donnees['date_fin'] = $nouveauCreneau['fin'];
            }

            $rendezVous->update($donnees);
        });
    }

    private function modifieAutreChoseQueLeStatut(RendezVous $rendezVous, array $donnees): bool
    {
        foreach ($donnees as $champ => $valeur) {
            if (! in_array($champ, self::CHAMPS_STATUT, true) && (string) $valeur !== (string) $rendezVous->{$champ}) {
                return true;
            }
        }

        return false;
    }

    private function verifierPatientInchange(RendezVous $rendezVous, array $donnees): void
    {
        foreach (self::CHAMPS_PATIENT as $champ) {
            if (array_key_exists($champ, $donnees) && (string) $donnees[$champ] !== (string) $rendezVous->{$champ}) {
                throw new BusinessException(
                    'Les informations du patient ne sont pas modifiables : rendez-vous pris par le patient depuis son compte.',
                    422
                );
            }
        }
    }

    /**
     * @return array{debut: Carbon, fin: Carbon}|null  Null si le créneau ne change pas.
     */
    private function nouveauCreneau(RendezVous $rendezVous, array $donnees): ?array
    {
        if (! isset($donnees['date_debut'], $donnees['date_fin'])) {
            return null;
        }

        $fuseau = config('app.timezone');
        $debut = Carbon::parse($donnees['date_debut'])->setTimezone($fuseau);
        $fin = Carbon::parse($donnees['date_fin'])->setTimezone($fuseau);

        if ($debut->equalTo($rendezVous->date_debut) && $fin->equalTo($rendezVous->date_fin)) {
            return null;
        }

        return ['debut' => $debut, 'fin' => $fin];
    }

    /**
     * @param  array{debut: Carbon, fin: Carbon}  $creneau
     */
    private function verifierCreneau(RendezVous $rendezVous, array $creneau, bool $chevauchementAutorise): void
    {
        if ($creneau['debut']->isPast()) {
            throw new BusinessException('Le nouveau créneau doit être dans le futur.', 422);
        }

        $occupe = RendezVous::where('medecin_id', $rendezVous->medecin_id)
            ->whereKeyNot($rendezVous->id)
            ->whereIn('statut', self::STATUTS_OCCUPANTS)
            ->where('date_debut', '<', $creneau['fin'])
            ->where('date_fin', '>', $creneau['debut'])
            ->exists();

        if ($occupe && ! $chevauchementAutorise) {
            throw new BusinessException(
                'Ce créneau est déjà occupé par un autre rendez-vous.',
                409,
                ['code' => 'creneau_occupe']
            );
        }
    }
}
