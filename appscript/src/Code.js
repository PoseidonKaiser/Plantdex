// Plantdex — Google Apps Script Web App
// Bound to: PlantDex Google Sheet
var SPREADSHEET_ID = '1Ygcuetl3BpzlYt7fThD75Z9pDVyptPBeDkakWXSyJm0';
var SHEET_NAME = 'Plants';
function getAllowedEditors_() {
  try {
    var val = PropertiesService.getScriptProperties().getProperty('ALLOWED_EDITORS');
    if (!val) return [];
    return val.split(',').map(function(e) { return e.trim().toLowerCase(); });
  } catch(ex) { return []; }
}

/**
 * Returns whether the current user is permitted to edit.
 * Called client-side via google.script.run after page load.
 */
function checkCanEdit() {
  var email = '';
  try { email = Session.getActiveUser().getEmail().toLowerCase(); } catch(ex) {
    console.log('[checkCanEdit] Session.getActiveUser() threw: ' + ex.message);
  }
  var allowed = getAllowedEditors_();
  var result = allowed.indexOf(email) !== -1;
  console.log('[checkCanEdit] email=' + (email || '(empty)') + ' allowed=' + result + ' editors=' + allowed.join(','));
  return result;
}

/**
 * Web App entry point — serves the full SPA for every request.
 * Optional ?plantId=<id> opens the modal immediately via INITIAL_PLANT_ID.
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var initialPlantId = params.plantId || null;
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  var plants = getPlants_(sheet);
  var canEdit = false;
  var baseUrl = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(renderApp_(plants, baseUrl, initialPlantId, canEdit))
    .setTitle('Plantdex')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Read plant rows from the sheet.
 * Header row 1 maps column names. Rows with a blank ID are skipped.
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

/**
 * Update an existing plant row. Called via google.script.run from the client.
 * payload: { id: string, fields: { [header]: value } }
 * Returns the updated plant object.
 */
function updatePlant(payload) {
  assertCanWrite_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return String(h).trim(); });
    var idCol = headers.indexOf('ID');
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() === String(payload.id)) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Plant ID not found: ' + payload.id);
    writeFields_(sheet, rowIndex, headers, payload.fields);
    return getPlantById_(sheet, String(payload.id));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Append a new plant row. Called via google.script.run from the client.
 * payload: { fields: { [header]: value } }
 * Returns the newly created plant object.
 */
function addPlant(payload) {
  assertCanWrite_();
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h){ return String(h).trim(); });
    var idCol = headers.indexOf('ID');
    // Compute next ID
    var ids = data.slice(1).map(function(r){ return Number(r[idCol]); }).filter(function(n){ return !isNaN(n) && n > 0; });
    var nextId = ids.length > 0 ? Math.max.apply(null, ids) + 1 : 1;
    // Build new row
    var newRow = headers.map(function(h) {
      if (h === 'ID') return nextId;
      return payload.fields.hasOwnProperty(h) ? payload.fields[h] : '';
    });
    sheet.appendRow(newRow);
    return getPlantById_(sheet, String(nextId));
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

function assertCanWrite_() {
  var email = '';
  try { email = Session.getActiveUser().getEmail().toLowerCase(); } catch(ex) {}
  if (getAllowedEditors_().indexOf(email) === -1) throw new Error('Not authorized to edit.');
}

function writeFields_(sheet, rowIndex, headers, fields) {
  headers.forEach(function(h, col) {
    if (h === 'ID') return; // never overwrite ID
    if (fields.hasOwnProperty(h)) {
      sheet.getRange(rowIndex, col + 1).setValue(fields[h]);
    }
  });
}

function getPlantById_(sheet, id) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h){ return String(h).trim(); });
  var idCol = headers.indexOf('ID');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      var plant = {};
      headers.forEach(function(h, col){ plant[h] = data[i][col]; });
      plant.ID = String(plant.ID).trim();
      return plant;
    }
  }
  return null;
}

/**
 * Render the full SPA as a string of HTML.
 * Replaces renderIndex_, renderPlantProfile_, renderNotFound_.
 */
