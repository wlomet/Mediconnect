<?php

namespace App\Http\Controllers\Medecin;

use App\Http\Controllers\Controller;
use App\Models\PdfImage;
use App\Services\PdfScope;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PdfImageController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['type' => 'nullable|in:logo,image']);

        $images = PdfScope::applyImageLibrary(PdfImage::query(), $request->user())
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->input('type')))
            ->latest()
            ->get(['id', 'nom', 'type', 'mime', 'taille', 'hopital_id', 'created_at']);

        return response()->json(['images' => $images]);
    }

    public function store(Request $request)
    {
        $owner = PdfScope::imageOwnerAttributes($request->user());
        abort_unless($owner, 403);

        $validated = $request->validate([
            'image' => 'required|file|image|mimes:png,jpg,jpeg|max:2048',
            'type' => 'required|in:logo,image',
        ]);

        $file = $request->file('image');
        $chemin = $file->store(PdfScope::imageFolder($owner), 'local');

        $image = PdfImage::create($owner + [
            'type' => $validated['type'],
            'nom' => $file->getClientOriginalName(),
            'chemin' => $chemin,
            'mime' => $file->getMimeType(),
            'taille' => $file->getSize(),
        ]);

        return response()->json([
            'message' => 'Image ajoutée à la bibliothèque',
            'image' => $image,
        ], 201);
    }

    public function file(Request $request, int $id)
    {
        $image = PdfScope::applyImageLibrary(PdfImage::query(), $request->user())->findOrFail($id);
        abort_unless(Storage::disk('local')->exists($image->chemin), 404);

        return response()->file(storage_path('app/' . $image->chemin), [
            'Content-Type' => $image->mime,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $image = PdfScope::applyImageLibrary(PdfImage::query(), $request->user())->findOrFail($id);
        Storage::disk('local')->delete($image->chemin);
        $image->delete();

        return response()->json(['message' => 'Image supprimée']);
    }
}
