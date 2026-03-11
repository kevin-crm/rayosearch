<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class IndexingController extends Controller
{
    public function sync(Request $request)
    {
        // Dispatch sync job here in future
        return back()->with('success', 'Sync started');
    }
}
