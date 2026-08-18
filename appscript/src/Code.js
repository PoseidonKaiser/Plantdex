// Plantdex — Google Apps Script Web App
// Bound to: PlantDex Google Sheet
var SPREADSHEET_ID = '1Ygcuetl3BpzlYt7fThD75Z9pDVyptPBeDkakWXSyJm0';
var SHEET_NAME = 'Plants';

/**
 * Web App entry point.
 * Routes:
 *   ?plantId=<id>  → single plant profile card
 *   (no params)    → full collection index
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var plantId = params.plantId || null;

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  var plants = getPlants_(sheet);

  var html;
  if (plantId) {
    var plant = plants.find(function(p) { return String(p.ID) === String(plantId); });
    var baseUrl = ScriptApp.getService().getUrl();
    html = plant ? renderPlantProfile_(plant, baseUrl) : renderNotFound_(plantId, baseUrl);
  } else {
    var baseUrl = ScriptApp.getService().getUrl();
    html = renderIndex_(plants, baseUrl);
  }

  return HtmlService.createHtmlOutput(html)
    .setTitle('Plantdex')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Read plant rows from the sheet.
 * Header row 1 maps column names. Rows with a blank ID are category headers — skipped.
 * Returns array of plain objects keyed by header name, with ID as a string.
 */
function getPlants_(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  var idCol = headers.indexOf('ID');

  return data.slice(1)
    .filter(function(row) {
      return String(row[idCol]).trim() !== '';
    })
    .map(function(row) {
      var plant = {};
      headers.forEach(function(h, col) {
        plant[h] = row[col];
      });
      plant.ID = String(plant.ID).trim();
      return plant;
    });
}

/** Render the full collection as a searchable, sortable flat table */
function renderIndex_(plants, baseUrl) {
  // Build a lean array of only the fields the UI needs
  var rows = plants.map(function(p) {
    return {
      id:       String(p['ID'] || ''),
      category: String(p['Category'] || ''),
      nickname: String(p['Nickname'] || ''),
      type:     String(p['Type'] || ''),
      location: String(p['Location'] || ''),
      url:      baseUrl + '?plantId=' + encodeURIComponent(String(p['ID'] || ''))
    };
  });

  var plantsJson = JSON.stringify(rows);

  var body = [
    '<div class="max-w-3xl mx-auto px-4 py-8">',

    // Header
    '<div class="flex items-center gap-3 mb-6">',
    '  <span class="text-3xl">🌿</span>',
    '  <h1 class="text-2xl font-bold text-[#2d5a3d] tracking-tight">Plantdex</h1>',
    '</div>',

    // Alpine component
    '<div x-data="plantApp()">',

    // Search
    '<div class="mb-4">',
    '  <input',
    '    x-model="search"',
    '    type="search"',
    '    placeholder="Search by nickname, type, or category…"',
    '    class="w-full rounded-xl border border-[#e8f0ea] bg-white px-4 py-2.5 text-sm shadow-sm',
    '           placeholder:text-[#5a7a65] focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30"',
    '  />',
    '</div>',

    // Result count
    '<p class="text-xs text-[#5a7a65] mb-3" x-text="filtered.length + \' plant\' + (filtered.length === 1 ? \'\' : \'s\')"></p>',

    // Table wrapper
    '<div class="overflow-hidden rounded-2xl border border-[#e8f0ea] shadow-sm bg-white">',
    '<table class="w-full border-collapse text-sm">',

    // Thead
    '<thead>',
    '<tr class="bg-[#2d5a3d] text-white">',
    '  <th class="px-4 py-3 text-left font-semibold w-12">#</th>',

    // Sortable headers — macro-expanded inline for GAS string safety
    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors"',
    '      @click="setSort(\'category\')">',
    '    <span class="flex items-center gap-1">Category',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'category\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors"',
    '      @click="setSort(\'nickname\')">',
    '    <span class="flex items-center gap-1">Nickname',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'nickname\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell"',
    '      @click="setSort(\'type\')">',
    '    <span class="flex items-center gap-1">Type',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'type\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors hidden md:table-cell"',
    '      @click="setSort(\'location\')">',
    '    <span class="flex items-center gap-1">Location',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'location\')"></span>',
    '    </span>',
    '  </th>',
    '</tr>',
    '</thead>',

    // Tbody
    '<tbody>',
    '  <template x-for="(plant, i) in filtered" :key="plant.id">',
    '    <tr',
    '      @click="nav(plant.url)"',
    '      class="border-t border-[#e8f0ea] hover:bg-[#f4f7f2] cursor-pointer transition-colors"',
    '    >',
    '      <td class="px-4 py-3 text-[#5a7a65] text-xs font-mono" x-text="plant.id"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] text-xs" x-text="plant.category"></td>',
    '      <td class="px-4 py-3 font-medium text-[#2d5a3d]" x-text="plant.nickname || plant.type || \'—\'"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] hidden sm:table-cell" x-text="plant.type"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] hidden md:table-cell" x-text="plant.location"></td>',
    '    </tr>',
    '  </template>',

    // Empty state
    '  <tr x-show="filtered.length === 0">',
    '    <td colspan="5" class="px-4 py-10 text-center text-[#5a7a65] text-sm">No plants match your search.</td>',
    '  </tr>',
    '</tbody>',
    '</table>',
    '</div>', // end table wrapper

    '</div>', // end x-data
    '</div>', // end container

    // Alpine component definition — plant data embedded as JSON
    '<script>',
    'var PLANTS = ' + plantsJson + ';',
    'function plantApp() {',
    '  return {',
    '    plants: PLANTS,',
    '    search: \'\',',
    '    sortCol: \'nickname\',',
    '    sortDir: \'asc\',',

    '    get filtered() {',
    '      var q = this.search.trim().toLowerCase();',
    '      var list = q',
    '        ? this.plants.filter(function(p) {',
    '            return (p.nickname + \' \' + p.type + \' \' + p.category).toLowerCase().indexOf(q) !== -1;',
    '          })',
    '        : this.plants.slice();',

    '      var col = this.sortCol;',
    '      var dir = this.sortDir === \'asc\' ? 1 : -1;',
    '      list.sort(function(a, b) {',
    '        var av = (a[col] || \'\').toLowerCase();',
    '        var bv = (b[col] || \'\').toLowerCase();',
    '        return av < bv ? -dir : av > bv ? dir : 0;',
    '      });',
    '      return list;',
    '    },',

    '    setSort: function(col) {',
    '      if (this.sortCol === col) {',
    '        this.sortDir = this.sortDir === \'asc\' ? \'desc\' : \'asc\';',
    '      } else {',
    '        this.sortCol = col;',
    '        this.sortDir = \'asc\';',
    '      }',
    '    },',

    '    sortIndicator: function(col) {',
    '      if (this.sortCol !== col) return \'\';',
    '      return this.sortDir === \'asc\' ? \'▲\' : \'▼\';',
    '    },',

    '    nav: function(url) {',
    '      top.location.href = url;',
    '    }',
    '  };',
    '}',
    '<\/script>'
  ].join('\n');

  return page_('Plantdex — Collection', body);
}

