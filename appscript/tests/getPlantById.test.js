const { setupMocks } = require('./gas-mocks');
require('./setup');

describe('getPlantById_', () => {
  let sheet;
  beforeEach(() => { sheet = setupMocks(); });

  test('returns plant with matching ID', () => {
    const plant = getPlantById_(sheet, '2');
    expect(plant).not.toBeNull();
    expect(plant.Nickname).toBe('GrandMon');
  });

  test('returns null for non-existent ID', () => {
    expect(getPlantById_(sheet, '999')).toBeNull();
  });

  test('ID in returned plant is a string', () => {
    const plant = getPlantById_(sheet, '1');
    expect(typeof plant.ID).toBe('string');
  });
});
