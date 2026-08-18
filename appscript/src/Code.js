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

/** Render the full collection as a grouped index page */
function renderIndex_(plants, baseUrl) {
  // Group by Category
  var groups = {};
  var order = [];
  plants.forEach(function(p) {
    var cat = p['Category'] || 'Other';
    if (!groups[cat]) { groups[cat] = []; order.push(cat); }
    groups[cat].push(p);
  });

  var body = '<h1>🌿 Plantdex</h1>';
  order.forEach(function(cat) {
    body += '<h2>' + esc_(cat) + '</h2>';
    body += '<table>';
    body += '<thead><tr><th>#</th><th>Nickname</th><th>Type</th><th>Location</th></tr></thead><tbody>';
    groups[cat].forEach(function(p) {
      body += '<tr>' +
        '<td style="color:#5a7a65;font-size:.85em">' + esc_(p['ID']) + '</td>' +
        '<td><a href="#" onclick="top.location.href=\'' + baseUrl + '?plantId=' + esc_(p['ID']) + '\';return false;">' + esc_(p['Nickname'] || p['Type'] || '—') + '</a></td>' +
        '<td>' + esc_(p['Type'] || '') + '</td>' +
        '<td>' + esc_(p['Location'] || '') + '</td>' +
        '</tr>';
    });
    body += '</tbody></table>';
  });

  return page_('Plantdex — Collection', body);
}

/** Render a single plant profile card */
function renderPlantProfile_(p, baseUrl) {
  var fields = [
    ['ID',              p['ID']],
    ['Category',        p['Category']],
    ['Type',            p['Type']],
    ['Rarity',          p['Rarity']],
    ['Nickname',        p['Nickname']],
    ['Source',          p['Where']],
    ['Acquired',        p['When']],
    ['Price',           p['How much']],
    ['Location',        p['Location']],
    ['Pot Size',        p['Pot Size']],
    ['Leaves',          p['Number of Leaves']],
    ['Leaf 👀',         p['Leaf 👀']]
  ];

  var rows = fields
    .filter(function(f) { return f[1] !== '' && f[1] !== null && f[1] !== undefined; })
    .map(function(f) {
      return '<tr><th>' + esc_(f[0]) + '</th><td>' + esc_(String(f[1])) + '</td></tr>';
    }).join('');

  var title = p['Nickname'] || p['Type'] || 'Plant';

  return page_(esc_(title) + ' — Plantdex',
    '<a href="#" onclick="top.location.href=\'' + baseUrl + '\';return false;" class="back">← All Plants</a>' +
    '<h1>' + esc_(title) + '</h1>' +
    '<p class="subtitle">' + esc_(p['Type'] || '') + (p['Category'] ? ' · ' + esc_(p['Category']) : '') + '</p>' +
    '<table class="profile"><tbody>' + rows + '</tbody></table>'
  );
}

function renderNotFound_(id, baseUrl) {
  return page_('Not Found — Plantdex',
    '<h1>🌱 Plant not found</h1>' +
    '<p>No plant with ID <strong>' + esc_(String(id)) + '</strong>.</p>' +
    '<p><a href="#" onclick="top.location.href=\'' + baseUrl + '\';return false;">← Back to collection</a></p>'
  );
}

/** Minimal HTML shell with inline CSS */
function page_(title, body) {
  return '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + title + '</title>' +
    '<style>' +
      'body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f4f7f2;color:#183126;padding:20px 16px;max-width:720px;margin:0 auto}' +
      'h1{color:#2d5a3d;margin:16px 0 4px}' +
      'h2{color:#2d5a3d;margin:28px 0 8px;font-size:1.1em;text-transform:uppercase;letter-spacing:.05em}' +
      '.subtitle{color:#5a7a65;margin:0 0 20px;font-size:.95em}' +
      '.back{display:inline-block;margin-bottom:12px;color:#2d5a3d;text-decoration:none;font-size:.9em}' +
      '.back:hover{text-decoration:underline}' +
      'table{border-collapse:collapse;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(32,67,49,.10);margin-bottom:24px}' +
      'th,td{padding:10px 14px;text-align:left;border-bottom:1px solid #e8f0ea;font-size:.95em}' +
      'thead tr{background:#2d5a3d;color:#fff}' +
      'thead th{font-weight:600}' +
      'tbody tr:last-child td,tbody tr:last-child th{border-bottom:0}' +
      'tbody tr:hover{background:#f0f5f1}' +
      'table.profile th{color:#5a7a65;font-weight:600;width:130px;white-space:nowrap}' +
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
