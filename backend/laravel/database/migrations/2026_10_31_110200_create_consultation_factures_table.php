<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::create('consultation_factures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_id')->unique()->constrained('consultations')->cascadeOnDelete();
            $table->decimal('total', 12, 2)->default(0);
            $table->timestamps();
        });

        Schema::create('consultation_facture_lignes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('consultation_facture_id')->constrained('consultation_factures')->cascadeOnDelete();
            $table->string('libelle');
            $table->decimal('quantite', 10, 2);
            $table->decimal('prix_unitaire', 12, 2);
            $table->decimal('total', 12, 2);
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_facture_lignes');
        Schema::dropIfExists('consultation_factures');
    }
};
