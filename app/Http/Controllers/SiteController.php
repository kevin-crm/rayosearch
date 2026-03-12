<?php

namespace App\Http\Controllers;

use App\Models\Site;
use App\Services\AzureSearchService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Illuminate\Support\Str;

class SiteController extends Controller
{
    public function __construct(private AzureSearchService $azure) {}

    public function index()
    {
        return Inertia::render('Sites/Index', [
            'sites' => Site::latest()->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'             => ['required', 'string', 'max:255'],
            'url'              => ['required', 'url', 'max:255'],
            'azure_index_name' => ['required', 'string', 'max:255'],
            'azure_endpoint'   => ['required', 'url', 'max:500'],
            'azure_api_key'    => ['required', 'string', 'max:1000'],
        ]);

        $result = $this->azure->validateConnection(
            $validated['azure_endpoint'],
            $validated['azure_index_name'],
            $validated['azure_api_key'],
        );

        if (!$result['ok']) {
            throw ValidationException::withMessages([
                'azure_connection' => [$result['error']],
            ]);
        }

        Site::create([
            'name'             => $validated['name'],
            'url'              => $validated['url'],
            'site_id'          => 'site_' . Str::random(16),
            'azure_index_name' => $validated['azure_index_name'],
            'azure_endpoint'   => $validated['azure_endpoint'],
            'azure_api_key'    => $validated['azure_api_key'],
        ]);

        return redirect()->route('sites.index');
    }

    public function show(Site $site)
    {
        return Inertia::render('Sites/Show', [
            'site' => $site,
        ]);
    }

    public function widgetBuilder()
    {
        return Inertia::render('WidgetBuilder', [
            'sites' => Site::latest()->get(),
        ]);
    }

    public function customize(Site $site)
    {
        return Inertia::render('Sites/Customize', [
            'site' => $site,
        ]);
    }

    public function updateWidgetConfig(Request $request, Site $site)
    {
        $request->validate([
            'widget_config'                    => ['required', 'array'],
            'widget_config.template'           => ['required', 'in:minimal,card,block,product'],
            'widget_config.accent'             => ['required', 'string', 'max:20'],
            'widget_config.placeholder'        => ['required', 'string', 'max:200'],
            'widget_config.theme'              => ['required', 'in:light,dark,auto'],
            'widget_config.radius'             => ['required', 'in:sharp,rounded,pill'],
            'widget_config.iconLeft'           => ['required', 'in:none,search,sparkle,search-ai,arrow'],
            'widget_config.iconRight'          => ['required', 'in:none,search,sparkle,search-ai,arrow'],
            'widget_config.bgColor'            => ['nullable', 'string', 'max:20'],
            'widget_config.fieldMap'           => ['nullable', 'array'],
            'widget_config.fieldMap.title'     => ['nullable', 'string', 'max:100'],
            'widget_config.fieldMap.snippet'   => ['nullable', 'string', 'max:100'],
            'widget_config.fieldMap.url'       => ['nullable', 'string', 'max:100'],
            'widget_config.fieldMap.image'     => ['nullable', 'string', 'max:100'],
            'widget_config.fieldMap.price'     => ['nullable', 'string', 'max:100'],
            'widget_config.resultsPageUrl'     => ['nullable', 'string', 'max:500'],
            'widget_config.filterFields'       => ['nullable', 'array'],
            'widget_config.filterFields.*'     => ['string', 'max:100'],
            'widget_config.filtersSidebarBg'   => ['nullable', 'string', 'max:20'],
            'widget_config.resultsPerPage'     => ['nullable', 'integer', 'min:4', 'max:100'],
            'widget_config.resultsLayout'      => ['nullable', 'in:list,grid'],
            'widget_config.cardMinWidth'           => ['nullable', 'integer', 'min:80', 'max:500'],
            'widget_config.cardImageHeight'        => ['nullable', 'integer', 'min:60', 'max:400'],
            'widget_config.resultsCardMinWidth'    => ['nullable', 'integer', 'min:80', 'max:500'],
            'widget_config.resultsCardImageHeight' => ['nullable', 'integer', 'min:60', 'max:400'],
        ]);

        $site->update(['widget_config' => $request->widget_config]);

        return response()->json(['ok' => true]);
    }

    // ── JSON endpoints (no Inertia) ────────────────────────────────────────

    public function stats(Site $site)
    {
        try {
            $result = $this->azure->getStats(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
            );
            // INDEX_NOT_FOUND is a structured non-exception result — forward with 404
            if (isset($result['code']) && $result['code'] === 'INDEX_NOT_FOUND') {
                return response()->json($result, 404);
            }
            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function createIndex(Site $site)
    {
        try {
            $this->azure->createIndex(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
            );
            return response()->json(['ok' => true, 'message' => "Index \"{$site->azure_index_name}\" created successfully."]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function indexSchema(Site $site)
    {
        try {
            $fields = $this->azure->getIndexSchema(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
            );
            return response()->json(['fields' => $fields]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function updateIndexSchema(Request $request, Site $site)
    {
        $request->validate([
            'fields'              => ['required', 'array', 'min:1'],
            'fields.*.name'       => ['required', 'string'],
            'fields.*.type'       => ['required', 'string'],
            'fields.*.key'        => ['boolean'],
            'fields.*.searchable' => ['boolean'],
            'fields.*.filterable' => ['boolean'],
            'fields.*.sortable'   => ['boolean'],
            'fields.*.facetable'  => ['boolean'],
        ]);

        try {
            $this->azure->updateIndex(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
                $request->fields,
            );
            return response()->json(['ok' => true]);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function ingest(Request $request, Site $site)
    {
        $request->validate([
            'documents'   => ['required', 'array', 'min:1', 'max:1000'],
            'documents.*' => ['required', 'array'],
        ]);

        try {
            $result = $this->azure->indexDocuments(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
                $request->documents,
            );
            return response()->json($result);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }

    public function testSearch(Request $request, Site $site)
    {
        $request->validate([
            'query'      => ['required', 'string', 'max:500'],
            'facets'     => ['sometimes', 'array'],
            'facets.*'   => ['string', 'max:100'],
            'filter'     => ['sometimes', 'string', 'max:2000'],
        ]);

        try {
            $results = $this->azure->testSearch(
                $site->azure_endpoint,
                $site->azure_index_name,
                $site->azure_api_key,
                $request->query('query'),
                20,
                $request->input('facets', []),
                $request->input('filter', ''),
            );
            return response()->json($results);
        } catch (\RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }
    }
}
