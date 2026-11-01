<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\GeneratedDocument;
use App\Models\PdfTemplate;
use App\Models\RendezVous;
use App\Services\PdfScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GeneratedDocumentController extends Controller
{
    public function index(Request $request)
    {
        $profile = $request->user()->medecinProfile;
        abort_unless($profile, 403);

        $documents = GeneratedDocument::where('medecin_profile_id', $profile->id)
            ->when($request->filled('rendez_vous_id'), fn ($query) => $query->where('rendez_vous_id', $request->integer('rendez_vous_id')))
            ->when($request->filled('consultation_id'), fn ($query) => $query->where('consultation_id', $request->integer('consultation_id')))
            ->latest()
            ->get(['id', 'rendez_vous_id', 'consultation_id', 'pdf_template_id', 'type', 'titre', 'taille', 'created_at', 'updated_at']);

        return response()->json(['documents' => $documents]);
    }

    public function store(Request $request)
    {
        $profile = $request->user()->medecinProfile;
        abort_unless($profile, 403);

        $validated = $request->validate([
            'pdf' => 'required|file|mimes:pdf|max:5120',
            'type' => 'required|in:ordonnance,facture',
            'titre' => 'required|string|max:255',
            'rendez_vous_id' => [
                'nullable',
                Rule::exists('rendez_vous', 'id')->where('medecin_id', $profile->id),
            ],
            'pdf_template_id' => 'nullable|integer',
            'donnees' => 'nullable|json',
            'consultation_id' => [
                'nullable',
                Rule::exists('consultations', 'id')
                    ->where('medecin_profile_id', $profile->id)
                    ->where('statut', Consultation::EN_COURS),
            ],
        ]);

        $consultation = isset($validated['consultation_id']) ? Consultation::find($validated['consultation_id']) : null;

        if ($consultation && isset($validated['rendez_vous_id']) && (int) $validated['rendez_vous_id'] !== $consultation->rendez_vous_id) {
            throw ValidationException::withMessages(['rendez_vous_id' => 'Le rendez-vous ne correspond pas à la consultation.']);
        }

        $rendezVousId = $validated['rendez_vous_id'] ?? $consultation?->rendez_vous_id;

        if (!empty($validated['pdf_template_id'])
            && !PdfScope::applyVisible(PdfTemplate::query(), $request->user())->whereKey($validated['pdf_template_id'])->exists()) {
            throw ValidationException::withMessages(['pdf_template_id' => 'Modèle introuvable.']);
        }

        $file = $request->file('pdf');
        $chemin = $file->store("generated-documents/{$profile->id}", 'local');

        $document = GeneratedDocument::create([
            'medecin_profile_id' => $profile->id,
            'rendez_vous_id' => $rendezVousId,
            'consultation_id' => $consultation?->id,
            'pdf_template_id' => $validated['pdf_template_id'] ?? null,
            'type' => $validated['type'],
            'titre' => $validated['titre'],
            'chemin' => $chemin,
            'donnees' => isset($validated['donnees']) ? json_decode($validated['donnees'], true) : null,
            'taille' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Document archivé',
            'document' => $document,
        ], 201);
    }

    // Remplacement du PDF sans historique : l'ancien fichier est supprimé.
    public function update(Request $request, int $id)
    {
        $document = $this->findOwned($request, $id);

        $validated = $request->validate([
            'titre' => 'nullable|string|max:255',
            'pdf' => 'nullable|file|mimes:pdf|max:5120',
        ]);

        if (isset($validated['titre'])) {
            $document->titre = $validated['titre'];
        }

        if ($request->hasFile('pdf')) {
            $file = $request->file('pdf');
            Storage::disk('local')->delete($document->chemin);
            $document->chemin = $file->store("generated-documents/{$document->medecin_profile_id}", 'local');
            $document->taille = $file->getSize();
        }

        $document->save();

        return response()->json([
            'message' => 'Document mis à jour',
            'document' => $document->fresh(),
        ]);
    }

    public function download(Request $request, int $id)
    {
        $document = $this->findOwned($request, $id);
        abort_unless(Storage::disk('local')->exists($document->chemin), 404);

        return response()->file(storage_path('app/' . $document->chemin), [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function findOwned(Request $request, int $id): GeneratedDocument
    {
        $profile = $request->user()->medecinProfile;
        abort_unless($profile, 403);

        return GeneratedDocument::where('medecin_profile_id', $profile->id)->findOrFail($id);
    }
}
