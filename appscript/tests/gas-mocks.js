// Mock factory — call setupMocks() to reset state before each test

function makeSheetMock(rows) {
  // rows = 2D array including header row
  return {
    getDataRange: () => ({ getValues: () => rows.map(r => r.slice()) }),
    getRange: jest.fn().mockReturnValue({ setValue: jest.fn() }),
    appendRow: jest.fn(),
  };
}

function setupMocks(sheetRows) {
  const sheet = makeSheetMock(sheetRows || defaultRows());
  global.SpreadsheetApp = {
    openById: jest.fn().mockReturnValue({
      getSheetByName: jest.fn().mockReturnValue(sheet),
    }),
  };
  global.Session = {
    getActiveUser: jest.fn().mockReturnValue({ getEmail: jest.fn().mockReturnValue('stephen@golub.io') }),
  };
  global.LockService = {
    getScriptLock: jest.fn().mockReturnValue({
      waitLock: jest.fn(),
      releaseLock: jest.fn(),
    }),
  };
  global.PropertiesService = {
    getScriptProperties: jest.fn().mockReturnValue({
      getProperty: jest.fn().mockReturnValue('stephen@golub.io,ceasarromero@gmail.com'),
    }),
  };
  global.ScriptApp = {
    getService: jest.fn().mockReturnValue({ getUrl: jest.fn().mockReturnValue('https://script.google.com/test') }),
  };
  global.HtmlService = {
    createHtmlOutput: jest.fn().mockReturnValue({
      setTitle: jest.fn().mockReturnThis(),
      addMetaTag: jest.fn().mockReturnThis(),
    }),
  };
  return sheet;
}

function defaultRows() {
  return [
    ['ID', 'Category', 'Type', 'Rarity', 'Nickname', 'Where', 'When', 'How much', 'Location', 'Pot Size', 'Number of Leaves', 'Leaf 👀'],
    [1, 'Philodendron', 'White Knight', 0, 'White Knight', 'Lowes', '', 20, '', '6 inch', '', false],
    [2, 'Monstera', 'Deliciosa', 0, 'GrandMon', 'Abuelita', '', 'Free', '', '12 inch', '', false],
    [3, 'Hoya', 'Hindu Rope', 0, 'Main', 'Plant Con', '', 30, '', '6 inch', '', false],
    ['', 'ShouldBeSkipped', '', 0, '', '', '', '', '', '', '', false],  // blank ID — category header row, should be skipped
  ];
}

module.exports = { setupMocks, makeSheetMock, defaultRows };
