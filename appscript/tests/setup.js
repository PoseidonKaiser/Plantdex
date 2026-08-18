// Load the GAS source file into Node global scope.
// GAS functions are declared with `function` — eval hoists them into this module
// scope; we then explicitly pin them onto global so test files can call them.

// Stub globals that Code.js references at the top level
global.SpreadsheetApp = {};
global.Session = {};
global.LockService = {};
global.PropertiesService = {};
global.ScriptApp = {};
global.HtmlService = {};

const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/Code.js'), 'utf8');

// eslint-disable-next-line no-eval
eval(src);

// Explicitly promote each GAS function to global so Jest's sandbox sees them.
/* global getAllowedEditors_, doGet, getPlants_, updatePlant, addPlant,
          assertCanWrite_, checkCanEdit, writeFields_, getPlantById_, renderApp_, page_, esc_ */
global.getAllowedEditors_ = getAllowedEditors_;
global.doGet = doGet;
global.getPlants_ = getPlants_;
global.updatePlant = updatePlant;
global.addPlant = addPlant;
global.assertCanWrite_ = assertCanWrite_;
global.checkCanEdit = checkCanEdit;
global.writeFields_ = writeFields_;
global.getPlantById_ = getPlantById_;
global.renderApp_ = renderApp_;
global.page_ = page_;
global.esc_ = esc_;
