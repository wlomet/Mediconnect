<?php

namespace Tests\Feature\Concerns;

use App\Models\Consultation;
use App\Models\MedecinProfile;
use App\Models\RendezVous;
use App\Models\User;
use Spatie\Permission\Models\Role;

trait RendezVousFixtures
{
    protected function makeUserWithRole(string $role): User
    {
        Role::firstOrCreate(['name' => $role]);

        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole($role);

        return $user;
    }

    /** @return array{0: User, 1: MedecinProfile} */
    protected function makeMedecin(): array
    {
        $user = $this->makeUserWithRole('medecin');

        return [$user, MedecinProfile::create(['user_id' => $user->id])];
    }

    protected function makeRendezVous(MedecinProfile $profil, array $attributes = []): RendezVous
    {
        return RendezVous::create(array_merge([
            'medecin_id' => $profil->id,
            'date_debut' => now()->addDay()->setTime(10, 0),
            'date_fin' => now()->addDay()->setTime(10, 30),
            'statut' => 'confirmé',
            'motif' => 'Contrôle',
            'name' => 'Patient Test',
            'email' => 'patient@example.test',
            'phone' => null,
        ], $attributes));
    }

    protected function makeConsultation(
        MedecinProfile $profil,
        RendezVous $rendezVous,
        string $statut = Consultation::EN_COURS
    ): Consultation {
        return Consultation::create([
            'medecin_profile_id' => $profil->id,
            'rendez_vous_id' => $rendezVous->id,
            'statut' => $statut,
            'started_at' => now(),
            'heure_debut_reelle' => now(),
            'ended_at' => $statut === Consultation::TERMINEE ? now() : null,
            'abandoned_at' => $statut === Consultation::ABANDONNEE ? now() : null,
            'abandon_motif' => $statut === Consultation::ABANDONNEE ? 'Motif de test' : null,
        ]);
    }
}
