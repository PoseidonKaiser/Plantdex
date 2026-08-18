const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('checkCanEdit', () => {
  beforeEach(() => setupMocks());

  test('returns true for an allowed editor', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('stephen@golub.io');
    expect(checkCanEdit()).toBe(true);
  });

  test('returns false for an unlisted email', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('stranger@example.com');
    expect(checkCanEdit()).toBe(false);
  });

  test('returns false when session throws', () => {
    global.Session.getActiveUser.mockImplementation(() => { throw new Error('no session'); });
    expect(checkCanEdit()).toBe(false);
  });

  test('is case-insensitive', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('CEASARROMERO@GMAIL.COM');
    expect(checkCanEdit()).toBe(true);
  });
});