/** Render a single plant profile card */
function renderPlantProfile_(p, baseUrl) {
  var fields = [
    ['ID',         p['ID']],
    ['Category',   p['Category']],
    ['Type',       p['Type']],
    ['Rarity',     p['Rarity']],
    ['Nickname',   p['Nickname']],
    ['Source',     p['Where']],
    ['Acquired',   p['When']],
    ['Price',      p['How much']],
    ['Location',   p['Location']],
    ['Pot Size',   p['Pot Size']],
    ['Leaves',     p['Number of Leaves']],
    ['Leaf 👀',    p['Leaf 👀']]
  ];

  var validFields = fields.filter(function(f) {
    return f[1] !== '' && f[1] !== null && f[1] !== undefined;
  });

  var rows = validFields.map(function(f) {
    return (
      '<div class="grid grid-cols-[130px_1fr] sm:grid-cols-[160px_1fr] gap-x-4 py-3 border-b border-[#e8f0ea] last:border-0">' +
      '  <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-center">' + esc_(f[0]) + '</span>' +
      '  <span class="text-[#2d5a3d] font-medium">' + esc_(String(f[1])) + '</span>' +
      '</div>'
    );
  }).join('');

  var title = p['Nickname'] || p['Type'] || 'Plant';
  var subtitle = (p['Type'] || '') + (p['Category'] ? ' · ' + p['Category'] : '');

  var body = [
    '<div class="max-w-2xl mx-auto px-4 py-8">',

    // Back link
    '<a href="#"',
    '   onclick="top.location.href=\'' + baseUrl + '\';return false;"',
    '   class="inline-flex items-center gap-1.5 text-sm text-[#2d5a3d] hover:underline mb-6">',
    '  ← All Plants',
    '</a>',

    // Title block
    '<div class="mb-6">',
    '  <h1 class="text-2xl font-bold text-[#2d5a3d] tracking-tight">' + esc_(title) + '</h1>',
    '  <p class="text-[#5a7a65] text-sm mt-1">' + esc_(subtitle) + '</p>',
    '</div>',

    // Card
    '<div class="bg-white rounded-2xl border border-[#e8f0ea] shadow-sm p-4 sm:p-6">',
    rows,
    '</div>',

    '</div>'
  ].join('\n');

  return page_(esc_(title) + ' — Plantdex', body);
}

function renderNotFound_(id, baseUrl) {
  var body = [
    '<div class="max-w-2xl mx-auto px-4 py-16 text-center">',
    '  <p class="text-4xl mb-4">🌱</p>',
    '  <h1 class="text-xl font-bold text-[#2d5a3d] mb-2">Plant not found</h1>',
    '  <p class="text-[#5a7a65] text-sm mb-6">No plant with ID <strong class="font-semibold text-[#2d5a3d]">' + esc_(String(id)) + '</strong>.</p>',
    '  <a href="#"',
    '     onclick="top.location.href=\'' + baseUrl + '\';return false;"',
    '     class="text-sm text-[#2d5a3d] hover:underline">',
    '    ← Back to collection',
    '  </a>',
    '</div>'
  ].join('\n');

  return page_('Not Found — Plantdex', body);
}

/** HTML shell — Tailwind CDN + Alpine CDN */
function page_(title, body) {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    '  <title>' + title + '</title>',

    '  <script src="https://cdn.tailwindcss.com"><\/script>',
    '  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"><\/script>',

    '  <style>',
    '    body { background-color: #f4f7f2; }',
    '  <\/style>',
    '</head>',
    '<body class="min-h-screen text-gray-900 antialiased">',
    body,
    '</body>',
    '</html>'
  ].join('\n');
}

/** HTML-escape a string */
function esc_(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
