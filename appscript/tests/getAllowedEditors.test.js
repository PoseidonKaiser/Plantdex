const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('getAllowedEditors_', () => {
  beforeEach(() => setupMocks());

  test('returns array from comma-separated property', () => {
    const editors = getAllowedEditors_();
    expect(editors).toContain('stephen@golub.io');
    expect(editors).toContain('ceasarromero@gmail.com');
  });

  test('lowercases all emails', () => {
    global.PropertiesService.getScriptProperties().getProperty.mockReturnValue('UPPER@EXAMPLE.COM');
    expect(getAllowedEditors_()).toContain('upper@example.com');
  });

  test('trims whitespace around emails', () => {
    global.PropertiesService.getScriptProperties().getProperty.mockReturnValue(' a@b.com , c@d.com ');
    expect(getAllowedEditors_()).toEqual(['a@b.com', 'c@d.com']);
  });

  test('returns empty array when property is null', () => {
    global.PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
    expect(getAllowedEditors_()).toEqual([]);
  });

  test('returns empty array when PropertiesService throws', () => {
    global.PropertiesService.getScriptProperties.mockImplementation(() => { throw new Error('fail'); });
    expect(getAllowedEditors_()).toEqual([]);
  });
});
