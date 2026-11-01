<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('generated_documents', function (Blueprint $table) {
            $table->foreignId('consultation_id')
                ->nullable()
                ->after('rendez_vous_id')
                ->constrained('consultations')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('generated_documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('consultation_id');
        });
    }
};
