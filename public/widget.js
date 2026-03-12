/**
 * Rayosearch Embed Widget
 * Usage: <script src="..." data-site="site_xxx" data-api="https://your-app.com"></script>
 *
 * Optional attributes:
 *   data-template      — "minimal" (default) | "card" | "block" | "product"
 *   data-accent        — Primary/accent color, e.g. "#5aa9ff"
 *   data-theme         — "dark" (default) | "light" | "auto"
 *   data-radius        — "rounded" (default) | "sharp" | "pill"
 *   data-placeholder   — Input placeholder text
 *   data-bg-color      — Custom background color for results dropdown
 *   data-icon-left     — "none" | "search" | "sparkle" | "search-ai" | "arrow"
 *   data-icon-right    — "none" | "search" | "sparkle" | "search-ai" | "arrow"
 *   data-target        — CSS selector of element to render into (defaults to inline after <script>)
 *   data-field-title   — Index field name to use as title
 *   data-field-snippet — Index field name to use as snippet/description
 *   data-field-url     — Index field name to use as URL
 *   data-field-image   — Index field name to use as image URL
 *   data-field-price   — Index field name to use as price
 *
 * Results page mode (data-mode="results-page"):
 *   data-filter-fields       — Comma-separated list of filterable field names
 *   data-results-per-page    — Number of results per page (default 20)
 *   data-results-layout      — "grid" | "list" (default "grid")
 *   data-results-card-min-width   — Min card width in px (default 200)
 *   data-results-card-image-height — Card image height in px (default 180)
 *   data-filters-sidebar-bg  — Background color for filters sidebar
 */
