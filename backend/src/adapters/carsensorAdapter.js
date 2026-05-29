// ============================================================
// OITAKU IMPORT — adapters/carsensorAdapter.js
// CarSensor.net — Japan's major domestic used car site
// Playwright scraper — no key required
// Note: CarSensor is domestic JP, not export-focused.
//       Use the international section or filter for export-eligible cars.
// ============================================================

let chromium;
try { chromium = require('playwright').chromium; } catch { chromium = null; }

const BASE_URL = 'https://www.carsensor.net';

async function searchCarSensor({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  if (!chromium) {
    console.warn('[CarSensor] Playwright not installed — skipping');
    return [];
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // CarSensor uses /cars/used/ with brand code in URL path
    const brandCode = BRAND_CODES[brand.toLowerCase()] || '';
    const params = new URLSearchParams();

    if (yearMin > 0) params.set('YSTKN', yearMin);
    if (yearMax < 9999) params.set('YSTEK', yearMax);
    if (kmMax < 999999) params.set('MKTKN', Math.round(kmMax / 1000)); // in 1000km
    if (budgetMax < 999999) {
      params.set('PRICEK', Math.round(budgetMax * 160 / 10000)); // EUR → 万円
    }
    if (q) params.set('FREEWORD', q);

    const path = brandCode ? `/cars/used/${brandCode}/` : '/cars/used/';
    await page.goto(`${BASE_URL}${path}?${params.toString()}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const cars = await page.evaluate(() => {
      const items = document.querySelectorAll('article.cs-item, .cassetteSort .cassette, [class*="carItem"]');
      return Array.from(items).slice(0, 20).map(el => {
        const getText = sel => el.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';

        const priceText = getText('[class*="price"]').replace(/[^0-9]/g, '');
        const kmText    = getText('[class*="mileage"], [class*="odometer"]').replace(/[^0-9]/g, '');
        const yearText  = getText('[class*="year"], .spec-year').match(/\d{4}/)?.[0];

        return {
          name:       getText('[class*="title"], h3, .car-name'),
          price:      parseInt(priceText) || 0,       // in 万円
          km:         parseInt(kmText) || 0,           // in 1000km
          year:       parseInt(yearText) || 0,
          grade:      getText('[class*="grade"]') || 'N/A',
          trans:      getText('[class*="mission"]') || 'N/A',
          carbu:      getText('[class*="fuel"]') || 'N/A',
          imageUrl:   getAttr('img', 'src') || getAttr('img', 'data-src'),
          listingUrl: el.querySelector('a')?.href || '',
        };
      }).filter(c => c.name && c.price > 0);
    });

    return cars.map((c, i) => normalizeCarSensor(c, i));

  } catch (err) {
    console.error('[CarSensor] Scraper error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

function normalizeCarSensor(c, index) {
  const priceJPY = c.price * 10000; // 万円 → JPY
  const priceEUR = Math.round(priceJPY / 160);
  const kmActual = c.km * 1000; // 1000km → km

  return {
    id:         `carsensor-${Date.now()}-${index}`,
    name:       c.name,
    brand:      extractBrand(c.name),
    model:      '',
    year:       c.year,
    km:         kmActual,
    price:      priceEUR,
    local:      `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:      c.grade,
    source:     'carsensor',
    country:    'jp',
    type:       'occasion',
    volant:     'right',
    icon:       '🚗',
    trans:      c.trans,
    carbu:      c.carbu,
    cv:         null,
    imageUrl:   c.imageUrl,
    listingUrl: c.listingUrl,
  };
}

// CarSensor brand codes (Japanese romaji → site path codes)
const BRAND_CODES = {
  'toyota':     'TOYOTA',
  'nissan':     'NISSAN',
  'honda':      'HONDA',
  'mazda':      'MAZDA',
  'subaru':     'SUBARU',
  'mitsubishi': 'MITSUBISHI',
  'suzuki':     'SUZUKI',
  'daihatsu':   'DAIHATSU',
  'lexus':      'LEXUS',
  'infiniti':   'INFINITI',
};

const JP_BRANDS = Object.keys(BRAND_CODES).map(b => b.charAt(0).toUpperCase() + b.slice(1));
function extractBrand(name = '') {
  const nl = name.toLowerCase();
  return JP_BRANDS.find(b => nl.includes(b.toLowerCase())) || '';
}

module.exports = { searchCarSensor };