function renderApp_(plants, baseUrl, initialPlantId, canEdit) {
  var plantsJson = JSON.stringify(plants);
  var initialPlantIdJson = initialPlantId ? JSON.stringify(initialPlantId) : 'null';
  var canEditJson = canEdit ? 'true' : 'false';

  var body = [
    '<div x-data="plantApp()" x-init="init()" class="max-w-3xl mx-auto px-4 py-8">',

    // ── HEADER ──────────────────────────────────────────────────────────────
    '<div class="flex items-center justify-between gap-3 mb-6">',
    '  <div class="flex items-center gap-3">',
    '    <span class="text-3xl">🌿</span>',
    '    <h1 class="text-2xl font-bold text-[#2d5a3d] tracking-tight">Plantdex</h1>',
    '  </div>',
    '  <button',
    '    x-show="canEdit"',
    '    x-cloak',
    '    @click="openAdd()"',
    '    class="inline-flex items-center gap-1.5 rounded-xl bg-[#2d5a3d] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a7050] transition-colors">',
    '    ＋ Add Plant',
    '  </button>',
    '</div>',

    // ── SEARCH + COUNT ───────────────────────────────────────────────────────
    '<div class="mb-4">',
    '  <input',
    '    x-model="search"',
    '    type="search"',
    '    placeholder="Search by nickname, type, or category…"',
    '    class="w-full rounded-xl border border-[#e8f0ea] bg-white px-4 py-2.5 text-sm shadow-sm',
    '           placeholder:text-[#5a7a65] focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30"',
    '  />',
    '</div>',
    '<p class="text-xs text-[#5a7a65] mb-3" x-text="filtered.length + \' plant\' + (filtered.length === 1 ? \'\' : \'s\')"></p>',

    // ── INDEX TABLE ──────────────────────────────────────────────────────────
    '<div class="overflow-hidden rounded-2xl border border-[#e8f0ea] shadow-sm bg-white">',
    '<table class="w-full border-collapse text-sm">',
    '<thead>',
    '<tr class="bg-[#2d5a3d] text-white">',
    '  <th class="px-4 py-3 text-left font-semibold w-12">#</th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors"',
    '      @click="setSort(\'Category\')">',
    '    <span class="flex items-center gap-1">Category',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'Category\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors"',
    '      @click="setSort(\'Nickname\')">',
    '    <span class="flex items-center gap-1">Nickname',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'Nickname\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors hidden sm:table-cell"',
    '      @click="setSort(\'Type\')">',
    '    <span class="flex items-center gap-1">Type',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'Type\')"></span>',
    '    </span>',
    '  </th>',

    '  <th class="px-4 py-3 text-left font-semibold cursor-pointer select-none hover:bg-white/10 transition-colors hidden md:table-cell"',
    '      @click="setSort(\'Location\')">',
    '    <span class="flex items-center gap-1">Location',
    '      <span class="text-xs opacity-70" x-text="sortIndicator(\'Location\')"></span>',
    '    </span>',
    '  </th>',
    '</tr>',
    '</thead>',
    '<tbody>',
    '  <template x-for="plant in filtered" :key="plant.ID">',
    '    <tr',
    '      @click="openView(plant.ID)"',
    '      class="border-t border-[#e8f0ea] hover:bg-[#f4f7f2] cursor-pointer transition-colors"',
    '    >',
    '      <td class="px-4 py-3 text-[#5a7a65] text-xs font-mono" x-text="plant.ID"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] text-xs" x-text="plant.Category"></td>',
    '      <td class="px-4 py-3 font-medium text-[#2d5a3d]" x-text="plant.Nickname || plant.Type || \'—\'"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] hidden sm:table-cell" x-text="plant.Type"></td>',
    '      <td class="px-4 py-3 text-[#5a7a65] hidden md:table-cell" x-text="plant.Location"></td>',
    '    </tr>',
    '  </template>',
    '  <tr x-show="filtered.length === 0">',
    '    <td colspan="5" class="px-4 py-10 text-center text-[#5a7a65] text-sm">No plants match your search.</td>',
    '  </tr>',
    '</tbody>',
    '</table>',
    '</div>', // end table wrapper

    // ── MODAL OVERLAY ────────────────────────────────────────────────────────
    '<div',
    '  x-show="modalOpen"',
    '  x-cloak',
    '  class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"',
    '  @click.self="close()"',
    '  @keydown.escape.window="close()"',
    '>',
    '  <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">',

    // Card header
    '    <div class="flex items-center justify-between px-6 py-4 border-b border-[#e8f0ea]">',
    '      <h2 class="text-lg font-bold text-[#2d5a3d] truncate pr-4"',
    '          x-text="mode === \'add\' ? \'Add Plant\' : (current ? (current.Nickname || current.Type || \'Plant\') : \'\')">',
    '      </h2>',
    '      <button @click="close()" class="text-[#5a7a65] hover:text-[#2d5a3d] transition-colors text-xl leading-none flex-shrink-0">×</button>',
    '    </div>',

    // ── VIEW mode ──
    '    <div x-show="mode === \'view\'" class="px-6 py-4">',

    // Field grid — each field rendered via template
    '      <template x-if="current">',
    '        <div class="divide-y divide-[#e8f0ea]">',

    // We emit individual field rows checking emptiness client-side
    '          <template x-if="current.Category && String(current.Category).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Category</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current.Category"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current.Type && String(current.Type).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Type</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current.Type"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current.Rarity && String(current.Rarity) !== \'0\' && String(current.Rarity).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Rarity</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current.Rarity"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current.Nickname && String(current.Nickname).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Nickname</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current.Nickname"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'Where\'] && String(current[\'Where\']).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Source</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'Where\']"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'When\'] && String(current[\'When\']).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Acquired</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'When\']"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'How much\'] && String(current[\'How much\']).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Price</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'How much\']"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current.Location && String(current.Location).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Location</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current.Location"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'Pot Size\'] && String(current[\'Pot Size\']).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Pot Size</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'Pot Size\']"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'Number of Leaves\'] && String(current[\'Number of Leaves\']).trim()">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Number of Leaves</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'Number of Leaves\']"></span>',
    '            </div>',
    '          </template>',

    '          <template x-if="current[\'Leaf 👀\'] || current[\'Leaf 👀\'] === true">',
    '            <div class="grid grid-cols-[140px_1fr] gap-x-4 py-3">',
    '              <span class="text-xs font-semibold uppercase tracking-wide text-[#5a7a65] self-start pt-0.5">Leaf 👀</span>',
    '              <span class="text-[#2d5a3d] font-medium" x-text="current[\'Leaf 👀\'] ? \'Yes\' : \'No\'"></span>',
    '            </div>',
    '          </template>',

    '        </div>',
    '      </template>',

    // VIEW footer
    '      <div class="flex items-center gap-3 pt-4 mt-2 border-t border-[#e8f0ea]">',
    '        <button',
    '          x-show="canEdit"',
    '          x-cloak',
    '          @click="openEdit()"',
    '          class="rounded-xl bg-[#2d5a3d] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a7050] transition-colors">',
    '          Edit',
    '        </button>',
    '        <button',
    '          @click="copyUrl()"',
    '          class="rounded-xl border border-[#e8f0ea] px-4 py-2 text-sm font-semibold text-[#2d5a3d] hover:bg-[#f4f7f2] transition-colors">',
    '          <span x-text="copied ? \'Copied!\' : \'Copy URL\'"></span>',
    '        </button>',
    '      </div>',
    '    </div>', // end VIEW mode

    // ── EDIT / ADD mode ──
    '    <div x-show="mode === \'edit\' || mode === \'add\'" class="px-6 py-4">',
    '      <div class="space-y-4">',

    // Category
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Category</label>',
    '          <input x-model="form[\'Category\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Type
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Type</label>',
    '          <input x-model="form[\'Type\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Rarity
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Rarity</label>',
    '          <input x-model="form[\'Rarity\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Nickname
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Nickname</label>',
    '          <input x-model="form[\'Nickname\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Where (Source)
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Source (Where)</label>',
    '          <input x-model="form[\'Where\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // When (Acquired)
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Acquired (When)</label>',
    '          <input x-model="form[\'When\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // How much (Price)
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Price (How much)</label>',
    '          <input x-model="form[\'How much\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Location
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Location</label>',
    '          <input x-model="form[\'Location\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Pot Size
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Pot Size</label>',
    '          <input x-model="form[\'Pot Size\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Number of Leaves
    '        <div>',
    '          <label class="block text-xs font-semibold uppercase tracking-wide text-[#5a7a65] mb-1">Number of Leaves</label>',
    '          <input x-model="form[\'Number of Leaves\']" type="text"',
    '                 class="w-full rounded-xl border border-[#e8f0ea] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a3d]/30">',
    '        </div>',

    // Leaf 👀 (checkbox)
    '        <div class="flex items-center gap-3">',
    '          <input x-model="form[\'Leaf \ud83d\udc40\']" type="checkbox" id="leaf-eye"',
    '                 class="h-4 w-4 rounded border-[#e8f0ea] text-[#2d5a3d] focus:ring-[#2d5a3d]/30">',
    '          <label for="leaf-eye" class="text-sm font-medium text-[#2d5a3d]">Leaf 👀</label>',
    '        </div>',

    // Error display
    '        <div x-show="error" x-cloak class="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" x-text="error"></div>',

    '      </div>',

    // EDIT/ADD footer
    '      <div class="flex items-center gap-3 pt-4 mt-4 border-t border-[#e8f0ea]">',
    '        <button',
    '          @click="save()"',
    '          :disabled="saving"',
    '          class="inline-flex items-center gap-2 rounded-xl bg-[#2d5a3d] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a7050] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">',
    '          <svg x-show="saving" class="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">',
    '            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>',
    '            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>',
    '          </svg>',
    '          <span x-text="saving ? \'Saving…\' : \'Save\'"></span>',
    '        </button>',
    '        <button',
    '          @click="mode === \'add\' ? close() : mode = \'view\'"',
    '          :disabled="saving"',
    '          class="rounded-xl border border-[#e8f0ea] px-4 py-2 text-sm font-semibold text-[#2d5a3d] hover:bg-[#f4f7f2] transition-colors disabled:opacity-60 disabled:cursor-not-allowed">',
    '          Cancel',
    '        </button>',
    '      </div>',
    '    </div>', // end EDIT/ADD mode

    '  </div>', // end card
    '</div>', // end modal overlay

    '</div>', // end x-data

    // ── CLIENT-SIDE SCRIPT ───────────────────────────────────────────────────
    '<script>',
    'var PLANTS = ' + plantsJson + ';',
    'var BASE_URL = ' + JSON.stringify(baseUrl) + ';',
    'var INITIAL_PLANT_ID = ' + initialPlantIdJson + ';',
    'var CAN_EDIT = ' + canEditJson + ';',
    '',
    'function gasRun(fnName, arg) {',
    '  return new Promise(function(resolve, reject) {',
    '    google.script.run.withSuccessHandler(resolve).withFailureHandler(reject)[fnName](arg);',
    '  });',
    '}',
    '',
    'function plantApp() {',
    '  return {',
    '    plants: PLANTS,',
    '    baseUrl: BASE_URL,',
    '    canEdit: CAN_EDIT,',
    '    search: \'\',',
    '    sortCol: \'Nickname\',',
    '    sortDir: \'asc\',',
    '    modalOpen: false,',
    '    mode: \'view\',',
    '    current: null,',
    '    form: {},',
    '    saving: false,',
    '    error: \'\',',
    '    copied: false,',
    '',
    '    init: function() {',
    '      var self = this;',
    '      if (INITIAL_PLANT_ID) { self.openView(INITIAL_PLANT_ID); }',
'      if (typeof google !== \'undefined\' && google.script && google.script.url) {',
'        google.script.url.getLocation(function(loc) {',
'          var id = loc && loc.parameter ? loc.parameter.plantId : null;',
'          if (id && !self.modalOpen) { self.openView(id); }',
'        });',
'      }',
'      if (typeof google !== \'undefined\' && google.script && google.script.run) {',
'        google.script.run',
'          .withSuccessHandler(function(result) { self.canEdit = result; })',
'          .withFailureHandler(function() { self.canEdit = false; })',
'          .checkCanEdit();',
'      }',
'    },',
    '',
    '    get filtered() {',
    '      var q = this.search.trim().toLowerCase();',
    '      var list = q',
    '        ? this.plants.filter(function(p) {',
    '            return ((p.Nickname||\'\')+\' \'+(p.Type||\'\')+\' \'+(p.Category||\'\')).toLowerCase().indexOf(q) !== -1;',
    '          })',
    '        : this.plants.slice();',
    '      var col = this.sortCol;',
    '      var dir = this.sortDir === \'asc\' ? 1 : -1;',
    '      list.sort(function(a, b) {',
    '        var av = String(a[col]||\'\').toLowerCase();',
    '        var bv = String(b[col]||\'\').toLowerCase();',
    '        return av < bv ? -dir : av > bv ? dir : 0;',
    '      });',
    '      return list;',
    '    },',
    '',
    '    setSort: function(col) {',
    '      if (this.sortCol === col) { this.sortDir = this.sortDir === \'asc\' ? \'desc\' : \'asc\'; }',
    '      else { this.sortCol = col; this.sortDir = \'asc\'; }',
    '    },',
    '',
    '    sortIndicator: function(col) {',
    '      if (this.sortCol !== col) return \'\';',
    '      return this.sortDir === \'asc\' ? \'▲\' : \'▼\';',
    '    },',
    '',
    '    findPlant: function(id) {',
    '      return this.plants.find(function(p){ return String(p.ID) === String(id); }) || null;',
    '    },',
    '',
    '    openView: function(id) {',
    '      var p = this.findPlant(id);',
    '      this.current = p;',
    '      this.mode = \'view\';',
    '      this.error = \'\';',
    '      this.copied = false;',
    '      this.modalOpen = true;',
    '    },',
    '',
    '    openEdit: function() {',
    '      this.form = JSON.parse(JSON.stringify(this.current));',
    '      this.mode = \'edit\';',
    '      this.error = \'\';',
    '    },',
    '',
    '    openAdd: function() {',
    '      this.form = {',
    '        Category: \'\', Type: \'\', Rarity: \'0\', Nickname: \'\',',
    '        \'Where\': \'\', \'When\': \'\', \'How much\': \'\',',
    '        Location: \'\', \'Pot Size\': \'\', \'Number of Leaves\': \'\',',
    '        \'Leaf \ud83d\udc40\': false',
    '      };',
    '      this.current = null;',
    '      this.mode = \'add\';',
    '      this.error = \'\';',
    '      this.modalOpen = true;',
    '    },',
    '',
    '    close: function() {',
    '      this.modalOpen = false;',
    '      this.mode = \'view\';',
    '      this.current = null;',
    '      this.form = {};',
    '      this.error = \'\';',
    '      this.copied = false;',
    '      if (typeof google !== \'undefined\' && google.script && google.script.history) {',
    '        google.script.history.replace(null, {}, \'\');',
    '      }',
    '    },',
    '',
    '    save: function() {',
    '      var self = this;',
    '      self.saving = true;',
    '      self.error = \'\';',
    '      var fields = JSON.parse(JSON.stringify(self.form));',
    '      var promise = self.mode === \'add\'',
    '        ? gasRun(\'addPlant\', { fields: fields })',
    '        : gasRun(\'updatePlant\', { id: self.current.ID, fields: fields });',
    '      promise.then(function(result) {',
    '        if (self.mode === \'add\') {',
    '          self.plants.push(result);',
    '          self.current = result;',
    '        } else {',
    '          var idx = self.plants.findIndex(function(p){ return String(p.ID) === String(result.ID); });',
    '          if (idx !== -1) self.plants.splice(idx, 1, result);',
    '          self.current = result;',
    '        }',
    '        self.mode = \'view\';',
    '        self.saving = false;',
    '      }).catch(function(err) {',
    '        self.error = (err && err.message) ? err.message : \'Save failed. Please try again.\';',
    '        self.saving = false;',
    '      });',
    '    },',
    '',
    '    plantUrl: function(id) {',
    '      return this.baseUrl + \'?plantId=\' + encodeURIComponent(id);',
    '    },',
    '',
    '    copyUrl: function() {',
    '      var self = this;',
    '      var url = self.plantUrl(self.current.ID);',
    '      var done = function() { self.copied = true; setTimeout(function(){ self.copied = false; }, 1500); };',
    '      if (navigator.clipboard && navigator.clipboard.writeText) {',
    '        navigator.clipboard.writeText(url).then(done).catch(function() { self.fallbackCopy(url); done(); });',
    '      } else { self.fallbackCopy(url); done(); }',
    '    },',
    '',
    '    fallbackCopy: function(text) {',
    '      var ta = document.createElement(\'textarea\');',
    '      ta.value = text; ta.style.position = \'fixed\'; ta.style.opacity = \'0\';',
    '      document.body.appendChild(ta); ta.focus(); ta.select();',
    '      try { document.execCommand(\'copy\'); } catch(e) {}',
    '      document.body.removeChild(ta);',
    '    }',
    '  };',
    '}',
    '<\/script>'
  ].join('\n');

  return page_('Plantdex', body);
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
    '    [x-cloak] { display: none; }',
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
