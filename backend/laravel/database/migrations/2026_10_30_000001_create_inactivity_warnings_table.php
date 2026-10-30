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
        Schema::create('inactivity_warnings', function (Blueprint $table) {
            $table->id();
            $table->string('subject_type', 20); // 'user' ou 'hopital'
            $table->unsignedBigInteger('subject_id');
            $table->date('deadline');
            $table->timestamp('sent_at');
            $table->unique(['subject_type', 'subject_id', 'deadline']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inactivity_warnings');
    }
};
