const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('writeFields_', () => {
  let sheet;
  beforeEach(() => { sheet = setupMocks(); });

  test('sets a cell value for a matching header', () => {
    const headers = ['ID', 'Category', 'Type', 'Nickname'];
    writeFields_(sheet, 2, headers, { Nickname: 'New Name' });
    // Nickname is col index 3 → col + 1 = 4
    expect(sheet.getRange).toHaveBeenCalledWith(2, 4);
    expect(sheet.getRange(2, 4).setValue).toHaveBeenCalledWith('New Name');
  });

  test('never writes to the ID column', () => {
    const headers = ['ID', 'Category'];
    writeFields_(sheet, 2, headers, { ID: '999', Category: 'Monstera' });
    // Only Category should be written (col 2), not ID (col 1)
    const setCalls = sheet.getRange.mock.calls.map(c => c[1]);
    expect(setCalls).not.toContain(1); // col 1 = ID
    expect(setCalls).toContain(2);     // col 2 = Category
  });

  test('ignores fields not in headers', () => {
    const headers = ['ID', 'Nickname'];
    writeFields_(sheet, 2, headers, { NonExistent: 'value' });
    expect(sheet.getRange).not.toHaveBeenCalled();
  });
});
