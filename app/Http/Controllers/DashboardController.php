<?php

namespace App\Http\Controllers;

use App\Models\ApiKey;
use App\Models\Site;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $sites      = Site::latest()->get();
        $apiKeyCount = ApiKey::count();

        $configuredCount = $sites->filter(fn($s) => !empty($s->widget_config))->count();

        return Inertia::render('Dashboard', [
            'stats' => [
                'siteCount'       => $sites->count(),
                'configuredCount' => $configuredCount,
                'apiKeyCount'     => $apiKeyCount,
            ],
            'sites' => $sites->map(fn($s) => [
                'id'               => $s->id,
                'name'             => $s->name,
                'url'              => $s->url,
                'site_id'          => $s->site_id,
                'azure_index_name' => $s->azure_index_name,
                'has_widget'       => !empty($s->widget_config),
                'created_at'       => $s->created_at->toDateString(),
            ]),
        ]);
    }
}
