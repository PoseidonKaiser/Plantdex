// Plantdex — Google Apps Script Web App
// Spreadsheet ID is baked in as a constant; all reads go through this.
var SPREADSHEET_ID = '1Ygcuetl3BpzlYt7fThD75Z9pDVyptPBeDkakWXSyJm0';
var SHEET_NAME = 'Plants'; // adjust if the sheet tab has a different name

/**
 * Entry point for the Web App.
 * Routes:
 *   ?plantId=<row id>  → render single plant profile card
 *   (no params)        → render full collection index
 */
function doGet(e) {
  var params = e && e.parameter ? e.parameter : {};
  var plantId = params.plantId || null;

  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  var plants = getPlants_(sheet);

  var html;
  if (plantId) {
    var plant = plants.find(function(p) { return String(p.id) === String(plantId); });
    html = plant ? renderPlantProfile_(plant) : renderNotFound_(plantId);
  } else {
    html = renderIndex_(plants);
  }

  return HtmlService.createHtmlOutput(html)
    .setTitle('Plantdex')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Read all plant rows from the sheet.
 * Expects header row 1; data starts row 2.
 * Returns array of plain objects keyed by header name.
 */
function getPlants_(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0].map(function(h) { return String(h).trim(); });
  return data.slice(1).map(function(row, i) {
    var plant = { id: i + 1 };
    headers.forEach(function(h, col) {
      plant[h] = row[col];
    });
    return plant;
  }).filter(function(p) {
    // Skip completely empty rows
    return headers.some(function(h) { return h && p[h] !== ''; });
  });
}

/** Render the full collection as an HTML index page */
function renderIndex_(plants) {
  var rows = plants.map(function(p) {
    return '<tr>' +
      '<td><a href="?plantId=' + p.id + '">' + esc_(p['Nickname'] || p['Type'] || 'Plant') + '</a></td>' +
      '<td>' + esc_(p['Type'] || '') + '</td>' +
      '<td>' + esc_(p['Genus'] || '') + '</td>' +
      '<td>' + esc_(p['Location'] || '') + '</td>' +
      '</tr>';
  }).join('');

  return page_('Plantdex — Collection',
    '<h1>🌿 Plantdex</h1>' +
    '<table>' +
      '<thead><tr><th>Nickname</th><th>Type</th><th>Genus</th><th>Location</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>'
  );
}

/** Render a single plant profile card */
function renderPlantProfile_(p) {
  var fields = [
    ['Type', p['Type']], ['Genus', p['Genus']], ['Rarity', p['Rarity']],
    ['Nickname', p['Nickname']], ['Source', p['Source']], ['Acquired', p['When']],
    ['Price', p['How much']], ['Location', p['Location']], ['Pot Size', p['Pot Size']],
    ['Leaves', p['Number of Leaves']], ['Leaf 👀', p['Leaf 👀']]
  ];
  var details = fields.filter(function(f) { return f[1] !== '' && f[1] !== null && f[1] !== undefined; })
    .map(function(f) {
      return '<tr><th>' + esc_(f[0]) + '</th><td>' + esc_(String(f[1])) + '</td></tr>';
    }).join('');

  return page_(esc_(p['Nickname'] || p['Type'] || 'Plant') + ' — Plantdex',
    '<a href="?" style="text-decoration:none">← All Plants</a>' +
    '<h1>' + esc_(p['Nickname'] || p['Type'] || 'Plant') + '</h1>' +
    '<table class="profile"><tbody>' + details + '</tbody></table>'
  );
}

function renderNotFound_(id) {
  return page_('Not Found — Plantdex',
    '<h1>🌱 Plant not found</h1><p>No plant with ID ' + esc_(String(id)) + '.</p><p><a href="?">← Back to collection</a></p>'
  );
}

/** Minimal HTML shell with inline CSS */
function page_(title, body) {
  return '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<style>' +
      'body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f4f7f2;color:#183126;padding:20px}' +
      'h1{color:#2d5a3d;margin-bottom:16px}' +
      'table{border-collapse:collapse;width:100%;max-width:700px;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(32,67,49,.10)}' +
      'th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e8f0ea}' +
      'thead tr{background:#2d5a3d;color:#fff}' +
      'tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}' +
      'table.profile th{color:#5a7a65;font-weight:600;width:140px}' +
      'a{color:#2d5a3d}' +
    '</style>' +
    '</head><body>' + body + '</body></html>';
}

/** HTML-escape a string */
function esc_(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
