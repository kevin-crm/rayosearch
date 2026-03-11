<?php

namespace App\Http\Controllers;

use App\Models\ClickLog;
use App\Models\SearchLog;
use App\Models\Site;
use App\Services\AzureSearchService;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(private AzureSearchService $azure) {}

    public function search(Request $request)
    {
        $request->validate([
            'site_id' => ['required', 'string'],
            'query'   => ['required', 'string', 'max:500'],
        ]);

        $site = Site::where('site_id', $request->site_id)->first();

        if (!$site) {
            return response()->json([
                'error' => 'Site not found.',
                'code'  => 'SITE_NOT_FOUND',
            ], 404)->withHeaders($this->corsHeaders());
        }

        try {
            $config   = is_array($site->widget_config) ? $site->widget_config : [];
            $fieldMap = is_array($config['fieldMap'] ?? null) ? $config['fieldMap'] : [];

            $results = $this->azure->search(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
                $request->input('query'),
                10,
                $fieldMap,
            );

            SearchLog::create([
                'site_id'       => $site->site_id,
                'query'         => $request->input('query'),
                'results_count' => $results['total'] ?? 0,
            ]);

            return response()->json($results)->withHeaders($this->corsHeaders());
        } catch (\RuntimeException $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'code'  => 'SEARCH_FAILED',
            ], 502)->withHeaders($this->corsHeaders());
        }
    }

    public function click(Request $request)
    {
        $request->validate([
            'site_id'      => ['required', 'string'],
            'query'        => ['nullable', 'string', 'max:500'],
            'result_id'    => ['nullable', 'string', 'max:255'],
            'result_title' => ['nullable', 'string', 'max:500'],
            'result_url'   => ['nullable', 'string', 'max:2000'],
        ]);

        $site = Site::where('site_id', $request->site_id)->first();

        if ($site) {
            ClickLog::create([
                'site_id'      => $site->site_id,
                'query'        => $request->input('query', ''),
                'result_id'    => $request->input('result_id', ''),
                'result_title' => $request->input('result_title', ''),
                'result_url'   => $request->input('result_url', ''),
            ]);
        }

        return response()->json(['ok' => true])->withHeaders($this->corsHeaders());
    }

    // Allow preflight for the embed widget served from external origins
    public function preflight()
    {
        return response('', 204)->withHeaders($this->corsHeaders());
    }

    private function corsHeaders(): array
    {
        return [
            'Access-Control-Allow-Origin'  => '*',
            'Access-Control-Allow-Methods' => 'GET, OPTIONS',
            'Access-Control-Allow-Headers' => 'Content-Type, X-Requested-With',
        ];
    }
}
