<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AntecedentOption;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AntecedentOptionController extends Controller
{
    public function index()
    {
        $options = AntecedentOption::withCount('clients')->orderBy('id')->get();

        return response()->json([
            'options' => $options->map(fn (AntecedentOption $option) => $this->formater($option))->values(),
            'categories' => $options->pluck('categorie')->unique()->values(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->valider($request);

        $option = AntecedentOption::create($validated + [
            'code' => $this->genererCode($validated['categorie'], $validated['libelle']),
        ]);

        return response()->json([
            'message' => 'Option ajoutée',
            'option' => $this->formater($option->loadCount('clients')),
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $option = AntecedentOption::findOrFail($id);
        $option->update($this->valider($request));

        return response()->json([
            'message' => 'Option mise à jour',
            'option' => $this->formater($option->loadCount('clients')),
        ]);
    }

    // Les antécédents déjà cochés par les patients sont supprimés en cascade (client_antecedent_options).
    public function destroy(int $id)
    {
        AntecedentOption::findOrFail($id)->delete();

        return response()->json(['message' => 'Option supprimée']);
    }

    private function valider(Request $request): array
    {
        return $request->validate([
            'categorie' => 'required|string|max:255',
            'libelle' => 'required|string|max:255',
            'est_aucun' => 'sometimes|boolean',
            'actif' => 'sometimes|boolean',
        ]);
    }

    private function genererCode(string $categorie, string $libelle): string
    {
        $base = Str::slug($categorie, '_') . '_' . Str::slug($libelle, '_');
        $base = trim($base, '_') ?: 'option';

        $code = $base;
        for ($n = 2; AntecedentOption::where('code', $code)->exists(); $n++) {
            $code = $base . '_' . $n;
        }

        return $code;
    }

    private function formater(AntecedentOption $option): array
    {
        return [
            'id' => $option->id,
            'categorie' => $option->categorie,
            'code' => $option->code,
            'libelle' => $option->libelle,
            'est_aucun' => $option->est_aucun,
            'actif' => $option->actif,
            'patients_count' => $option->clients_count ?? 0,
        ];
    }
}