(function () {
  'use strict';

  var script = document.currentScript;
  if (!script) return;

  var MODE        = script.getAttribute('data-mode')           || 'search-bar';
  var SITE_ID     = script.getAttribute('data-site')           || '';
  var API_BASE    = (script.getAttribute('data-api') || '').replace(/\/$/, '');
  var TARGET_SEL  = script.getAttribute('data-target')         || '';
  var PLACEHOLDER = script.getAttribute('data-placeholder')    || 'Search\u2026';
  var TEMPLATE    = script.getAttribute('data-template')       || 'minimal';
  var ACCENT      = script.getAttribute('data-accent')         || '#5aa9ff';
  var THEME_PREF  = script.getAttribute('data-theme')          || 'dark';
  var RADIUS_KEY  = script.getAttribute('data-radius')         || 'rounded';
  var ICON_LEFT   = script.getAttribute('data-icon-left')      || 'none';
  var ICON_RIGHT  = script.getAttribute('data-icon-right')     || 'none';
  var BG_COLOR       = script.getAttribute('data-bg-color')        || '';
  var RESULTS_PAGE   = script.getAttribute('data-results-page')    || '';
  var CARD_MIN_WIDTH = parseInt(script.getAttribute('data-card-min-width')    || '0', 10);
  var CARD_IMG_HEIGHT= parseInt(script.getAttribute('data-card-image-height') || '0', 10);

  /* Field mapping overrides */
  var FM = {
    title:   script.getAttribute('data-field-title')   || '',
    snippet: script.getAttribute('data-field-snippet') || '',
    url:     script.getAttribute('data-field-url')     || '',
    image:   script.getAttribute('data-field-image')   || '',
    price:   script.getAttribute('data-field-price')   || '',
  };

  if (!SITE_ID)   { console.warn('[Rayosearch] Missing data-site attribute.');                               return; }
  if (!API_BASE)  { console.warn('[Rayosearch] Missing data-api attribute. Set data-api to your app URL.'); return; }

  /* ── Route to results page mode ── */
  if (MODE === 'results-page') { initResultsPage(); return; }

  /* ── Theme ── */
  var THEME = THEME_PREF;
  if (THEME_PREF === 'auto') {
    THEME = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }

  var isDark = THEME === 'dark';
  var C = {
    bg:     isDark ? '#141414' : '#ffffff',
    panel:  BG_COLOR || (isDark ? '#1e1e1e' : '#f3f4f6'),
    border: isDark ? '#2a2a2a' : '#e5e7eb',
    text:   isDark ? '#ffffff' : '#111113',
    muted:  isDark ? '#888888' : '#6b7280',
    hover:  isDark ? '#1a1a1a' : '#f9fafb',
  };

  var RADIUS = RADIUS_KEY === 'sharp' ? '3px' : RADIUS_KEY === 'pill' ? '22px' : '8px';
  var ACCENT_DIM = ACCENT + '22';

  /* ── Styles ── */
  var css = [
    '.aisg-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;line-height:1.5;width:100%;box-sizing:border-box}',
    '.aisg-widget *{box-sizing:border-box}',
    '.aisg-row{position:relative}',
    '.aisg-input{width:100%;padding:10px ' + (ICON_RIGHT !== 'none' ? '36px' : '38px') + ' 10px ' + (ICON_LEFT !== 'none' ? '36px' : '14px') + ';background:' + C.bg + ';border:1px solid ' + C.border + ';border-radius:' + RADIUS + ';color:' + C.text + ';font-size:14px;outline:none;transition:border-color .15s}',
    '.aisg-input::placeholder{color:' + C.muted + '}',
    '.aisg-input:focus{border-color:' + ACCENT + '}',
    '.aisg-spinner{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:14px;height:14px;border:2px solid ' + C.border + ';border-top-color:' + ACCENT + ';border-radius:50%;animation:aisg-spin .6s linear infinite;display:none}',
    '.aisg-spinner.aisg-on{display:block}',
    '@keyframes aisg-spin{to{transform:translateY(-50%) rotate(360deg)}}',
    '.aisg-error{margin-top:8px;padding:8px 12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:' + RADIUS + ';color:#f87171;font-size:12px}',
    '.aisg-results{margin-top:10px;background:' + C.panel + ';border:1px solid ' + C.border + ';border-radius:' + RADIUS + ';overflow:hidden}',
    '.aisg-results-hdr{padding:8px 14px;border-bottom:1px solid ' + C.border + ';font-size:11px;color:' + C.muted + '}',
    '.aisg-results-hdr em{color:' + C.text + ';font-style:normal;font-weight:600}',
    '.aisg-empty{padding:24px 14px;text-align:center;font-size:13px;color:' + C.muted + '}',
    '.aisg-view-all{display:block;padding:9px 14px;border-top:1px solid ' + C.border + ';font-size:12px;font-weight:500;color:' + ACCENT + ';text-decoration:none;text-align:center;transition:background .1s}',
    '.aisg-view-all:hover{background:' + C.hover + '}',

    /* Shared image thumb */
    '.aisg-thumb{object-fit:cover;border-radius:' + RADIUS + ';flex-shrink:0;display:block;background:' + C.panel + '}',
    '.aisg-thumb-ph{flex-shrink:0;background:' + ACCENT_DIM + ';display:flex;align-items:center;justify-content:center;border-radius:' + RADIUS + '}',

    /* Minimal template */
    '.aisg-item{padding:10px 14px;border-bottom:1px solid ' + C.border + ';transition:background .1s;display:flex;gap:10px;align-items:flex-start}',
    '.aisg-item:last-child{border-bottom:none}',
    '.aisg-item:hover{background:' + C.hover + '}',
    '.aisg-item-body{flex:1;min-width:0}',
    '.aisg-item-title{font-size:13px;font-weight:500;color:' + C.text + ';text-decoration:none;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'a.aisg-item-title:hover{color:' + ACCENT + '}',
    '.aisg-item-snippet{font-size:12px;color:' + C.muted + ';margin-top:2px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aisg-item-url{font-size:11px;color:' + ACCENT + ';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',

    /* Card template */
    '.aisg-cards{padding:10px;display:flex;flex-direction:column;gap:8px}',
    '.aisg-card{padding:12px;background:' + C.bg + ';border:1px solid ' + C.border + ';border-left:3px solid ' + ACCENT + ';border-radius:' + RADIUS + ';display:flex;gap:12px;align-items:flex-start}',
    '.aisg-card-body{flex:1;min-width:0}',
    '.aisg-card-title{font-size:13px;font-weight:600;color:' + C.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    'a.aisg-card-title{text-decoration:none}',
    'a.aisg-card-title:hover{color:' + ACCENT + '}',
    '.aisg-card-snippet{font-size:12px;color:' + C.muted + ';margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aisg-card-url{font-size:11px;color:' + ACCENT + ';margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',

    /* Block template */
    '.aisg-blocks{padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(' + (CARD_MIN_WIDTH || 180) + 'px,1fr));gap:10px}',
    '.aisg-block{background:' + C.bg + ';border:1px solid ' + C.border + ';border-radius:' + RADIUS + ';overflow:hidden}',
    '.aisg-block-img{width:100%;height:' + (CARD_IMG_HEIGHT || 120) + 'px;object-fit:cover;display:block;background:' + C.panel + '}',
    '.aisg-block-img-ph{width:100%;height:' + (CARD_IMG_HEIGHT || 120) + 'px;background:' + ACCENT_DIM + ';display:flex;align-items:center;justify-content:center}',
    '.aisg-block-body{padding:10px 12px}',
    '.aisg-block-title{font-size:12px;font-weight:600;color:' + C.text + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}',
    'a.aisg-block-title{text-decoration:none}',
    'a.aisg-block-title:hover{color:' + ACCENT + '}',
    '.aisg-block-snippet{font-size:11px;color:' + C.muted + ';margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aisg-block-url{font-size:10px;color:' + ACCENT + ';margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',

    /* Product template */
    '.aisg-products{padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(' + (CARD_MIN_WIDTH || 160) + 'px,1fr));gap:10px}',
    '.aisg-product{background:' + C.bg + ';border:1px solid ' + C.border + ';border-radius:' + RADIUS + ';overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit;cursor:pointer;transition:border-color .15s}',
    '.aisg-product:hover{border-color:' + ACCENT + '}',
    '.aisg-product-img{width:100%;height:' + (CARD_IMG_HEIGHT || 160) + 'px;object-fit:cover;display:block;background:' + C.panel + '}',
    '.aisg-product-img-ph{width:100%;height:' + (CARD_IMG_HEIGHT || 160) + 'px;background:' + ACCENT_DIM + ';display:flex;align-items:center;justify-content:center}',
    '.aisg-product-body{padding:10px 12px;flex:1;display:flex;flex-direction:column;gap:4px}',
    '.aisg-product-name{font-size:12px;font-weight:600;color:' + C.text + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}',
    '.aisg-product-snippet{font-size:11px;color:' + C.muted + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.aisg-product-footer{margin-top:auto;padding-top:6px;display:flex;align-items:center;justify-content:space-between}',
    '.aisg-product-price{font-size:13px;font-weight:700;color:' + ACCENT + '}',
    '.aisg-product-domain{font-size:10px;color:' + C.muted + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}',
  ].join('');

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Icon helpers ── */
  var ICON_SVGS = {
    'search':    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="COLOR" stroke-width="1.8" stroke-linecap="round"><circle cx="6.5" cy="6.5" r="4"/><path d="M9.7 9.7L13.5 13.5"/></svg>',
    'sparkle':   '<svg width="14" height="14" viewBox="0 0 16 16"><path d="M8 2L9.2 6.2L13.8 7.5L9.2 8.8L8 13.5L6.8 8.8L2.2 7.5L6.8 6.2Z" fill="COLOR"/><circle cx="12.5" cy="3" r="0.9" fill="COLOR"/><circle cx="3.5" cy="12" r="0.7" fill="COLOR"/></svg>',
    'search-ai': '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke-linecap="round"><circle cx="5.5" cy="7" r="3.5" stroke="COLOR" stroke-width="1.6"/><path d="M8.3 10L11.5 13.2" stroke="COLOR" stroke-width="1.6"/><path d="M13 1.5L13.7 3.3L15.5 4L13.7 4.7L13 6.5L12.3 4.7L10.5 4L12.3 3.3Z" fill="COLOR"/></svg>',
    'arrow':     '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="COLOR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h9M8.5 4.5L12.5 8 8.5 11.5"/></svg>',
  };

  function makeIconEl(name, color) {
    var tpl = ICON_SVGS[name];
    if (!tpl) return null;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:absolute;top:50%;transform:translateY(-50%);pointer-events:none;display:flex;align-items:center;line-height:0';
    wrap.innerHTML = tpl.replace(/COLOR/g, color);
    return wrap;
  }

  /* ── Helpers ── */
  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function firstVal(doc, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = doc[keys[i]];
      if (v != null && v !== '') return String(v);
    }
    return '';
  }

  /* Apply field mapping then fallback to auto-detection */
  function pick(doc, fmKey, fallbacks) {
    var mapped = FM[fmKey];
    if (mapped && doc[mapped] != null && doc[mapped] !== '') return String(doc[mapped]);
    return firstVal(doc, fallbacks);
  }

  function normalizeDoc(doc) {
    return {
      title:   pick(doc, 'title',   ['title','Title','name','Name','productName','product_name']),
      snippet: pick(doc, 'snippet', ['snippet','description','Description','content','Content','body','Body','summary','Summary','excerpt']).slice(0, 300),
      url:     pick(doc, 'url',     ['url','Url','URL','link','Link','pageUrl','page_url']),
      image:   pick(doc, 'image',   ['image','imageUrl','image_url','thumbnail','thumbnailUrl','thumbnail_url','photo','photoUrl','img','picture']),
      price:   pick(doc, 'price',   ['price','Price','salePrice','sale_price','listPrice','list_price','cost','amount']),
    };
  }

  /* Build an <img> or placeholder div for a given src and pixel size */
  function makeThumb(src, size) {
    if (src) {
      var img = document.createElement('img');
      img.src = src;
      img.className = 'aisg-thumb';
      img.width = size;
      img.height = size;
      img.onerror = function() { img.style.display = 'none'; };
      return img;
    }
    var ph = document.createElement('div');
    ph.className = 'aisg-thumb-ph';
    ph.style.width = ph.style.height = size + 'px';
    ph.innerHTML = '<svg width="' + Math.round(size * 0.4) + '" height="' + Math.round(size * 0.4) + '" viewBox="0 0 16 16" fill="none" stroke="' + ACCENT + '" stroke-width="1.5" opacity="0.7"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="5.5" cy="5.5" r="1.5"/><path d="M1 11l4-4 3 3 2-2 5 5"/></svg>';
    return ph;
  }

  var IMG_PH_SVG = '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="' + ACCENT + '" stroke-width="1.5" opacity="0.6"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="5.5" cy="5.5" r="1.5"/><path d="M1 11l4-4 3 3 2-2 5 5"/></svg>';
  var PRODUCT_IMG_PH_SVG = '<svg width="32" height="32" viewBox="0 0 16 16" fill="none" stroke="' + ACCENT + '" stroke-width="1.5" opacity="0.6"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="5.5" cy="5.5" r="1.5"/><path d="M1 11l4-4 3 3 2-2 5 5"/></svg>';

  /* ── DOM ── */
  var container = document.createElement('div');
  container.className = 'aisg-widget';

  var row = document.createElement('div');
  row.className = 'aisg-row';

  var input = document.createElement('input');
  input.type = 'search';
  input.className = 'aisg-input';
  input.placeholder = PLACEHOLDER;
  input.setAttribute('autocomplete', 'off');

  var spinner = document.createElement('div');
  spinner.className = 'aisg-spinner';

  var errorEl = document.createElement('div');
  errorEl.className = 'aisg-error';
  errorEl.style.display = 'none';

  var resultsEl = document.createElement('div');
  resultsEl.className = 'aisg-results';
  resultsEl.style.display = 'none';

  var leftIconEl = makeIconEl(ICON_LEFT, C.muted);
  if (leftIconEl) { leftIconEl.style.left = '11px'; row.appendChild(leftIconEl); }

  var rightIconEl = makeIconEl(ICON_RIGHT, C.muted);
  if (rightIconEl) { rightIconEl.style.right = '11px'; row.appendChild(rightIconEl); }

  row.appendChild(input);
  row.appendChild(spinner);
  container.appendChild(row);
  container.appendChild(errorEl);
  container.appendChild(resultsEl);

  var target = TARGET_SEL ? document.querySelector(TARGET_SEL) : null;
  if (target) {
    target.appendChild(container);
  } else {
    script.parentNode.insertBefore(container, script.nextSibling);
  }

  /* ── Error helpers ── */
  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    resultsEl.style.display = 'none';
  }
  function clearError() { errorEl.style.display = 'none'; }

  /* ── Render ── */
  /* Delegated click handler — fires on any link inside the results panel */
  var lastQuery = '';
  resultsEl.addEventListener('click', function(e) {
    var link = e.target.closest('a[href]');
    if (!link) return;
    var title = link.dataset.resultTitle || link.textContent.trim().slice(0, 200);
    var id    = link.dataset.resultId    || '';
    trackClick(id, title, link.href, lastQuery);
  });

  function renderResults(data, query) {
    lastQuery = query;
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'block';
    clearError();

    var hdr = document.createElement('div');
    hdr.className = 'aisg-results-hdr';
    hdr.innerHTML = data.total + ' result' + (data.total !== 1 ? 's' : '') + ' for <em>' + esc(query) + '</em>';
    resultsEl.appendChild(hdr);

    if (!data.results || !data.results.length) {
      var empty = document.createElement('div');
      empty.className = 'aisg-empty';
      empty.textContent = 'No results found.';
      resultsEl.appendChild(empty);
      return;
    }

    /* Normalize all results (apply field mapping) */
    var items = data.results.map(normalizeDoc);

    if (TEMPLATE === 'product') {
      var grid = document.createElement('div');
      grid.className = 'aisg-products';
      items.forEach(function(r) {
        var prod = r.url ? document.createElement('a') : document.createElement('div');
        prod.className = 'aisg-product';
        if (r.url) { prod.href = r.url; prod.target = '_blank'; prod.rel = 'noopener noreferrer'; }

        /* Image */
        if (r.image) {
          var img = document.createElement('img');
          img.src = r.image;
          img.alt = r.title || '';
          img.className = 'aisg-product-img';
          img.onerror = function() { img.style.display = 'none'; };
          prod.appendChild(img);
        } else {
          var ph = document.createElement('div');
          ph.className = 'aisg-product-img-ph';
          ph.innerHTML = PRODUCT_IMG_PH_SVG;
          prod.appendChild(ph);
        }

        var body = document.createElement('div');
        body.className = 'aisg-product-body';

        var nameEl = document.createElement('div');
        nameEl.className = 'aisg-product-name';
        nameEl.textContent = r.title || '(no title)';
        body.appendChild(nameEl);

        if (r.snippet) {
          var sn = document.createElement('div');
          sn.className = 'aisg-product-snippet';
          sn.textContent = r.snippet;
          body.appendChild(sn);
        }

        var footer = document.createElement('div');
        footer.className = 'aisg-product-footer';

        if (r.price) {
          var priceEl = document.createElement('span');
          priceEl.className = 'aisg-product-price';
          priceEl.textContent = r.price;
          footer.appendChild(priceEl);
        } else {
          footer.appendChild(document.createElement('span'));
        }

        if (r.url) {
          var domain = document.createElement('span');
          domain.className = 'aisg-product-domain';
          try { domain.textContent = new URL(r.url).hostname; } catch(e) { domain.textContent = r.url; }
          footer.appendChild(domain);
        }

        body.appendChild(footer);
        prod.appendChild(body);
        grid.appendChild(prod);
      });
      resultsEl.appendChild(grid);

    } else if (TEMPLATE === 'block') {
      var grid = document.createElement('div');
      grid.className = 'aisg-blocks';
      items.forEach(function(r) {
        var block = document.createElement('div');
        block.className = 'aisg-block';

        if (r.image) {
          var img = document.createElement('img');
          img.src = r.image;
          img.alt = r.title || '';
          img.className = 'aisg-block-img';
          img.onerror = function() { img.style.display = 'none'; };
          block.appendChild(img);
        } else {
          var ph = document.createElement('div');
          ph.className = 'aisg-block-img-ph';
          ph.innerHTML = IMG_PH_SVG;
          block.appendChild(ph);
        }

        var body = document.createElement('div');
        body.className = 'aisg-block-body';

        var titleEl = r.url ? document.createElement('a') : document.createElement('div');
        titleEl.className = 'aisg-block-title';
        if (r.url) { titleEl.href = r.url; titleEl.target = '_blank'; titleEl.rel = 'noopener noreferrer'; }
        titleEl.textContent = r.title || r.url || '(no title)';
        body.appendChild(titleEl);

        if (r.snippet) {
          var sn = document.createElement('div');
          sn.className = 'aisg-block-snippet';
          sn.textContent = r.snippet;
          body.appendChild(sn);
        }
        if (r.url) {
          var ul = document.createElement('div');
          ul.className = 'aisg-block-url';
          ul.textContent = r.url;
          body.appendChild(ul);
        }
        block.appendChild(body);
        grid.appendChild(block);
      });
      resultsEl.appendChild(grid);

    } else if (TEMPLATE === 'card') {
      var cards = document.createElement('div');
      cards.className = 'aisg-cards';
      items.forEach(function(r) {
        var card = document.createElement('div');
        card.className = 'aisg-card';
        card.appendChild(makeThumb(r.image || '', 56));

        var body = document.createElement('div');
        body.className = 'aisg-card-body';

        var titleEl = r.url ? document.createElement('a') : document.createElement('div');
        titleEl.className = 'aisg-card-title';
        if (r.url) { titleEl.href = r.url; titleEl.target = '_blank'; titleEl.rel = 'noopener noreferrer'; }
        titleEl.textContent = r.title || r.url || '(no title)';
        body.appendChild(titleEl);

        if (r.snippet) {
          var sn = document.createElement('div');
          sn.className = 'aisg-card-snippet';
          sn.textContent = r.snippet;
          body.appendChild(sn);
        }
        if (r.url) {
          var ul = document.createElement('div');
          ul.className = 'aisg-card-url';
          ul.textContent = r.url;
          body.appendChild(ul);
        }
        card.appendChild(body);
        cards.appendChild(card);
      });
      resultsEl.appendChild(cards);

    } else {
      /* Minimal */
      items.forEach(function(r) {
        var item = document.createElement('div');
        item.className = 'aisg-item';
        item.appendChild(makeThumb(r.image || '', 40));

        var body = document.createElement('div');
        body.className = 'aisg-item-body';

        var titleEl = r.url ? document.createElement('a') : document.createElement('span');
        titleEl.className = 'aisg-item-title';
        if (r.url) { titleEl.href = r.url; titleEl.target = '_blank'; titleEl.rel = 'noopener noreferrer'; }
        titleEl.textContent = r.title || r.url || '(no title)';
        body.appendChild(titleEl);

        if (r.snippet) {
          var sn = document.createElement('div');
          sn.className = 'aisg-item-snippet';
          sn.textContent = r.snippet;
          body.appendChild(sn);
        }
        if (r.url) {
          var ul = document.createElement('div');
          ul.className = 'aisg-item-url';
          ul.textContent = r.url;
          body.appendChild(ul);
        }
        item.appendChild(body);
        resultsEl.appendChild(item);
      });
    }

    /* "View all results" footer — shown when a results page URL is configured */
    if (RESULTS_PAGE) {
      var viewAll = document.createElement('a');
      viewAll.className = 'aisg-view-all';
      viewAll.href = RESULTS_PAGE + (RESULTS_PAGE.indexOf('?') === -1 ? '?' : '&') + 'q=' + encodeURIComponent(query);
      viewAll.textContent = 'View all ' + (data.total || '') + ' results \u2192';
      resultsEl.appendChild(viewAll);
    }
  }

  /* ── Click tracking ── */
  function trackClick(resultId, resultTitle, resultUrl, query) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE + '/api/click', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.send(JSON.stringify({
      site_id:      SITE_ID,
      query:        query,
      result_id:    resultId,
      result_title: resultTitle,
      result_url:   resultUrl,
    }));
  }

  /* ── Search ── */
  var currentXhr = null;
  var debounceTimer = null;

  function doSearch(query) {
    if (currentXhr) { currentXhr.abort(); }
    spinner.classList.add('aisg-on');

    var url = API_BASE + '/api/search?site_id=' + encodeURIComponent(SITE_ID) + '&query=' + encodeURIComponent(query);
    if (rightIconEl) rightIconEl.style.display = 'none';

    var xhr = new XMLHttpRequest();
    currentXhr = xhr;
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.onload = function() {
      spinner.classList.remove('aisg-on');
      if (rightIconEl) rightIconEl.style.display = '';
      currentXhr = null;
      var data;
      try { data = JSON.parse(xhr.responseText); } catch(e) { showError('Invalid response from server.'); return; }
      if (xhr.status >= 400) { showError(data.error || ('Error ' + xhr.status)); resultsEl.style.display = 'none'; return; }
      renderResults(data, query);
    };

    xhr.onerror = function() { spinner.classList.remove('aisg-on'); if (rightIconEl) rightIconEl.style.display = ''; currentXhr = null; showError('Request failed. Check your connection.'); };
    xhr.onabort = function() { spinner.classList.remove('aisg-on'); if (rightIconEl) rightIconEl.style.display = ''; currentXhr = null; };
    xhr.send();
  }

  /* Navigate to results page when Enter is pressed */
  function goToResultsPage(q) {
    if (RESULTS_PAGE && q) {
      window.location.href = RESULTS_PAGE + (RESULTS_PAGE.indexOf('?') === -1 ? '?' : '&') + 'q=' + encodeURIComponent(q);
    }
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      var q = input.value.trim();
      if (RESULTS_PAGE && q) {
        goToResultsPage(q);
      }
    }
  });

  input.addEventListener('input', function() {
    var q = input.value.trim();
    clearTimeout(debounceTimer);
    if (q.length < 2) { clearError(); resultsEl.style.display = 'none'; return; }
    debounceTimer = setTimeout(function() { doSearch(q); }, 300);
  });

  /* ── Results Page Mode ── */
  function initResultsPage() {
    var RP_FILTER_FIELDS   = (script.getAttribute('data-filter-fields') || '').split(',').map(function(s){ return s.trim(); }).filter(Boolean);
    var RP_PER_PAGE        = parseInt(script.getAttribute('data-results-per-page') || '20', 10);
    var RP_LAYOUT          = script.getAttribute('data-results-layout') || 'grid';
    var RP_CARD_MIN_WIDTH  = parseInt(script.getAttribute('data-results-card-min-width') || '200', 10);
    var RP_IMG_HEIGHT      = parseInt(script.getAttribute('data-results-card-image-height') || '180', 10);
    var RP_SIDEBAR_BG      = script.getAttribute('data-filters-sidebar-bg') || '';

    /* Re-resolve theme & colors (same logic as search bar mode) */
    var rpTheme = THEME_PREF;
    if (THEME_PREF === 'auto') {
      rpTheme = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    var rpDark = rpTheme === 'dark';
    var C2 = {
      bg:     rpDark ? '#141414' : '#ffffff',
      panel:  BG_COLOR || (rpDark ? '#1e1e1e' : '#f3f4f6'),
      border: rpDark ? '#2a2a2a' : '#e5e7eb',
      text:   rpDark ? '#ffffff' : '#111113',
      muted:  rpDark ? '#888888' : '#6b7280',
      hover:  rpDark ? '#252525' : '#f9fafb',
    };
    var rpRadius = RADIUS_KEY === 'sharp' ? '3px' : RADIUS_KEY === 'pill' ? '22px' : '8px';
    var rpSidebarBg = RP_SIDEBAR_BG || C2.panel;
    var rpAccentDim = ACCENT + '22';

    /* FM is already defined in outer scope */

    /* Inject results-page CSS */
    var rpCss = [
      '.rp-wrap{display:flex;gap:0;min-height:100vh;background:' + C2.bg + ';font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:14px;color:' + C2.text + ';box-sizing:border-box}',
      '.rp-wrap *{box-sizing:border-box}',
      '.rp-sidebar{width:240px;flex-shrink:0;background:' + rpSidebarBg + ';border-right:1px solid ' + C2.border + ';padding:20px 16px;overflow-y:auto}',
      '.rp-sidebar-title{font-size:13px;font-weight:700;color:' + C2.muted + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:16px}',
      '.rp-facet{margin-bottom:12px;border:1px solid ' + C2.border + ';border-radius:' + rpRadius + ';overflow:hidden}',
      '.rp-facet-hdr{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;cursor:pointer;user-select:none;font-size:13px;font-weight:600;color:' + C2.text + ';background:' + rpSidebarBg + '}',
      '.rp-facet-hdr:hover{background:' + C2.hover + '}',
      '.rp-facet-chevron{transition:transform .2s;line-height:0}',
      '.rp-facet-chevron.open{transform:rotate(180deg)}',
      '.rp-facet-body{padding:8px 12px;border-top:1px solid ' + C2.border + ';background:' + C2.bg + ';display:flex;flex-direction:column;gap:6px}',
      '.rp-facet-body.collapsed{display:none}',
      '.rp-facet-label{display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;color:' + C2.text + '}',
      '.rp-facet-label:hover{color:' + ACCENT + '}',
      '.rp-facet-cb{accent-color:' + ACCENT + ';width:14px;height:14px;cursor:pointer;flex-shrink:0}',
      '.rp-facet-count{margin-left:auto;font-size:11px;color:' + C2.muted + '}',
      '.rp-main{flex:1;min-width:0;padding:20px 24px}',
      '.rp-topbar{display:flex;align-items:center;gap:12px;margin-bottom:20px}',
      '.rp-input-wrap{position:relative;flex:1}',
      '.rp-input{width:100%;padding:10px 14px;background:' + C2.bg + ';border:1px solid ' + C2.border + ';border-radius:' + rpRadius + ';color:' + C2.text + ';font-size:14px;outline:none;transition:border-color .15s}',
      '.rp-input::placeholder{color:' + C2.muted + '}',
      '.rp-input:focus{border-color:' + ACCENT + '}',
      '.rp-spinner{position:absolute;right:12px;top:50%;transform:translateY(-50%);width:14px;height:14px;border:2px solid ' + C2.border + ';border-top-color:' + ACCENT + ';border-radius:50%;animation:aisg-spin .6s linear infinite;display:none}',
      '.rp-spinner.on{display:block}',
      '.rp-meta{font-size:12px;color:' + C2.muted + ';margin-bottom:16px}',
      '.rp-meta em{color:' + C2.text + ';font-style:normal;font-weight:600}',
      '.rp-error{padding:12px 16px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);border-radius:' + rpRadius + ';color:#f87171;font-size:13px;margin-bottom:16px}',
      '.rp-empty{padding:48px 0;text-align:center;color:' + C2.muted + ';font-size:14px}',
      /* Grid layout */
      '.rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(' + RP_CARD_MIN_WIDTH + 'px,1fr));gap:16px}',
      '.rp-card{background:' + C2.bg + ';border:1px solid ' + C2.border + ';border-radius:' + rpRadius + ';overflow:hidden;display:flex;flex-direction:column;text-decoration:none;color:inherit;transition:border-color .15s}',
      '.rp-card:hover{border-color:' + ACCENT + '}',
      '.rp-card-img{width:100%;height:' + RP_IMG_HEIGHT + 'px;object-fit:cover;display:block;background:' + C2.panel + '}',
      '.rp-card-img-ph{width:100%;height:' + RP_IMG_HEIGHT + 'px;background:' + rpAccentDim + ';display:flex;align-items:center;justify-content:center}',
      '.rp-card-body{padding:12px;flex:1;display:flex;flex-direction:column;gap:4px}',
      '.rp-card-title{font-size:13px;font-weight:600;color:' + C2.text + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.4}',
      '.rp-card-snippet{font-size:12px;color:' + C2.muted + ';display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.rp-card-footer{margin-top:auto;padding-top:8px;display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.rp-card-price{font-size:13px;font-weight:700;color:' + ACCENT + '}',
      '.rp-card-url{font-size:10px;color:' + C2.muted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}',
      /* List layout */
      '.rp-list{display:flex;flex-direction:column;gap:0}',
      '.rp-list-item{display:flex;gap:14px;align-items:flex-start;padding:14px 0;border-bottom:1px solid ' + C2.border + ';text-decoration:none;color:inherit}',
      '.rp-list-item:hover .rp-list-title{color:' + ACCENT + '}',
      '.rp-list-img{width:80px;height:60px;object-fit:cover;border-radius:' + rpRadius + ';flex-shrink:0;background:' + C2.panel + ';display:block}',
      '.rp-list-img-ph{width:80px;height:60px;flex-shrink:0;background:' + rpAccentDim + ';border-radius:' + rpRadius + ';display:flex;align-items:center;justify-content:center}',
      '.rp-list-body{flex:1;min-width:0}',
      '.rp-list-title{font-size:14px;font-weight:600;color:' + C2.text + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color .1s}',
      '.rp-list-snippet{font-size:12px;color:' + C2.muted + ';margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
      '.rp-list-meta{display:flex;align-items:center;gap:10px;margin-top:6px}',
      '.rp-list-price{font-size:13px;font-weight:700;color:' + ACCENT + '}',
      '.rp-list-url{font-size:11px;color:' + ACCENT + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      /* Responsive sidebar collapse */
      '@media(max-width:640px){.rp-wrap{flex-direction:column}.rp-sidebar{width:100%;border-right:none;border-bottom:1px solid ' + C2.border + '}}',
    ].join('');

    var rpStyleEl = document.createElement('style');
    rpStyleEl.textContent = rpCss;
    document.head.appendChild(rpStyleEl);

    /* Determine mount target */
    var mountTarget = TARGET_SEL ? document.querySelector(TARGET_SEL) : null;
    if (!mountTarget) {
      mountTarget = document.createElement('div');
      script.parentNode.insertBefore(mountTarget, script.nextSibling);
    }

    /* Build DOM skeleton */
    var wrap = document.createElement('div');
    wrap.className = 'rp-wrap';

    /* Sidebar */
    var sidebar = document.createElement('div');
    sidebar.className = 'rp-sidebar';
    if (RP_FILTER_FIELDS.length > 0) {
      var sbTitle = document.createElement('div');
      sbTitle.className = 'rp-sidebar-title';
      sbTitle.textContent = 'Filters';
      sidebar.appendChild(sbTitle);
    }
    wrap.appendChild(sidebar);

    /* Main area */
    var main = document.createElement('div');
    main.className = 'rp-main';

    var topbar = document.createElement('div');
    topbar.className = 'rp-topbar';

    var inputWrap = document.createElement('div');
    inputWrap.className = 'rp-input-wrap';

    var rpInput = document.createElement('input');
    rpInput.type = 'search';
    rpInput.className = 'rp-input';
    rpInput.placeholder = PLACEHOLDER;
    rpInput.setAttribute('autocomplete', 'off');

    var rpSpinner = document.createElement('div');
    rpSpinner.className = 'rp-spinner';

    inputWrap.appendChild(rpInput);
    inputWrap.appendChild(rpSpinner);
    topbar.appendChild(inputWrap);
    main.appendChild(topbar);

    var metaEl = document.createElement('div');
    metaEl.className = 'rp-meta';
    metaEl.style.display = 'none';
    main.appendChild(metaEl);

    var errorEl2 = document.createElement('div');
    errorEl2.className = 'rp-error';
    errorEl2.style.display = 'none';
    main.appendChild(errorEl2);

    var resultsArea = document.createElement('div');
    main.appendChild(resultsArea);

    wrap.appendChild(main);
    mountTarget.appendChild(wrap);

    /* State */
    var activeFilters = {}; /* { fieldName: Set<string> } */
    var currentFacets = {};
    var rpCurrentXhr  = null;
    var rpDebounce    = null;

    /* Helpers shared with outer scope: normalizeDoc, esc, FM */

    /* Build OData filter string from activeFilters */
    function buildFilter() {
      var parts = [];
      Object.keys(activeFilters).forEach(function(field) {
        var vals = Array.from(activeFilters[field]);
        if (!vals.length) return;
        if (vals.length === 1) {
          parts.push(field + " eq '" + vals[0].replace(/'/g, "''") + "'");
        } else {
          var sub = vals.map(function(v){ return field + " eq '" + v.replace(/'/g, "''") + "'"; });
          parts.push('(' + sub.join(' or ') + ')');
        }
      });
      return parts.join(' and ');
    }

    /* Re-render sidebar facet checkboxes from latest facet data */
    function renderSidebar(facets) {
      currentFacets = facets || {};
      /* Remove old facet sections (keep the title) */
      var children = Array.prototype.slice.call(sidebar.children);
      children.forEach(function(el) {
        if (el.classList.contains('rp-facet')) sidebar.removeChild(el);
      });

      if (!RP_FILTER_FIELDS.length) return;

      RP_FILTER_FIELDS.forEach(function(field) {
        var values = currentFacets[field] || [];
        if (!values.length) return;

        var facetEl = document.createElement('div');
        facetEl.className = 'rp-facet';

        var isCollapsed = false;

        var hdr = document.createElement('div');
        hdr.className = 'rp-facet-hdr';

        var hdrText = document.createElement('span');
        hdrText.textContent = field.charAt(0).toUpperCase() + field.slice(1).replace(/_/g, ' ');
        hdr.appendChild(hdrText);

        var chevron = document.createElement('span');
        chevron.className = 'rp-facet-chevron open';
        chevron.innerHTML = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="' + C2.muted + '" stroke-width="1.8" stroke-linecap="round"><path d="M2 4.5L6 8.5L10 4.5"/></svg>';
        hdr.appendChild(chevron);

        var body = document.createElement('div');
        body.className = 'rp-facet-body';

        hdr.addEventListener('click', function() {
          isCollapsed = !isCollapsed;
          body.classList.toggle('collapsed', isCollapsed);
          chevron.classList.toggle('open', !isCollapsed);
        });

        if (!activeFilters[field]) activeFilters[field] = new Set();

        values.forEach(function(facetItem) {
          var val   = String(facetItem.value);
          var count = facetItem.count;

          var label = document.createElement('label');
          label.className = 'rp-facet-label';

          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.className = 'rp-facet-cb';
          cb.checked = activeFilters[field].has(val);
          cb.addEventListener('change', function() {
            if (cb.checked) {
              activeFilters[field].add(val);
            } else {
              activeFilters[field].delete(val);
            }
            doRpSearch(rpInput.value.trim() || '*');
          });

          var valText = document.createElement('span');
          valText.textContent = val;

          var countEl = document.createElement('span');
          countEl.className = 'rp-facet-count';
          countEl.textContent = count;

          label.appendChild(cb);
          label.appendChild(valText);
          label.appendChild(countEl);
          body.appendChild(label);
        });

        facetEl.appendChild(hdr);
        facetEl.appendChild(body);
        sidebar.appendChild(facetEl);
      });
    }

    /* Render results grid or list */
    var IMG_PH_RP = '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" stroke="' + ACCENT + '" stroke-width="1.5" opacity="0.6"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="5.5" cy="5.5" r="1.5"/><path d="M1 11l4-4 3 3 2-2 5 5"/></svg>';

    function renderResults2(data, query) {
      resultsArea.innerHTML = '';
      errorEl2.style.display = 'none';

      var total = data.total || 0;
      metaEl.style.display = '';
      var qLabel = query === '*' ? '' : ' for <em>' + esc(query) + '</em>';
      metaEl.innerHTML = '<em>' + total + '</em> result' + (total !== 1 ? 's' : '') + qLabel;

      renderSidebar(data.facets || {});

      if (!data.results || !data.results.length) {
        var empty = document.createElement('div');
        empty.className = 'rp-empty';
        empty.textContent = query === '*' ? 'No results found.' : 'No results found for \u201c' + query + '\u201d.';
        resultsArea.appendChild(empty);
        return;
      }

      /* Results from /api/search are already server-normalized: {id,title,snippet,url,image,price,score} */
      var items = data.results;

      if (RP_LAYOUT === 'list') {
        var list = document.createElement('div');
        list.className = 'rp-list';
        items.forEach(function(r) {
          var row2 = r.url ? document.createElement('a') : document.createElement('div');
          row2.className = 'rp-list-item';
          if (r.url) { row2.href = r.url; row2.target = '_blank'; row2.rel = 'noopener noreferrer'; }

          if (r.image) {
            var img = document.createElement('img');
            img.src = r.image; img.alt = r.title || '';
            img.className = 'rp-list-img';
            img.onerror = function(){ img.style.display='none'; };
            row2.appendChild(img);
          } else {
            var ph = document.createElement('div');
            ph.className = 'rp-list-img-ph';
            ph.innerHTML = IMG_PH_RP;
            row2.appendChild(ph);
          }

          var body = document.createElement('div');
          body.className = 'rp-list-body';

          var titleEl = document.createElement('div');
          titleEl.className = 'rp-list-title';
          titleEl.textContent = r.title || '(no title)';
          body.appendChild(titleEl);

          if (r.snippet) {
            var sn = document.createElement('div');
            sn.className = 'rp-list-snippet';
            sn.textContent = r.snippet;
            body.appendChild(sn);
          }

          var metaRow = document.createElement('div');
          metaRow.className = 'rp-list-meta';
          if (r.price) {
            var priceEl = document.createElement('span');
            priceEl.className = 'rp-list-price';
            priceEl.textContent = r.price;
            metaRow.appendChild(priceEl);
          }
          if (r.url) {
            var urlEl = document.createElement('span');
            urlEl.className = 'rp-list-url';
            try { urlEl.textContent = new URL(r.url).hostname; } catch(e) { urlEl.textContent = r.url; }
            metaRow.appendChild(urlEl);
          }
          if (metaRow.children.length) body.appendChild(metaRow);

          row2.appendChild(body);
          list.appendChild(row2);
        });
        resultsArea.appendChild(list);

      } else {
        /* Grid (default) */
        var grid2 = document.createElement('div');
        grid2.className = 'rp-grid';
        items.forEach(function(r) {
          var card = r.url ? document.createElement('a') : document.createElement('div');
          card.className = 'rp-card';
          if (r.url) { card.href = r.url; card.target = '_blank'; card.rel = 'noopener noreferrer'; }

          if (r.image) {
            var img = document.createElement('img');
            img.src = r.image; img.alt = r.title || '';
            img.className = 'rp-card-img';
            img.onerror = function(){ img.style.display='none'; };
            card.appendChild(img);
          } else {
            var ph = document.createElement('div');
            ph.className = 'rp-card-img-ph';
            ph.innerHTML = IMG_PH_RP;
            card.appendChild(ph);
          }

          var body = document.createElement('div');
          body.className = 'rp-card-body';

          var titleEl = document.createElement('div');
          titleEl.className = 'rp-card-title';
          titleEl.textContent = r.title || '(no title)';
          body.appendChild(titleEl);

          if (r.snippet) {
            var sn = document.createElement('div');
            sn.className = 'rp-card-snippet';
            sn.textContent = r.snippet;
            body.appendChild(sn);
          }

          var footer = document.createElement('div');
          footer.className = 'rp-card-footer';

          if (r.price) {
            var priceEl = document.createElement('span');
            priceEl.className = 'rp-card-price';
            priceEl.textContent = r.price;
            footer.appendChild(priceEl);
          } else {
            footer.appendChild(document.createElement('span'));
          }

          if (r.url) {
            var urlEl = document.createElement('span');
            urlEl.className = 'rp-card-url';
            try { urlEl.textContent = new URL(r.url).hostname; } catch(e) { urlEl.textContent = r.url; }
            footer.appendChild(urlEl);
          }

          body.appendChild(footer);
          card.appendChild(body);
          grid2.appendChild(card);
        });
        resultsArea.appendChild(grid2);
      }

      /* Click tracking */
      resultsArea.addEventListener('click', function(e) {
        var link = e.target.closest('a[href]');
        if (!link) return;
        var title = link.querySelector('.rp-card-title, .rp-list-title');
        var titleText = title ? title.textContent : link.textContent.trim().slice(0, 200);
        trackClick('', titleText, link.href, rpInput.value.trim());
      }, { once: true });
    }

    function trackClick(resultId, resultTitle, resultUrl, query) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', API_BASE + '/api/click', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.send(JSON.stringify({ site_id: SITE_ID, query: query, result_id: resultId, result_title: resultTitle, result_url: resultUrl }));
    }

    function doRpSearch(query) {
      if (rpCurrentXhr) { rpCurrentXhr.abort(); }
      rpSpinner.classList.add('on');

      var url = API_BASE + '/api/search?site_id=' + encodeURIComponent(SITE_ID) + '&query=' + encodeURIComponent(query) + '&top=' + RP_PER_PAGE;

      RP_FILTER_FIELDS.forEach(function(f) {
        url += '&facets[]=' + encodeURIComponent(f);
      });

      var filter = buildFilter();
      if (filter) url += '&filter=' + encodeURIComponent(filter);

      var xhr = new XMLHttpRequest();
      rpCurrentXhr = xhr;
      xhr.open('GET', url, true);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

      xhr.onload = function() {
        rpSpinner.classList.remove('on');
        rpCurrentXhr = null;
        var data;
        try { data = JSON.parse(xhr.responseText); } catch(e) { showRpError('Invalid response from server.'); return; }
        if (xhr.status >= 400) { showRpError(data.error || ('Error ' + xhr.status)); return; }
        renderResults2(data, query);
      };
      xhr.onerror = function() { rpSpinner.classList.remove('on'); rpCurrentXhr = null; showRpError('Request failed. Check your connection.'); };
      xhr.onabort = function() { rpSpinner.classList.remove('on'); rpCurrentXhr = null; };
      xhr.send();
    }

    function showRpError(msg) {
      errorEl2.textContent = msg;
      errorEl2.style.display = 'block';
    }

    /* Search input handler */
    rpInput.addEventListener('input', function() {
      var q = rpInput.value.trim();
      clearTimeout(rpDebounce);
      rpDebounce = setTimeout(function() { doRpSearch(q || '*'); }, 350);
    });

    rpInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        clearTimeout(rpDebounce);
        doRpSearch(rpInput.value.trim() || '*');
      }
    });

    /* Auto-search from ?q= URL param on page load */
    var urlParams = new URLSearchParams(window.location.search);
    var initialQ = urlParams.get('q') || '';
    rpInput.value = initialQ;
    doRpSearch(initialQ || '*');
  }

})();
