<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->boolean('ordonnance_non_generee')->default(false)->after('ordonnance_commentaire');
            $table->boolean('facture_non_generee')->default(false)->after('ordonnance_non_generee');
        });

        // Consultations déjà terminées sans ordonnance ou sans facture : aucun document n'était établi.
        DB::table('consultations')
            ->where('statut', 'terminee')
            ->whereNull('ordonnance_texte')
            ->update(['ordonnance_non_generee' => true]);

        DB::table('consultations')
            ->where('statut', 'terminee')
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('consultation_factures')
                    ->whereColumn('consultation_factures.consultation_id', 'consultations.id');
            })
            ->update(['facture_non_generee' => true]);
    }

    public function down(): void
    {
        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn(['ordonnance_non_generee', 'facture_non_generee']);
        });
    }
};
