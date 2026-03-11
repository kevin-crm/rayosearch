<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class ApiKeyController extends Controller
{
    public function index()
    {
        return Inertia::render('ApiKeys', [
            'apiKeys' => ApiKey::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
        ]);

        ApiKey::create([
            'name' => $validated['name'],
            'key' => 'asg_' . Str::random(40),
        ]);

        return redirect()->route('api-keys.index');
    }

    public function destroy(ApiKey $apiKey)
    {
        $apiKey->delete();
        return redirect()->route('api-keys.index');
    }
}
