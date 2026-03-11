<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Site extends Model
{
    protected $fillable = [
        'name', 'url', 'site_id',
        'azure_index_name', 'azure_endpoint', 'azure_api_key',
        'widget_config',
    ];

    protected $casts = [
        'azure_api_key'  => 'encrypted',
        'widget_config'  => 'array',
    ];

    protected $hidden = ['azure_api_key'];
}
