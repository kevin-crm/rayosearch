<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('click_logs', function (Blueprint $table) {
            $table->id();
            $table->string('site_id')->index();
            $table->string('query')->default('');
            $table->string('result_id')->default('');
            $table->string('result_title')->default('');
            $table->string('result_url')->default('');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('click_logs');
    }
};
