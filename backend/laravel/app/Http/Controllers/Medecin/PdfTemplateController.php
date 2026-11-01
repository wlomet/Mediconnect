<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\PdfImage;
use App\Models\PdfTemplate;
use App\Services\PdfDefaultLayout;
use App\Services\PdfScope;
use App\Services\PdfTemplateValidator;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PdfTemplateController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $request->validate(['type' => 'nullable|in:ordonnance,facture']);

        $templates = PdfScope::applyVisible(PdfTemplate::query(), $user)
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->input('type')))
            ->latest()
            ->get(['id', 'nom', 'type', 'format', 'medecin_profile_id', 'hopital_id', 'created_at', 'updated_at']);

        $templates->each(fn (PdfTemplate $template) => $template->setAttribute('editable', PdfScope::canWrite($template, $user)));

        return response()->json([
            'templates' => $templates,
            'etablissement' => PdfScope::etablissementId($user) !== null,
        ]);
    }

    public function store(Request $request)
    {
        $owner = PdfScope::ownerAttributes($request->user());
        abort_unless($owner, 403);

        $validated = $this->validateTemplate($request);

        $template = PdfTemplate::create($owner + $validated);

        return response()->json([
            'message' => 'Modèle créé',
            'template' => $template,
        ], 201);
    }

    // Crée un modèle à partir du modèle par défaut : seul le logo est requis.
    public function storeFromDefault(Request $request)
    {
        $user = $request->user();
        $owner = PdfScope::ownerAttributes($user);
        abort_unless($owner, 403);

        $validated = $request->validate([
            'type' => 'required|in:ordonnance,facture',
            'pdf_image_id' => 'required|integer',
            'nom' => 'nullable|string|max:255',
        ]);

        $logo = PdfScope::applyImageLibrary(PdfImage::query(), $user)
            ->where('type', PdfImage::TYPE_LOGO)
            ->find($validated['pdf_image_id']);
        if (!$logo) {
            throw ValidationException::withMessages([
                'pdf_image_id' => "Le logo sélectionné n'existe pas dans votre bibliothèque de logos.",
            ]);
        }

        $template = PdfTemplate::create($owner + [
            'nom' => $validated['nom'] ?? PdfDefaultLayout::nomPar($validated['type']),
            'type' => $validated['type'],
            'format' => 'A4',
            'layout' => PdfDefaultLayout::forType($validated['type'], $logo->id),
        ]);

        return response()->json([
            'message' => 'Modèle par défaut créé',
            'template' => $template,
        ], 201);
    }

    public function show(Request $request, int $id)
    {
        $template = PdfScope::applyVisible(PdfTemplate::query(), $request->user())->findOrFail($id);
        $template->setAttribute('editable', PdfScope::canWrite($template, $request->user()));

        return response()->json(['template' => $template]);
    }

    public function update(Request $request, int $id)
    {
        $template = $this->findWritable($request, $id);
        $template->update($this->validateTemplate($request));

        return response()->json([
            'message' => 'Modèle mis à jour',
            'template' => $template->fresh(),
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $template = $this->findWritable($request, $id);
        $template->delete();

        return response()->json(['message' => 'Modèle supprimé']);
    }

    private function findWritable(Request $request, int $id): PdfTemplate
    {
        return PdfScope::applyWritable(PdfTemplate::query(), $request->user())->findOrFail($id);
    }

    private function validateTemplate(Request $request): array
    {
        return PdfTemplateValidator::valider($request, PdfScope::applyImageLibrary(PdfImage::query(), $request->user()));
    }
}
