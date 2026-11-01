<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\GeneratedDocument;
use App\Models\PdfTemplate;
use App\Services\PdfScope;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GeneratedDocumentController extends Controller
{
    public function store(Request $request)
    {
        $profile = $request->user()->medecinProfile;
        abort_unless($profile, 403);

        $validated = $request->validate([
            'pdf' => 'required|file|mimes:pdf|max:5120',
            'type' => 'required|in:ordonnance,facture',
            'pdf_template_id' => 'nullable|integer',
            'donnees' => 'nullable|json',
            'consultation_id' => [
                'required',
                Rule::exists('consultations', 'id')
                    ->where('medecin_profile_id', $profile->id)
                    ->where('statut', Consultation::EN_COURS),
            ],
        ]);

        $consultation = Consultation::find($validated['consultation_id']);

        if (!empty($validated['pdf_template_id'])
            && !PdfScope::applyVisible(PdfTemplate::query(), $request->user())->whereKey($validated['pdf_template_id'])->exists()) {
            throw ValidationException::withMessages(['pdf_template_id' => 'Modèle introuvable.']);
        }

        $file = $request->file('pdf');
        $chemin = $file->store("generated-documents/{$profile->id}", 'local');

        $document = GeneratedDocument::create([
            'medecin_profile_id' => $profile->id,
            'rendez_vous_id' => $consultation->rendez_vous_id,
            'consultation_id' => $consultation->id,
            'pdf_template_id' => $validated['pdf_template_id'] ?? null,
            'type' => $validated['type'],
            'titre' => $validated['type'].'_'.now()->timestamp,
            'chemin' => $chemin,
            'donnees' => isset($validated['donnees']) ? json_decode($validated['donnees'], true) : null,
            'taille' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Document archivé',
            'document' => $document,
        ], 201);
    }
}
