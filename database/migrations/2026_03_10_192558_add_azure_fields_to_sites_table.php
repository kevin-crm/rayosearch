<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->string('azure_index_name')->after('site_id');
            $table->string('azure_endpoint')->after('azure_index_name');
            $table->text('azure_api_key')->after('azure_endpoint'); // stored encrypted
        });
    }

    public function down(): void
    {
        Schema::table('sites', function (Blueprint $table) {
            $table->dropColumn(['azure_index_name', 'azure_endpoint', 'azure_api_key']);
        });
    }
};
