const { setupMocks, makeSheetMock } = require('./gas-mocks');
require('./setup');

describe('getPlants_', () => {
  let sheet;
  beforeEach(() => { sheet = setupMocks(); });

  test('returns only rows with a non-blank ID', () => {
    const plants = getPlants_(sheet);
    expect(plants).toHaveLength(3); // 4 data rows, 1 has blank ID
  });

  test('IDs are strings', () => {
    const plants = getPlants_(sheet);
    plants.forEach(p => expect(typeof p.ID).toBe('string'));
  });

  test('maps header names to values', () => {
    const plants = getPlants_(sheet);
    expect(plants[0].Category).toBe('Philodendron');
    expect(plants[0].Type).toBe('White Knight');
    expect(plants[0].Nickname).toBe('White Knight');
  });

  test('skips rows with blank ID', () => {
    const plants = getPlants_(sheet);
    const ids = plants.map(p => p.ID);
    expect(ids).not.toContain('');
    expect(ids).not.toContain('ShouldBeSkipped');
  });

  test('handles empty sheet (header only)', () => {
    const emptySheet = makeSheetMock([
      ['ID', 'Category', 'Type', 'Rarity', 'Nickname', 'Where', 'When', 'How much', 'Location', 'Pot Size', 'Number of Leaves', 'Leaf 👀']
    ]);
    const plants = getPlants_(emptySheet);
    expect(plants).toHaveLength(0);
  });
});
