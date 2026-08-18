require('./setup');

describe('esc_', () => {
  test('escapes ampersands', () => expect(esc_('a&b')).toBe('a&amp;b'));
  test('escapes less-than', () => expect(esc_('<div>')).toBe('&lt;div&gt;'));
  test('escapes quotes', () => expect(esc_('"hi"')).toBe('&quot;hi&quot;'));
  test('converts non-strings', () => expect(esc_(42)).toBe('42'));
  test('passes safe strings through', () => expect(esc_('hello world')).toBe('hello world'));
});
