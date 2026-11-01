<?php

namespace App\Services;

use Symfony\Component\HttpFoundation\StreamedResponse;

class CsvExportService
{
    /**
     * Téléchargement CSV (séparateur ;, UTF-8 avec BOM pour Excel).
     *
     * @param  iterable<int, array<int, string|int|float|null>>  $lignes
     */
    public function telecharger(string $nomFichier, array $entetes, iterable $lignes): StreamedResponse
    {
        return response()->streamDownload(function () use ($entetes, $lignes) {
            $sortie = fopen('php://output', 'w');

            fwrite($sortie, "\xEF\xBB\xBF");
            fputcsv($sortie, $entetes, ';', '"', '\\', "\r\n");

            foreach ($lignes as $ligne) {
                fputcsv($sortie, $ligne, ';', '"', '\\', "\r\n");
            }

            fclose($sortie);
        }, $nomFichier, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
