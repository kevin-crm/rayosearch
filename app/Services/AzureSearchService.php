<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class AzureSearchService
{
    private const API_VERSION = '2023-11-01';

    /**
     * Validate that the Azure AI Search credentials are correct and the index exists.
     * Returns ['ok' => true] or ['ok' => false, 'error' => '...'].
     */
    public function validateConnection(string $endpoint, string $indexName, string $apiKey): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}?api-version=" . self::API_VERSION;

        try {
            $response = Http::timeout(10)
                ->withHeaders(['api-key' => $apiKey])
                ->get($url);

            if ($response->successful()) {
                return ['ok' => true];
            }

            $status = $response->status();
            $body   = $response->json();

            return match ($status) {
                401 => ['ok' => false, 'error' => 'Authentication failed — check your Azure API key.'],
                403 => ['ok' => false, 'error' => 'Access denied — the API key does not have permission to access this resource.'],
                404 => ['ok' => false, 'error' => "Index \"{$indexName}\" was not found in this Azure AI Search service. Check the index name and endpoint."],
                default => ['ok' => false, 'error' => $body['error']['message'] ?? "Azure returned HTTP {$status}."],
            };
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            return ['ok' => false, 'error' => 'Could not reach the Azure endpoint. Verify the endpoint URL is correct and the service is running.'];
        } catch (\Throwable $e) {
            return ['ok' => false, 'error' => 'Unexpected error: ' . $e->getMessage()];
        }
    }

    /**
     * Search the index. Returns normalized results or throws on failure.
     *
     * @return array{results: array<array{id:string,title:string,snippet:string,url:string,score:float}>, total: int, query: string}
     */
    public function search(string $endpoint, string $indexName, string $apiKey, string $query, int $top = 10, array $fieldMap = [], array $facetFields = [], string $filter = ''): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}/docs/search?api-version=" . self::API_VERSION;

        $body = [
            'search'        => $query,
            'top'           => $top,
            'count'         => true,
            'queryType'     => 'simple',
            'searchMode'    => 'any',
            'select'        => '*',
        ];

        if (!empty($facetFields)) {
            $body['facets'] = array_map(fn($f) => "{$f},count:20", $facetFields);
        }

        if ($filter !== '') {
            $body['filter'] = $filter;
        }

        $response = Http::timeout(15)
            ->withHeaders([
                'api-key'      => $apiKey,
                'Content-Type' => 'application/json',
            ])
            ->post($url, $body);

        if ($response->status() === 401) {
            throw new \RuntimeException('Authentication failed — API key is invalid.');
        }

        if ($response->status() === 404) {
            throw new \RuntimeException("Index \"{$indexName}\" not found.");
        }

        if (!$response->successful()) {
            $msg = $response->json('error.message') ?? "Azure returned HTTP {$response->status()}.";
            throw new \RuntimeException($msg);
        }

        $body  = $response->json();
        $items = $body['value'] ?? [];
        $total = $body['@odata.count'] ?? count($items);

        return [
            'query'   => $query,
            'total'   => $total,
            'results' => array_map(fn($item) => $this->normalizeResult($item, $fieldMap), $items),
            'facets'  => $body['@search.facets'] ?? [],
        ];
    }

    private function normalizeResult(array $item, array $fieldMap = []): array
    {
        $pick = function (string $key, array $fallbacks) use ($item, $fieldMap): string {
            $mapped = $fieldMap[$key] ?? null;
            if ($mapped && isset($item[$mapped]) && $item[$mapped] !== '' && $item[$mapped] !== null) {
                $val = $item[$mapped];
                return is_array($val) ? (string) ($val[0] ?? '') : (string) $val;
            }
            return (string) $this->firstValue($item, $fallbacks);
        };

        $snippetMapped = $fieldMap['snippet'] ?? null;
        $snippet = ($snippetMapped && isset($item[$snippetMapped]))
            ? mb_strimwidth(strip_tags((string) $item[$snippetMapped]), 0, 300, '…')
            : $this->extractSnippet($item);

        return [
            'id'      => (string) $this->firstValue($item, ['id', 'Id', 'ID', 'key']),
            'title'   => $pick('title',   ['title', 'Title', 'name', 'Name', 'productName', 'product_name']),
            'snippet' => $snippet,
            'url'     => $pick('url',     ['url', 'Url', 'URL', 'link', 'Link', 'pageUrl', 'page_url']),
            'image'   => $pick('image',   ['image', 'imageUrl', 'image_url', 'thumbnail', 'thumbnailUrl', 'thumbnail_url', 'photo', 'photoUrl', 'img', 'picture']),
            'price'   => $pick('price',   ['price', 'Price', 'salePrice', 'sale_price', 'listPrice', 'list_price', 'cost', 'amount']),
            'score'   => (float) ($item['@search.score'] ?? 0.0),
        ];
    }

    private function firstValue(array $item, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (!isset($item[$key]) || $item[$key] === '' || $item[$key] === null) continue;
            $val = $item[$key];
            return is_array($val) ? ($val[0] ?? '') : $val;
        }
        return '';
    }

    /**
     * Fetch document count and storage size for an index.
     *
     * On success:        returns ['documentCount' => int, 'storageSize' => int]
     * On index missing:  returns ['error' => '...', 'code' => 'INDEX_NOT_FOUND']
     * On other failure:  throws \RuntimeException
     */
    public function getStats(string $endpoint, string $indexName, string $apiKey): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}/stats?api-version=" . self::API_VERSION;

        try {
            $response = Http::timeout(10)
                ->withHeaders(['api-key' => $apiKey])
                ->get($url);
        } catch (\Illuminate\Http\Client\ConnectionException) {
            throw new \RuntimeException('Could not reach the Azure endpoint. Verify the endpoint URL is correct.');
        }

        if ($response->status() === 404) {
            return [
                'error' => "Index \"{$indexName}\" does not exist yet in this Azure AI Search service.",
                'code'  => 'INDEX_NOT_FOUND',
            ];
        }

        if (!$response->successful()) {
            $status = $response->status();
            throw new \RuntimeException(match ($status) {
                401 => 'Authentication failed — check your Azure API key.',
                403 => 'Access denied.',
                default => $response->json('error.message') ?? "Azure returned HTTP {$status}.",
            });
        }

        $data = $response->json();
        return [
            'documentCount' => $data['documentCount'] ?? 0,
            'storageSize'   => $data['storageSize']   ?? 0,
        ];
    }

    /**
     * Create an index with a default general-purpose schema.
     *
     * @throws \RuntimeException
     */
    public function createIndex(string $endpoint, string $indexName, string $apiKey): void
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}?api-version=" . self::API_VERSION;

        $schema = [
            'name'   => $indexName,
            'fields' => [
                ['name' => 'id',          'type' => 'Edm.String', 'key' => true,  'searchable' => false, 'filterable' => true],
                ['name' => 'name',        'type' => 'Edm.String', 'key' => false, 'searchable' => true,  'filterable' => true,  'sortable' => true],
                ['name' => 'title',       'type' => 'Edm.String', 'key' => false, 'searchable' => true,  'filterable' => true,  'sortable' => true],
                ['name' => 'description', 'type' => 'Edm.String', 'key' => false, 'searchable' => true,  'filterable' => false, 'sortable' => false],
                ['name' => 'category',    'type' => 'Edm.String', 'key' => false, 'searchable' => true,  'filterable' => true,  'sortable' => true,  'facetable' => true],
                ['name' => 'url',         'type' => 'Edm.String', 'key' => false, 'searchable' => false, 'filterable' => false, 'sortable' => false],
                ['name' => 'price',       'type' => 'Edm.Double', 'key' => false, 'searchable' => false, 'filterable' => true,  'sortable' => true,  'facetable' => true],
            ],
        ];

        try {
            $response = Http::timeout(15)
                ->withHeaders(['api-key' => $apiKey, 'Content-Type' => 'application/json'])
                ->put($url, $schema);
        } catch (\Illuminate\Http\Client\ConnectionException) {
            throw new \RuntimeException('Could not reach the Azure endpoint.');
        }

        if ($response->status() === 401) {
            throw new \RuntimeException('Authentication failed — check your Azure API key.');
        }
        if ($response->status() === 403) {
            throw new \RuntimeException('Access denied — your API key may be a query key. Index creation requires an admin key.');
        }
        if ($response->status() === 400) {
            $msg = $response->json('error.message') ?? 'Invalid schema.';
            throw new \RuntimeException($msg);
        }
        // 201 Created or 204 No Content both mean success
        if (!$response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? "Azure returned HTTP {$response->status()}.");
        }
    }

    /**
     * Fetch the field definitions for an existing index.
     *
     * @return array<array{name:string,type:string,key:bool,searchable:bool,filterable:bool,sortable:bool,facetable:bool}>
     * @throws \RuntimeException
     */
    public function getIndexSchema(string $endpoint, string $indexName, string $apiKey): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}?api-version=" . self::API_VERSION;

        try {
            $response = Http::timeout(10)->withHeaders(['api-key' => $apiKey])->get($url);
        } catch (\Illuminate\Http\Client\ConnectionException) {
            throw new \RuntimeException('Could not reach the Azure endpoint.');
        }

        if ($response->status() === 401) throw new \RuntimeException('Authentication failed.');
        if ($response->status() === 404) throw new \RuntimeException("Index \"{$indexName}\" not found.");
        if (!$response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? "Azure returned HTTP {$response->status()}.");
        }

        return array_map(fn($f) => [
            'name'       => $f['name'],
            'type'       => $f['type'],
            'key'        => (bool) ($f['key']        ?? false),
            'searchable' => (bool) ($f['searchable'] ?? false),
            'filterable' => (bool) ($f['filterable'] ?? false),
            'sortable'   => (bool) ($f['sortable']   ?? false),
            'facetable'  => (bool) ($f['facetable']  ?? false),
        ], $response->json('fields') ?? []);
    }

    /**
     * Replace the index schema (PUT). Adds new fields; cannot remove or retype existing ones.
     *
     * @param  array<array{name:string,type:string,...}> $fields
     * @throws \RuntimeException
     */
    public function updateIndex(string $endpoint, string $indexName, string $apiKey, array $fields): void
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}?api-version=" . self::API_VERSION;

        try {
            $response = Http::timeout(15)
                ->withHeaders(['api-key' => $apiKey, 'Content-Type' => 'application/json'])
                ->put($url, ['name' => $indexName, 'fields' => $fields]);
        } catch (\Illuminate\Http\Client\ConnectionException) {
            throw new \RuntimeException('Could not reach the Azure endpoint.');
        }

        if ($response->status() === 401) throw new \RuntimeException('Authentication failed.');
        if ($response->status() === 403) throw new \RuntimeException('Access denied — an admin API key is required to modify the index.');
        if (!$response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? "Azure returned HTTP {$response->status()}.");
        }
    }

    /**
     * Push an array of plain documents into the index (mergeOrUpload).
     *
     * @param  array<array<string,mixed>> $documents
     * @return array{count: int, errors: array<string>}
     * @throws \RuntimeException
     */
    public function indexDocuments(string $endpoint, string $indexName, string $apiKey, array $documents): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}/docs/index?api-version=" . self::API_VERSION;

        $payload = [
            'value' => array_map(
                fn($doc) => array_merge(['@search.action' => 'mergeOrUpload'], $doc),
                $documents
            ),
        ];

        $response = Http::timeout(30)
            ->withHeaders(['api-key' => $apiKey, 'Content-Type' => 'application/json'])
            ->post($url, $payload);

        if ($response->status() === 401) {
            throw new \RuntimeException('Authentication failed — API key is invalid.');
        }
        if ($response->status() === 404) {
            throw new \RuntimeException("Index \"{$indexName}\" not found.");
        }
        if ($response->status() === 400) {
            $msg = $response->json('error.message') ?? $response->json('message') ?? 'Invalid document format.';
            throw new \RuntimeException($msg);
        }
        if (!$response->successful() && $response->status() !== 207) {
            $msg = $response->json('error.message') ?? "Azure returned HTTP {$response->status()}.";
            throw new \RuntimeException($msg);
        }

        $body   = $response->json();
        $items  = $body['value'] ?? [];
        $errors = array_values(array_filter(
            array_map(fn($i) => isset($i['errorMessage']) ? ($i['key'] . ': ' . $i['errorMessage']) : null, $items)
        ));

        return [
            'count'  => count(array_filter($items, fn($i) => $i['status'] ?? false)),
            'errors' => $errors,
        ];
    }

    /**
     * Raw search that returns all document fields (for the search test tool).
     *
     * @return array{total: int, results: array<array<string,mixed>>}
     * @throws \RuntimeException
     */
    public function testSearch(string $endpoint, string $indexName, string $apiKey, string $query, int $top = 20, array $facetFields = [], string $filter = ''): array
    {
        $endpoint = rtrim($endpoint, '/');
        $url = "{$endpoint}/indexes/{$indexName}/docs/search?api-version=" . self::API_VERSION;

        $body = [
            'search'     => $query,
            'top'        => $top,
            'count'      => true,
            'searchMode' => 'any',
            'select'     => '*',
        ];

        if (!empty($facetFields)) {
            $body['facets'] = array_map(fn($f) => "{$f},count:20", $facetFields);
        }

        if ($filter !== '') {
            $body['filter'] = $filter;
        }

        $response = Http::timeout(15)
            ->withHeaders(['api-key' => $apiKey, 'Content-Type' => 'application/json'])
            ->post($url, $body);

        if ($response->status() === 401) {
            throw new \RuntimeException('Authentication failed — API key is invalid.');
        }
        if ($response->status() === 404) {
            throw new \RuntimeException("Index \"{$indexName}\" not found.");
        }
        if (!$response->successful()) {
            throw new \RuntimeException($response->json('error.message') ?? "Azure returned HTTP {$response->status()}.");
        }

        $body  = $response->json();
        $items = $body['value'] ?? [];

        // Strip Azure metadata fields (@search.*, @odata.*) to return clean documents
        $clean = array_map(function ($item) {
            return array_filter($item, fn($k) => !str_starts_with($k, '@'), ARRAY_FILTER_USE_KEY);
        }, $items);

        return [
            'total'   => $body['@odata.count'] ?? count($items),
            'results' => array_values($clean),
            'facets'  => $body['@search.facets'] ?? [],
        ];
    }

    private function extractSnippet(array $item): string
    {
        // Prefer Azure's highlighted snippets if present
        $highlights = $item['@search.highlights'] ?? [];
        if (!empty($highlights)) {
            $first = reset($highlights);
            if (is_array($first)) {
                $text = strip_tags(implode(' … ', array_slice($first, 0, 2)));
                return mb_strimwidth($text, 0, 300, '…');
            }
        }

        $raw = (string) $this->firstValue($item, [
            'description', 'Description', 'content', 'Content',
            'body', 'Body', 'summary', 'Summary', 'excerpt',
        ]);

        return mb_strimwidth(strip_tags($raw), 0, 300, '…');
    }
}
