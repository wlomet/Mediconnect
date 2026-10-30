<?php

namespace Database\Seeders;

use App\Models\AntecedentOption;
use Illuminate\Database\Seeder;

class AntecedentOptionSeeder extends Seeder
{
    public function run(): void
    {
        // Catégorie => [préfixe du code, options (slug => libellé)]
        $catalogue = [
            'Allergies' => ['allergies', [
                'medicaments' => 'Médicaments',
                'aliments' => 'Aliments',
                'pollens' => 'Pollens',
                'acariens' => 'Acariens',
                'latex' => 'Latex',
                'piqures' => "Piqûres d'insectes",
                'produits_anesthesie' => 'Produits de contraste ou anesthésie',
            ]],
            'Accidents' => ['accidents', [
                'route' => 'Accident de la route',
                'travail' => 'Accident du travail',
                'chute' => 'Chute',
                'sport' => 'Accident de sport',
                'domestique' => 'Accident domestique',
                'brulure' => 'Brûlure',
                'fracture' => 'Fracture',
            ]],
            'Maladies chroniques' => ['maladies_chroniques', [
                'diabete' => 'Diabète',
                'hypertension' => 'Hypertension',
                'asthme' => 'Asthme',
                'epilepsie' => 'Épilepsie',
                'maladie_cardiaque' => 'Maladie cardiaque',
                'insuffisance_renale' => 'Insuffisance rénale',
                'thyroide' => 'Maladie thyroïdienne',
                'cancer' => 'Cancer',
                'vih_hepatite' => 'VIH / Hépatite',
                'auto_immune' => 'Maladie auto-immune',
            ]],
            'Antécédents chirurgicaux' => ['chirurgicaux', [
                'appendicectomie' => 'Appendicectomie',
                'cholecystectomie' => 'Cholécystectomie',
                'chirurgie_cardiaque' => 'Chirurgie cardiaque',
                'chirurgie_orthopedique' => 'Chirurgie orthopédique',
                'chirurgie_digestive' => 'Chirurgie digestive',
                'cesarienne' => 'Césarienne',
            ]],
            'Antécédents familiaux' => ['familiaux', [
                'diabete' => 'Diabète',
                'cancer' => 'Cancer',
                'cardiovasculaire' => 'Maladie cardiovasculaire',
                'hypertension' => 'Hypertension',
                'genetique' => 'Maladie génétique',
            ]],
            'Traitements en cours' => ['traitements', [
                'anticoagulants' => 'Anticoagulants',
                'corticoides' => 'Corticoïdes',
                'hormonal' => 'Traitement hormonal',
                'antidepresseurs' => 'Antidépresseurs',
                'insuline' => 'Insuline',
            ]],
            'Vaccinations' => ['vaccinations', [
                'dtp' => 'DTP',
                'ror' => 'ROR',
                'hepatite_b' => 'Hépatite B',
                'grippe' => 'Grippe',
                'covid19' => 'COVID-19',
            ]],
        ];

        foreach ($catalogue as $categorie => [$prefixe, $options]) {
            // "Aucun" est proposé en première position de chaque catégorie
            $options = ['aucun' => 'Aucun'] + $options;

            foreach ($options as $slug => $libelle) {
                AntecedentOption::updateOrCreate(
                    ['code' => $prefixe . '_' . $slug],
                    [
                        'categorie' => $categorie,
                        'libelle' => $libelle,
                        'est_aucun' => $slug === 'aucun',
                        'actif' => true,
                    ]
                );
            }
        }
    }
}
