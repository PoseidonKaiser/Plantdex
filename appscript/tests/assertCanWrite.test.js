const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('assertCanWrite_', () => {
  beforeEach(() => setupMocks());

  test('does not throw for an allowed editor', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('stephen@golub.io');
    expect(() => assertCanWrite_()).not.toThrow();
  });

  test('throws for an unlisted email', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('hacker@evil.com');
    expect(() => assertCanWrite_()).toThrow('Not authorized to edit.');
  });

  test('is case-insensitive', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('STEPHEN@GOLUB.IO');
    expect(() => assertCanWrite_()).not.toThrow();
  });

  test('throws when session returns empty string', () => {
    global.Session.getActiveUser().getEmail.mockReturnValue('');
    expect(() => assertCanWrite_()).toThrow();
  });
});
