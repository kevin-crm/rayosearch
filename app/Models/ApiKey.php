<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    protected $fillable = ['name', 'key', 'last_used_at'];

    protected $casts = [
        'last_used_at' => 'datetime',
    ];
}
