const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('addPlant', () => {
  let sheet;
  beforeEach(() => { sheet = setupMocks(); });

  test('appends a new row to the sheet', () => {
    addPlant({ fields: { Category: 'Monstera', Type: 'Albo', Nickname: 'New One' } });
    expect(sheet.appendRow).toHaveBeenCalledTimes(1);
  });

  test('assigns next ID as max existing ID + 1', () => {
    // Existing IDs in defaultRows are 1, 2, 3 → next should be 4
    addPlant({ fields: { Category: 'Test', Type: 'Test', Nickname: 'Test' } });
    const appendedRow = sheet.appendRow.mock.calls[0][0];
    expect(appendedRow[0]).toBe(4); // ID is first column
  });

  test('throws for unauthorized user', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('hacker@evil.com');
    expect(() => addPlant({ fields: {} })).toThrow('Not authorized');
  });
});
