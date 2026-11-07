<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        DB::statement("ALTER TABLE consultations MODIFY statut ENUM('en_cours', 'en_attente', 'abandonnee', 'terminee') NOT NULL DEFAULT 'en_cours'");

        Schema::table('consultations', function (Blueprint $table) {
            $table->dateTime('paused_at')->nullable()->after('abandon_motif');
        });
    }

    public function down(): void
    {
        DB::table('consultations')
            ->where('statut', 'en_attente')
            ->update(['statut' => 'abandonnee', 'abandoned_at' => DB::raw('COALESCE(paused_at, NOW())')]);

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn('paused_at');
        });

        DB::statement("ALTER TABLE consultations MODIFY statut ENUM('en_cours', 'abandonnee', 'terminee') NOT NULL DEFAULT 'en_cours'");
    }
};
