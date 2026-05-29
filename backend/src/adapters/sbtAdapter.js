// ============================================================
// OITAKU IMPORT — adapters/sbtAdapter.js
// SBT Japan — sbtjapan.com — Playwright scraper
// No API key required — public website
// ============================================================

let chromium;
try { chromium = require('playwright').chromium; } catch { chromium = null; }

const BASE_URL = 'https://www.sbtjapan.com';

async function searchSBT({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  if (!chromium) {
    console.warn('[SBT Japan] Playwright not installed — skipping');
    return [];
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // SBT uses /car-for-sale/ with GET params
    const params = new URLSearchParams();
    if (brand) params.set('make', brand.toUpperCase());
    if (model) params.set('model', model.toUpperCase());
    if (yearMin > 0) params.set('year_from', yearMin);
    if (yearMax < 9999) params.set('year_to', yearMax);
    if (kmMax < 999999) params.set('mileage_to', kmMax);
    if (budgetMax < 999999) params.set('price_to', Math.round(budgetMax * 160)); // EUR→JPY
    if (volant === 'right') params.set('steering', 'RHD');
    if (volant === 'left')  params.set('steering', 'LHD');
    if (q) params.set('keyword', q);

    await page.goto(`${BASE_URL}/car-for-sale/?${params.toString()}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const cars = await page.evaluate(() => {
      // SBT listing cards
      const items = document.querySelectorAll('.vehicle-list .vehicle-item, .car-list .car-item, [class*="vehicle-card"]');
      return Array.from(items).slice(0, 20).map(el => {
        const getText = sel => el.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';

        const priceText = getText('[class*="price"]').replace(/[^0-9]/g, '');
        const kmText    = getText('[class*="mileage"]').replace(/[^0-9]/g, '');
        const yearText  = getText('[class*="year"]').match(/\d{4}/)?.[0];

        return {
          name:       getText('[class*="title"], h3, h2, .name'),
          price:      parseInt(priceText) || 0,
          km:         parseInt(kmText) || 0,
          year:       parseInt(yearText) || 0,
          grade:      getText('[class*="grade"]') || 'N/A',
          trans:      getText('[class*="mission"], [class*="trans"]') || 'N/A',
          carbu:      getText('[class*="fuel"]') || 'N/A',
          imageUrl:   getAttr('img', 'src') || getAttr('img', 'data-src'),
          listingUrl: el.querySelector('a')?.href || '',
        };
      }).filter(c => c.name && c.price > 0);
    });

    return cars.map((c, i) => normalizeSBT(c, i));

  } catch (err) {
    console.error('[SBT Japan] Scraper error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

function normalizeSBT(c, index) {
  // SBT prices are typically in USD
  const priceUSD = c.price;
  const priceEUR = Math.round(priceUSD * 0.92);
  const priceJPY = Math.round(priceUSD * 155);

  return {
    id:         `sbt-${Date.now()}-${index}`,
    name:       c.name,
    brand:      extractBrand(c.name),
    model:      '',
    year:       c.year,
    km:         c.km,
    price:      priceEUR,
    local:      `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:      c.grade,
    source:     'sbt',
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

const JP_BRANDS = ['Nissan','Toyota','Honda','Mazda','Subaru','Mitsubishi','Lexus','Infiniti','Suzuki','Daihatsu'];
function extractBrand(name = '') {
  const nl = name.toLowerCase();
  return JP_BRANDS.find(b => nl.includes(b.toLowerCase())) || '';
}

module.exports = { searchSBT };
