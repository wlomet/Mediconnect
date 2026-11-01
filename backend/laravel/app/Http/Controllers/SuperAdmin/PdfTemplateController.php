<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\SuperAdmin\Concerns\ResolvesPdfOwner;
use App\Models\PdfImage;
use App\Models\PdfTemplate;
use App\Services\PdfDefaultLayout;
use App\Services\PdfScope;
use App\Services\PdfTemplateValidator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PdfTemplateController extends Controller
{
    use ResolvesPdfOwner;

    public function index(Request $request)
    {
        $request->validate([
            'type' => 'nullable|in:ordonnance,facture',
            'owner_type' => 'nullable|in:hopital,medecin',
        ]);

        $modeles = PdfTemplate::with(['hopital:id,name', 'medecin.user:id,name'])
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->input('type')))
            ->when($request->input('owner_type') === 'hopital', fn ($q) => $q->whereNotNull('hopital_id'))
            ->when($request->input('owner_type') === 'medecin', fn ($q) => $q->whereNotNull('medecin_profile_id'))
            ->latest()
            ->get();

        return response()->json([
            'templates' => $modeles->map(fn (PdfTemplate $modele) => $this->formater($modele))->values(),
        ]);
    }

    // Crée un modèle par défaut attribué à un établissement ou à un médecin : le logo doit venir de sa bibliothèque.
    public function storeFromDefault(Request $request)
    {
        $validated = $request->validate([
            'type' => 'required|in:ordonnance,facture',
            'pdf_image_id' => 'required|integer',
            'nom' => 'nullable|string|max:255',
        ]);

        $proprietaire = $this->proprietaireDepuisType($request);

        $logo = PdfScope::applyLibraryOf(PdfImage::query(), $proprietaire)
            ->where('type', PdfImage::TYPE_LOGO)
            ->find($validated['pdf_image_id']);

        if (!$logo) {
            throw ValidationException::withMessages([
                'pdf_image_id' => "Le logo sélectionné n'appartient pas à la bibliothèque de ce propriétaire.",
            ]);
        }

        $modele = PdfTemplate::create($proprietaire + [
            'nom' => $validated['nom'] ?? PdfDefaultLayout::nomPar($validated['type']),
            'type' => $validated['type'],
            'format' => 'A4',
            'layout' => PdfDefaultLayout::forType($validated['type'], $logo->id),
        ]);

        return response()->json([
            'message' => 'Modèle créé',
            'template' => $this->formater($modele->load(['hopital:id,name', 'medecin.user:id,name'])),
        ], 201);
    }

    public function show(int $id)
    {
        $modele = PdfTemplate::with(['hopital:id,name', 'medecin.user:id,name'])->findOrFail($id);

        return response()->json([
            'template' => $this->formater($modele) + ['layout' => $modele->layout],
        ]);
    }

    // Le propriétaire reste celui défini à la création.
    public function update(Request $request, int $id)
    {
        $modele = PdfTemplate::findOrFail($id);
        $proprietaire = [
            'hopital_id' => $modele->hopital_id,
            'medecin_profile_id' => $modele->medecin_profile_id,
        ];

        $validated = PdfTemplateValidator::valider(
            $request,
            PdfScope::applyLibraryOf(PdfImage::query(), $proprietaire)
        );
        $modele->update($validated);
        $modele->refresh()->load(['hopital:id,name', 'medecin.user:id,name']);

        return response()->json([
            'message' => 'Modèle mis à jour',
            'template' => $this->formater($modele) + ['layout' => $modele->layout],
        ]);
    }

    public function destroy(int $id)
    {
        PdfTemplate::findOrFail($id)->delete();

        return response()->json(['message' => 'Modèle supprimé']);
    }

    private function formater(PdfTemplate $modele): array
    {
        $estEtablissement = $modele->hopital_id !== null;

        return [
            'id' => $modele->id,
            'nom' => $modele->nom,
            'type' => $modele->type,
            'format' => $modele->format,
            'hopital_id' => $modele->hopital_id,
            'medecin_profile_id' => $modele->medecin_profile_id,
            'proprietaire_type' => $estEtablissement ? 'hopital' : 'medecin',
            'proprietaire_nom' => $estEtablissement ? $modele->hopital?->name : $modele->medecin?->user?->name,
            'editable' => true,
            'created_at' => $modele->created_at,
            'updated_at' => $modele->updated_at,
        ];
    }
}
