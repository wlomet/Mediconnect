<?php

namespace App\Services;

use App\Models\PdfImage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Validation commune des modèles PDF (médecin, directeur, superadmin).
 */
class PdfTemplateValidator
{
    /**
     * @param  Builder  $bibliotheque  logos utilisables par le propriétaire du modèle
     */
    public static function valider(Request $request, Builder $bibliotheque): array
    {
        $validated = $request->validate([
            'nom' => 'required|string|max:255',
            'type' => 'required|in:ordonnance,facture',
            'format' => 'nullable|in:A4',
            'layout' => 'required|array',
            'layout.format' => 'nullable|in:A4',
            'layout.elements' => 'present|array',
            'layout.elements.*.id' => 'nullable',
            'layout.elements.*.type' => 'required|in:texte,image,variable,saisie,tableau',
            'layout.elements.*.x' => 'nullable|numeric',
            'layout.elements.*.y' => 'nullable|numeric',
            'layout.elements.*.width' => 'nullable|numeric|min:1',
            'layout.elements.*.height' => 'nullable|numeric|min:1',
            'layout.elements.*.fontSize' => 'nullable|numeric|min:1|max:200',
            'layout.elements.*.bold' => 'nullable|boolean',
            'layout.elements.*.color' => 'nullable|string|max:9',
            'layout.elements.*.align' => 'nullable|in:left,center,right',
            'layout.elements.*.text' => 'nullable|string|max:5000',
            'layout.elements.*.source' => 'nullable|string|max:255',
            'layout.elements.*.key' => 'nullable|string|max:100',
            'layout.elements.*.label' => 'nullable|string|max:255',
            'layout.elements.*.columns' => 'nullable|array',
            'layout.elements.*.columns.*.key' => 'required|string|max:100',
            'layout.elements.*.columns.*.label' => 'nullable|string|max:255',
            'layout.elements.*.pdf_image_id' => 'nullable|integer',
        ]);

        $imageIds = collect($validated['layout']['elements'])
            ->pluck('pdf_image_id')
            ->filter()
            ->unique()
            ->values();

        if ($imageIds->isNotEmpty()) {
            $owned = (clone $bibliotheque)
                ->whereIn('id', $imageIds)
                ->count();

            if ($owned !== $imageIds->count()) {
                throw ValidationException::withMessages([
                    'layout' => "Un logo sélectionné n'appartient pas à la bibliothèque de ce modèle.",
                ]);
            }
        }

        $validated['format'] = $validated['format'] ?? 'A4';

        return $validated;
    }
}
