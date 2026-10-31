<?php

namespace App\Services;

/**
 * Modèles par défaut d'ordonnance et de facture (A4, coordonnées en points).
 * Seul le logo reste à fournir par l'utilisateur.
 */
class PdfDefaultLayout
{
    public const TYPES = ['ordonnance', 'facture'];

    public static function nomPar(string $type): string
    {
        return $type === 'facture' ? 'Facture par défaut' : 'Ordonnance par défaut';
    }

    public static function forType(string $type, int $pdfImageId): array
    {
        $elements = $type === 'facture'
            ? self::facture()
            : self::ordonnance();

        array_unshift($elements, self::logo($pdfImageId));

        return ['format' => 'A4', 'elements' => $elements];
    }

    private static function ordonnance(): array
    {
        return [
            ...self::enTete(),
            self::texte('titre', 40, 150, 515, 30, 'ORDONNANCE', ['fontSize' => 18, 'bold' => true, 'align' => 'center']),
            self::texte('patient-label', 40, 200, 60, 20, 'Patient :', ['fontSize' => 12, 'bold' => true]),
            self::variable('patient-nom', 100, 200, 300, 20, 'patient.nom', ['fontSize' => 12]),
            self::variable('date', 380, 200, 175, 20, 'date_jour', ['fontSize' => 12, 'align' => 'right']),
            self::saisie('prescription', 40, 250, 515, 500, 'Prescription'),
            self::texte('signature', 40, 780, 515, 20, 'Signature et cachet', ['fontSize' => 9, 'align' => 'right']),
        ];
    }

    private static function facture(): array
    {
        return [
            ...self::enTete(),
            self::texte('titre', 40, 150, 515, 30, 'FACTURE', ['fontSize' => 18, 'bold' => true, 'align' => 'center']),
            self::texte('patient-label', 40, 200, 60, 20, 'Patient :', ['fontSize' => 12, 'bold' => true]),
            self::variable('patient-nom', 100, 200, 300, 20, 'patient.nom', ['fontSize' => 12]),
            self::variable('date', 380, 200, 175, 20, 'date_jour', ['fontSize' => 12, 'align' => 'right']),
            self::variable('motif', 40, 225, 515, 18, 'rendez_vous.motif', ['fontSize' => 10]),
            [
                'id' => 'lignes',
                'type' => 'tableau',
                'x' => 40, 'y' => 270, 'width' => 515, 'height' => 300,
                'fontSize' => 11, 'bold' => false, 'color' => '#000000', 'align' => 'left',
                'key' => 'lignes',
                'label' => 'Prestations',
                'columns' => [
                    ['key' => 'designation', 'label' => 'Désignation'],
                    ['key' => 'quantite', 'label' => 'Quantité'],
                    ['key' => 'prix', 'label' => 'Prix'],
                ],
            ],
            self::saisie('total', 300, 590, 255, 24, 'Total', ['fontSize' => 13, 'bold' => true, 'align' => 'right']),
            self::texte('signature', 40, 780, 515, 20, 'Signature et cachet', ['fontSize' => 9, 'align' => 'right']),
        ];
    }

    private static function enTete(): array
    {
        return [
            self::variable('medecin-nom', 360, 30, 195, 22, 'medecin.nom', ['fontSize' => 13, 'bold' => true, 'align' => 'right']),
            self::variable('medecin-specialite', 360, 54, 195, 18, 'medecin.specialite', ['fontSize' => 10, 'align' => 'right']),
            self::variable('medecin-adresse', 360, 72, 195, 16, 'medecin.adresse', ['fontSize' => 9, 'align' => 'right']),
            self::variable('medecin-ville', 360, 88, 195, 16, 'medecin.ville', ['fontSize' => 9, 'align' => 'right']),
            self::variable('medecin-telephone', 360, 104, 195, 16, 'medecin.telephone', ['fontSize' => 9, 'align' => 'right']),
        ];
    }

    private static function logo(int $pdfImageId): array
    {
        return [
            'id' => 'logo',
            'type' => 'image',
            'x' => 40, 'y' => 30, 'width' => 160, 'height' => 80,
            'fontSize' => 12, 'bold' => false, 'color' => '#000000', 'align' => 'left',
            'pdf_image_id' => $pdfImageId,
        ];
    }

    private static function texte(string $id, float $x, float $y, float $w, float $h, string $text, array $style = []): array
    {
        return self::base($id, 'texte', $x, $y, $w, $h, $style) + ['text' => $text];
    }

    private static function variable(string $id, float $x, float $y, float $w, float $h, string $source, array $style = []): array
    {
        return self::base($id, 'variable', $x, $y, $w, $h, $style) + ['source' => $source];
    }

    private static function saisie(string $key, float $x, float $y, float $w, float $h, string $label, array $style = []): array
    {
        return self::base($key, 'saisie', $x, $y, $w, $h, $style) + ['key' => $key, 'label' => $label];
    }

    private static function base(string $id, string $type, float $x, float $y, float $w, float $h, array $style): array
    {
        return [
            'id' => $id,
            'type' => $type,
            'x' => $x,
            'y' => $y,
            'width' => $w,
            'height' => $h,
            'fontSize' => $style['fontSize'] ?? 11,
            'bold' => $style['bold'] ?? false,
            'color' => '#000000',
            'align' => $style['align'] ?? 'left',
        ];
    }
}
