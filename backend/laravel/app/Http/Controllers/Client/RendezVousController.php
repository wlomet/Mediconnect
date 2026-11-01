<?php

namespace App\Http\Controllers\Client;

use App\Rules\PhoneNumber;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RendezVous;
use App\Models\User;
use App\Services\ClientConsultationFormatter;
use App\Services\RendezVousStatutGuard;
use Illuminate\Support\Facades\Log;

class RendezVousController extends Controller
{
    public function __construct(private ClientConsultationFormatter $formatter)
    {
    }

    /**
     * Client crée un rendez-vous
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'medecin_id' => 'required|integer|exists:medecin_profiles,id',
            'date_debut' => 'required|date',
            'date_fin' => 'required|date',
            'motif' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
            'statut' => 'required',
            'client_id' => 'nullable|integer|exists:users,id',
            'email' => 'nullable|email|max:255',
            'phone' => ['nullable', 'string', 'max:20', new PhoneNumber()],
            'name' => 'nullable|string|max:255',
        ]);

        // Chercher l'utilisateur par contexte d'authentification
        $user = auth()->user();

        // Si connecté, utiliser ses infos
        if ($user) {
            $validated['client_id'] = $user->id;
            $validated['email'] = $user->email;
            $validated['name'] = $user->name;
            $validated['author_id'] = $user->id;
        } else {
            // Si non connecté, au moins email ou phone est requis
            if (!$validated['email'] && !$validated['phone']) {
                return response()->json([
                    'message' => 'Vous devez fournir soit un email, soit un numéro de téléphone'
                ], 422);
            }
            // Si non connecté, le name est requis
            if (!$validated['name']) {
                return response()->json([
                    'message' => 'Vous devez fournir votre nom'
                ], 422);
            }
            $validated['author_id'] = null;
            $validated['client_id'] = null;
        }

        $rendezVous = RendezVous::create($validated);
        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'rendez_vous' => $rendezVous
        ], 201);
    }

    /**
     * Client récupère ses rendez-vous
     */
    public function getMyRendezVous(Request $request)
    {
        $client = $request->user();

        $rendezVous = RendezVous::duClient($client->id)
            ->with(['medecin', 'medecin.hopital'])
            ->orderBy('date_debut', 'desc')
            ->get()
            ->map(function ($rdv) {
                return [
                    'id' => $rdv->id,
                    'name' => $rdv->name,
                    'email' => $rdv->email,
                    'date_debut' => $rdv->date_debut,
                    'date_fin' => $rdv->date_fin,
                    'motif' => $rdv->motif,
                    'statut' => $rdv->statut,
                    'notes' => $rdv->notes,
                    'medecin' => $rdv->medecin ? [
                        'id' => $rdv->medecin->id,
                        'name' => $rdv->medecin->user->name,
                        'telephone' => $rdv->medecin->telephone,
                        'hopital' => $rdv->medecin->hopital ? [
                            'id' => $rdv->medecin->hopital->id,
                            'name' => $rdv->medecin->hopital->name,
                            'adresse' => $rdv->medecin->hopital->adresse,
                            'telephone' => $rdv->medecin->hopital->telephone,
                        ] : null,
                    ] : null
                ];
            });

        return response()->json([
            'rendez_vous' => $rendezVous
        ]);
    }

    /**
     * Client récupère les détails d'un rendez-vous
     */
    public function show(Request $request, $id)
    {
        $rendezVous = RendezVous::findOrFail($id);

        // Charger les relations
        $rendezVous->load(['medecin', 'medecin.hopital']);
        $consultation = $this->consultationDuPatient($request, $rendezVous);

        return response()->json([
            'rendezVous' => [
                'id' => $rendezVous->id,
                'name' => $rendezVous->name,
                'email' => $rendezVous->email,
                'date_debut' => $rendezVous->date_debut,
                'date_fin' => $rendezVous->date_fin,
                'motif' => $rendezVous->motif,
                'statut' => $rendezVous->statut,
                'notes' => $rendezVous->notes,
                'client_id' => $rendezVous->client_id,
                'medecin_id' => $rendezVous->medecin_id,
                'medecin' => $rendezVous->medecin ? [
                    'id' => $rendezVous->medecin->id,
                    'name' => $rendezVous->medecin->user->name,
                    'telephone' => $rendezVous->medecin->telephone,
                    'specialite' => $rendezVous->medecin->specialite->nom ?? null,
                    'hopital' => $rendezVous->medecin->hopital ? [
                        'id' => $rendezVous->medecin->hopital->id,
                        'name' => $rendezVous->medecin->hopital->name,
                        'adresse' => $rendezVous->medecin->hopital->adresse,
                        'telephone' => $rendezVous->medecin->hopital->telephone,
                    ] : null,
                ] : null,
                'consultation' => $consultation,
            ]
        ]);
    }

    /**
     * Client annule son rendez-vous
     */
    public function cancel(Request $request, $id)
    {
        $rendezVous = RendezVous::findOrFail($id);
        $client = $request->user();

        // Vérifier que le client est propriétaire du rendez-vous
        if ($rendezVous->client_id !== $client->id && $rendezVous->author_id !== $client->id) {
            return response()->json(['message' => 'Non autorisé'], 403);
        }

        RendezVousStatutGuard::verifier($rendezVous, 'annulé');
        $rendezVous->update(['statut' => 'annulé']);

        return response()->json([
            'message' => 'Rendez-vous annulé avec succès',
            'rendez_vous' => $rendezVous
        ], 200);
    }

    // Consultation liée au rendez-vous, réservée au patient qui l'a pris.
    private function consultationDuPatient(Request $request, RendezVous $rendezVous): ?array
    {
        if (! RendezVous::duClient($request->user()->id)->whereKey($rendezVous->id)->exists()) {
            return null;
        }

        $consultation = $rendezVous->consultation()
            ->with([
                'facture.lignes',
                'rendezVous.medecin.user',
                'rendezVous.medecin.specialite',
                'rendezVous.medecin.hopital',
                'rendezVous.documents.medecin.user',
            ])
            ->first();

        return $consultation ? $this->formatter->formater($consultation) : null;
    }
}
