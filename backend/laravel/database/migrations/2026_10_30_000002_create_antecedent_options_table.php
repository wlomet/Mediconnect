<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class() extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('antecedent_options', function (Blueprint $table) {
            $table->id();
            $table->string('categorie');
            $table->string('code')->unique();
            $table->string('libelle');
            $table->boolean('est_aucun')->default(false);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('antecedent_options');
    }
};
