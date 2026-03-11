<?php

use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\IndexingController;
use App\Http\Controllers\ApiKeyController;
use App\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// ── Guest routes ───────────────────────────────────────────────────────────────
Route::middleware('guest')->group(function () {
    Route::get('/login',    [AuthController::class, 'showLogin'])->name('login');
    Route::get('/register', [AuthController::class, 'showRegister'])->name('register');
});

Route::post('/login',    [AuthController::class, 'login'])->name('login.post');
Route::post('/register', [AuthController::class, 'register'])->name('register.post');
Route::post('/logout',   [AuthController::class, 'logout'])->name('logout');

// ── Authenticated routes ───────────────────────────────────────────────────────
Route::middleware('auth')->group(function () {

    Route::get('/', fn() => redirect('/dashboard'));
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/sites', [SiteController::class, 'index'])->name('sites.index');
    Route::post('/sites', [SiteController::class, 'store'])->name('sites.store');

    Route::get('/sites/{site:site_id}',              [SiteController::class, 'show'])->name('sites.show');
    Route::get('/sites/{site:site_id}/stats',         [SiteController::class, 'stats'])->name('sites.stats');
    Route::get('/sites/{site:site_id}/index-fields',  [SiteController::class, 'indexSchema'])->name('sites.index-fields');
    Route::post('/sites/{site:site_id}/index-fields', [SiteController::class, 'updateIndexSchema'])->name('sites.update-index-fields');
    Route::post('/sites/{site:site_id}/create-index', [SiteController::class, 'createIndex'])->name('sites.create-index');
    Route::post('/sites/{site:site_id}/ingest',       [SiteController::class, 'ingest'])->name('sites.ingest');
    Route::get('/sites/{site:site_id}/search-test',   [SiteController::class, 'testSearch'])->name('sites.search-test');
    Route::get('/sites/{site:site_id}/customize',     [SiteController::class, 'customize'])->name('sites.customize');
    Route::post('/sites/{site:site_id}/widget-config',[SiteController::class, 'updateWidgetConfig'])->name('sites.widget-config');

    Route::get('/widget-builder', [SiteController::class, 'widgetBuilder'])->name('widget-builder');

    Route::get('/indexing',       fn() => Inertia::render('Indexing'))->name('indexing');
    Route::post('/indexing/sync', [IndexingController::class, 'sync'])->name('indexing.sync');

    Route::get('/api-keys',              [ApiKeyController::class, 'index'])->name('api-keys.index');
    Route::post('/api-keys',             [ApiKeyController::class, 'store'])->name('api-keys.store');
    Route::delete('/api-keys/{apiKey}',  [ApiKeyController::class, 'destroy'])->name('api-keys.destroy');

    Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

    Route::get('/settings',           [SettingsController::class, 'index'])->name('settings');
    Route::post('/settings/profile',  [SettingsController::class, 'updateProfile'])->name('settings.profile');
    Route::post('/settings/password', [SettingsController::class, 'updatePassword'])->name('settings.password');
});

// ── Public search API (widget embeds on external sites) ───────────────────────
Route::options('/api/search', [SearchController::class, 'preflight']);
Route::get('/api/search',     [SearchController::class, 'search'])->name('search');
Route::post('/api/click',     [SearchController::class, 'click'])->name('click');
Route::options('/api/click',  [SearchController::class, 'preflight']);
