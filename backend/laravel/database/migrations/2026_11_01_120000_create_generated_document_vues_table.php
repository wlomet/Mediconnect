<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('generated_document_vues', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('generated_document_id')->constrained('generated_documents')->cascadeOnDelete();
            $table->timestamp('vu_at');
            $table->primary(['user_id', 'generated_document_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generated_document_vues');
    }
};
