<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class () extends Migration {
    public function up(): void
    {
        Schema::table('pdf_templates', function (Blueprint $table) {
            $table->foreignId('medecin_profile_id')->nullable()->change();
            $table->foreignId('hopital_id')->nullable()->after('medecin_profile_id')->constrained('hopitals')->cascadeOnDelete();
        });

        Schema::table('pdf_images', function (Blueprint $table) {
            $table->foreignId('medecin_profile_id')->nullable()->change();
            $table->foreignId('hopital_id')->nullable()->after('medecin_profile_id')->constrained('hopitals')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pdf_templates', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hopital_id');
        });

        Schema::table('pdf_images', function (Blueprint $table) {
            $table->dropConstrainedForeignId('hopital_id');
        });
    }
};
