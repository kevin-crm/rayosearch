<?php

namespace App\Http\Controllers;

use App\Models\ClickLog;
use App\Models\SearchLog;
use App\Models\Site;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $siteId = $request->query('site');
        $days   = (int) ($request->query('days', 30));
        $days   = in_array($days, [7, 14, 30, 90]) ? $days : 30;
        $since  = now()->subDays($days)->startOfDay();

        $sites = Site::orderBy('name')->get(['name', 'site_id']);

        // Base queries scoped to site + window
        $searchQ = SearchLog::where('created_at', '>=', $since);
        $clickQ  = ClickLog::where('created_at', '>=', $since);
        if ($siteId) {
            $searchQ = $searchQ->where('site_id', $siteId);
            $clickQ  = $clickQ->where('site_id', $siteId);
        }

        // Summary stats
        $totalSearches    = (clone $searchQ)->count();
        $totalClicks      = (clone $clickQ)->count();
        $zeroResultCount  = (clone $searchQ)->where('results_count', 0)->count();
        $ctr = $totalSearches > 0 ? round($totalClicks / $totalSearches * 100, 1) : 0;

        // Search volume by day
        $volumeRaw = (clone $searchQ)
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('COUNT(*) as count'))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->keyBy('date');

        $volume = [];
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $volume[] = ['date' => $date, 'count' => $volumeRaw[$date]->count ?? 0];
        }

        // Top queries
        $topQueries = (clone $searchQ)
            ->select('query', DB::raw('COUNT(*) as count'), DB::raw('MIN(results_count) as min_results'))
            ->groupBy('query')
            ->orderByDesc('count')
            ->limit(20)
            ->get()
            ->map(fn($r) => [
                'query'       => $r->query,
                'count'       => $r->count,
                'has_results' => $r->min_results > 0,
            ]);

        // Zero-result queries
        $zeroQueries = (clone $searchQ)
            ->where('results_count', 0)
            ->select('query', DB::raw('COUNT(*) as count'))
            ->groupBy('query')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn($r) => ['query' => $r->query, 'count' => $r->count]);

        // Top clicked results
        $topClicked = (clone $clickQ)
            ->whereNotNull('result_title')
            ->where('result_title', '!=', '')
            ->select('result_title', 'result_url', DB::raw('COUNT(*) as count'))
            ->groupBy('result_title', 'result_url')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(fn($r) => [
                'title' => $r->result_title,
                'url'   => $r->result_url,
                'count' => $r->count,
            ]);

        return Inertia::render('Analytics', [
            'sites'          => $sites,
            'activeSiteId'   => $siteId,
            'days'           => $days,
            'stats'          => compact('totalSearches', 'totalClicks', 'zeroResultCount', 'ctr'),
            'volume'         => $volume,
            'topQueries'     => $topQueries,
            'zeroQueries'    => $zeroQueries,
            'topClicked'     => $topClicked,
        ]);
    }
}
