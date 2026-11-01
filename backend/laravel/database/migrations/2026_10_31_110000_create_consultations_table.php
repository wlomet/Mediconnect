<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::create('consultations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medecin_profile_id')->constrained('medecin_profiles')->cascadeOnDelete();
            $table->foreignId('rendez_vous_id')->unique()->constrained('rendez_vous')->restrictOnDelete();
            $table->enum('statut', ['en_cours', 'abandonnee', 'terminee'])->default('en_cours');
            $table->dateTime('started_at');
            $table->dateTime('heure_debut_reelle');
            $table->dateTime('ended_at')->nullable();
            $table->dateTime('abandoned_at')->nullable();
            $table->text('abandon_motif')->nullable();
            $table->text('ordonnance_texte')->nullable();
            // VIRTUAL : une colonne STORED interdit ON DELETE CASCADE sur medecin_profile_id (erreur 1215).
            $table->unsignedBigInteger('en_cours_lock')
                ->nullable()
                ->virtualAs("CASE WHEN statut = 'en_cours' THEN medecin_profile_id ELSE NULL END");
            $table->unique('en_cours_lock');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultations');
    }
};
