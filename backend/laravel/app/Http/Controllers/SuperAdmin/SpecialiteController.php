<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Models\Specialite;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class SpecialiteController extends Controller
{
    public function index()
    {
        $specialites = Specialite::withCount('medecinProfiles')->orderBy('nom')->get();

        return response()->json([
            'specialites' => $specialites->map(fn (Specialite $specialite) => $this->formater($specialite))->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->valider($request);

        $specialite = Specialite::create($validated + [
            'slug' => $this->genererSlug($validated['nom']),
        ]);

        return response()->json([
            'message' => 'Spécialité ajoutée',
            'specialite' => $this->formater($specialite->loadCount('medecinProfiles')),
        ], 201);
    }

    // Le slug reste inchangé : il peut servir de filtre dans les pages publiques.
    public function update(Request $request, int $id)
    {
        $specialite = Specialite::findOrFail($id);
        $specialite->update($this->valider($request, $specialite));

        return response()->json([
            'message' => 'Spécialité mise à jour',
            'specialite' => $this->formater($specialite->loadCount('medecinProfiles')),
        ]);
    }

    public function destroy(int $id)
    {
        $specialite = Specialite::withCount('medecinProfiles')->findOrFail($id);

        if ($specialite->medecin_profiles_count > 0) {
            throw new BusinessException(
                "Impossible de supprimer cette spécialité : {$specialite->medecin_profiles_count} médecin(s) l'utilisent.",
                409
            );
        }

        $specialite->delete();

        return response()->json(['message' => 'Spécialité supprimée']);
    }

    private function valider(Request $request, ?Specialite $actuelle = null): array
    {
        return $request->validate([
            'nom' => [
                'required',
                'string',
                'max:255',
                Rule::unique('specialites', 'nom')->ignore($actuelle?->id),
            ],
            'description' => 'nullable|string|max:1000',
        ], [
            'nom.unique' => 'Cette spécialité existe déjà.',
        ]);
    }

    private function genererSlug(string $nom): string
    {
        $base = Str::slug($nom) ?: 'specialite';

        $slug = $base;
        for ($n = 2; Specialite::where('slug', $slug)->exists(); $n++) {
            $slug = $base . '-' . $n;
        }

        return $slug;
    }

    private function formater(Specialite $specialite): array
    {
        return [
            'id' => $specialite->id,
            'nom' => $specialite->nom,
            'slug' => $specialite->slug,
            'description' => $specialite->description,
            'medecins_count' => $specialite->medecin_profiles_count ?? 0,
        ];
    }
}
