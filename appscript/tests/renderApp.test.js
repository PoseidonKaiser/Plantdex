require('./setup');

// ── helpers ──────────────────────────────────────────────────────────────────

const SAMPLE_PLANTS = [
  { ID: '1', Category: 'Tropical', Nickname: 'Monstera', Type: 'Monstera deliciosa', Location: 'Living Room', Rarity: '3', 'Leaf 👀': true },
  { ID: '2', Category: 'Succulent', Nickname: 'Aloe', Type: 'Aloe vera', Location: 'Bedroom', Rarity: '1', 'Leaf 👀': false },
  { ID: '3', Category: 'Tropical', Nickname: 'Pothos', Type: 'Epipremnum aureum', Location: 'Office', Rarity: '2', 'Leaf 👀': false },
  { ID: '4', Category: 'Fern', Nickname: 'Boston', Type: 'Nephrolepis exaltata', Location: 'Bathroom', Rarity: '1', 'Leaf 👀': false },
];

function render(plants, initialId, canEdit) {
  return renderApp_(plants || [], initialId || null, canEdit || false);
}

function renderPage(title, body) {
  return page_(title, body);
}

// ── page_() — font + background + base styles ────────────────────────────────

describe('page_() — Inter font from Google Fonts', () => {
  test('includes Google Fonts preconnect link', () => {
    const html = renderPage('Test', '<p>body</p>');
    expect(html).toContain('https://fonts.googleapis.com');
  });

  test('includes Inter font stylesheet link', () => {
    const html = renderPage('Test', '<p>body</p>');
    expect(html).toContain('family=Inter');
  });

  test('body uses radial-gradient background not flat color', () => {
    const html = renderPage('Test', '<p>body</p>');
    expect(html).toContain('radial-gradient');
  });

  test('body specifies Inter font-family', () => {
    const html = renderPage('Test', '<p>body</p>');
    expect(html).toContain('font-family');
    expect(html).toContain('Inter');
  });

  test('does not use old flat background-color only style', () => {
    const html = renderPage('Test', '<p>body</p>');
    // Must not have the old bare background-color line without gradient
    expect(html).not.toMatch(/body\s*\{\s*background-color:\s*#f4f7f2\s*;\s*\}/);
  });

  test('includes [x-cloak] rule', () => {
    const html = renderPage('Test', '<p>body</p>');
    expect(html).toContain('[x-cloak]');
  });
});

// ── Heading — tighter letter-spacing + text-3xl ──────────────────────────────

describe('renderApp_() — Plantdex heading', () => {
  test('h1 has negative letter-spacing style', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('letter-spacing:-0.04em');
  });

  test('h1 uses text-3xl class', () => {
    const html = render(SAMPLE_PLANTS);
    // Should include text-3xl on the h1 element
    expect(html).toMatch(/h1[^>]*text-3xl/);
  });

  test('h1 does not use plain text-2xl', () => {
    const html = render(SAMPLE_PLANTS);
    // The heading should not still be text-2xl (upgraded to text-3xl)
    expect(html).not.toMatch(/h1[^>]*text-2xl/);
  });
});

// ── Stat cards ───────────────────────────────────────────────────────────────

describe('renderApp_() — stat cards', () => {
  test('stats getter is present in the Alpine component script', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('get stats()');
  });

  test('stat cards grid container is present in HTML', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('grid-cols-2');
    expect(html).toContain('sm:grid-cols-4');
  });

  test('total plants card renders with x-text binding to stats.total', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('stats.total');
    expect(html).toContain('Total Plants');
  });

  test('top-category cards rendered with x-for loop', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('x-for="cat in stats.cats"');
  });

  test('stats getter computes top categories by count', () => {
    const html = render(SAMPLE_PLANTS);
    // stats.cats should be part of the getter logic
    expect(html).toContain('stats.cats');
  });
});

// ── Modal — green-tinted backdrop blur ───────────────────────────────────────

describe('renderApp_() — modal backdrop', () => {
  test('modal overlay uses green-tinted rgba background in inline style', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('rgba(15,31,23,.5)');
  });

  test('modal overlay has backdrop-filter blur', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('backdrop-filter:blur(3px)');
  });

  test('modal overlay does not use plain bg-black/40 class', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).not.toContain('bg-black/40');
  });
});

// ── Modal card shadow ─────────────────────────────────────────────────────────

describe('renderApp_() — modal card shadow', () => {
  test('modal card has large box-shadow inline style', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('box-shadow:0 25px 80px rgba(0,0,0,.25)');
  });
});

// ── Table wrapper shadow ──────────────────────────────────────────────────────

describe('renderApp_() — table wrapper shadow', () => {
  test('table wrapper uses inline green-tinted shadow instead of shadow-sm class', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('box-shadow:0 14px 34px rgba(32,67,49,.10)');
  });

  test('table wrapper does not use plain shadow-sm class on the wrapper div', () => {
    const html = render(SAMPLE_PLANTS);
    // The table wrapper (overflow-hidden rounded-2xl) should not have shadow-sm
    expect(html).not.toMatch(/overflow-hidden rounded-2xl[^"]*shadow-sm/);
  });
});

// ── Buttons — hover lift ──────────────────────────────────────────────────────

describe('renderApp_() — button hover lift effect', () => {
  test('primary buttons have transition inline style', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('transition:.18s ease');
  });

  test('primary buttons have onmouseover translateY', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain("onmouseover=\"this.style.transform='translateY(-1px)'\"");
  });

  test('primary buttons have onmouseout reset', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain("onmouseout=\"this.style.transform=''\"");
  });
});

// ── Profile badges ────────────────────────────────────────────────────────────

describe('renderApp_() — profile card badges', () => {
  test('view mode has Category badge with x-show and x-text', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('current && current.Category');
    // Should have a badge-style element
    expect(html).toMatch(/rounded-full[^>]*px-3[^>]*py-1/);
  });

  test('view mode has Leaf Watch badge', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('Leaf Watch');
  });

  test('badges are in a flex-wrap container below the modal header', () => {
    const html = render(SAMPLE_PLANTS);
    expect(html).toContain('flex flex-wrap gap-2');
  });
});
