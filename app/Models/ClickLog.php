<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClickLog extends Model
{
    protected $fillable = ['site_id', 'query', 'result_id', 'result_title', 'result_url'];
}
