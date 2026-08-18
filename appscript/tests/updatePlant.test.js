const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('updatePlant', () => {
  let sheet;
  beforeEach(() => { sheet = setupMocks(); });

  test('throws for unauthorized user', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('stranger@example.com');
    expect(() => updatePlant({ id: '1', fields: { Nickname: 'X' } })).toThrow('Not authorized');
  });

  test('throws if plant ID not found', () => {
    expect(() => updatePlant({ id: '999', fields: { Nickname: 'X' } })).toThrow('Plant ID not found');
  });

  test('calls writeFields_ for a valid plant ID', () => {
    // ID 1 is at data index 1 (0-based), so rowIndex = 1 + 1 = 2 (1-based sheet row)
    expect(() => updatePlant({ id: '1', fields: { Nickname: 'Updated' } })).not.toThrow();
    expect(sheet.getRange).toHaveBeenCalled();
  });
});
