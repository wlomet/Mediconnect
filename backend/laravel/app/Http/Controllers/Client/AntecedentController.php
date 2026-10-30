<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\AntecedentOption;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AntecedentController extends Controller
{
    /**
     * Catalogue des options actives, options cochées et commentaire du client.
     */
    public function show(Request $request)
    {
        return response()->json($this->payload($request->user()));
    }

    /**
     * Remplace les options cochées et le commentaire du client.
     */
    public function update(Request $request)
    {
        $client = $request->user();

        $validated = $request->validate([
            'options' => 'present|array',
            'options.*' => [
                'integer',
                'distinct',
                Rule::exists('antecedent_options', 'id')->where('actif', true),
            ],
            'commentaire' => 'nullable|string|max:1000',
        ], [
            'options.*.exists' => 'Une des options sélectionnées est invalide',
            'commentaire.max' => 'Le commentaire ne peut pas dépasser 1000 caractères',
        ]);

        // "Aucun" ne peut pas être combiné avec d'autres options d'une même catégorie
        $conflit = AntecedentOption::whereIn('id', $validated['options'])
            ->get()
            ->groupBy('categorie')
            ->contains(fn($items) => $items->count() > 1 && $items->contains('est_aucun', true));

        if ($conflit) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => [
                    'options' => ['"Aucun" ne peut pas être combiné avec d\'autres options de la même catégorie'],
                ],
            ], 422);
        }

        $commentaire = isset($validated['commentaire']) && trim($validated['commentaire']) !== ''
            ? trim($validated['commentaire'])
            : null;

        DB::transaction(function () use ($client, $validated, $commentaire) {
            $client->antecedentOptions()->sync($validated['options']);
            $client->update(['antecedents_commentaire' => $commentaire]);
        });

        return response()->json($this->payload($client->fresh()));
    }

    private function payload(User $client): array
    {
        $categories = AntecedentOption::actif()
            ->orderBy('id')
            ->get()
            ->groupBy('categorie')
            ->map(fn($items, $categorie) => [
                'categorie' => $categorie,
                'options' => $items->map(fn(AntecedentOption $option) => [
                    'id' => $option->id,
                    'libelle' => $option->libelle,
                    'est_aucun' => $option->est_aucun,
                ])->values(),
            ])
            ->values();

        return [
            'categories' => $categories,
            'selected' => $client->antecedentOptions()->allRelatedIds()->values(),
            'commentaire' => $client->antecedents_commentaire,
        ];
    }
}
