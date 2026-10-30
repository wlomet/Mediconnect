<?php

namespace App\Http\Controllers\Directeur;

use App\Rules\PhoneNumber;

use App\Http\Controllers\Controller;
use App\Models\Hopital;
use Illuminate\Http\Request;

class HopitalController extends Controller
{
    /**
     * Récupérer tous les hôpitals
     */
    public function index()
    {
        $hopitals = Hopital::orderBy('name', 'asc')->get();
        return response()->json([
            'hopitals' => $hopitals,
            'total' => count($hopitals)
        ]);
    }

    /**
     * Créer un nouvel hôpital
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'adresse' => 'required|string|max:255',
            'telephone' => ['required', 'string', 'max:20', new PhoneNumber],
            'ville' => 'required|string|max:255',
        ], [
            'name.required' => 'Le nom de l\'hôpital est requis',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'adresse.required' => 'L\'adresse est requise',
            'adresse.max' => 'L\'adresse ne peut pas dépasser 255 caractères',
            'telephone.required' => 'Le téléphone est requis',
            'telephone.max' => 'Le téléphone ne peut pas dépasser 20 caractères',
            'ville.required' => 'La ville est requise',
            'ville.max' => 'La ville ne peut pas dépasser 255 caractères',
        ]);

        $hopital = Hopital::create([
            'name' => $request->name,
            'adresse' => $request->adresse,
            'telephone' => $request->telephone,
            'ville' => $request->ville,
        ]);

        return response()->json([
            'message' => 'Hôpital créé avec succès',
            'hopital' => $hopital
        ], 201);
    }

    /**
     * Récupérer un hôpital spécifique
     */
    public function show($id)
    {
        $hopital = Hopital::findOrFail($id);
        return response()->json($hopital);
    }

    /**
     * Mettre à jour un hôpital
     */
    public function update(Request $request, $id)
    {
        $hopital = Hopital::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'adresse' => 'sometimes|required|string|max:255',
            'telephone' => ['sometimes', 'required', 'string', 'max:20', new PhoneNumber],
            'ville' => 'sometimes|required|string|max:255',
        ], [
            'name.required' => 'Le nom de l\'hôpital est requis',
            'name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'adresse.required' => 'L\'adresse est requise',
            'adresse.max' => 'L\'adresse ne peut pas dépasser 255 caractères',
            'telephone.required' => 'Le téléphone est requis',
            'telephone.max' => 'Le téléphone ne peut pas dépasser 20 caractères',
            'ville.required' => 'La ville est requise',
            'ville.max' => 'La ville ne peut pas dépasser 255 caractères',
        ]);

        $hopital->update($request->only(['name', 'adresse', 'telephone', 'ville']));

        return response()->json([
            'message' => 'Hôpital mis à jour avec succès',
            'hopital' => $hopital
        ]);
    }

    /**
     * Supprimer un hôpital
     */
    public function destroy($id)
    {
        $hopital = Hopital::findOrFail($id);
        $hopital->delete();

        return response()->json([
            'message' => 'Hôpital supprimé avec succès'
        ]);
    }
}
