<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SearchLog extends Model
{
    protected $fillable = ['site_id', 'query', 'results_count'];
}
