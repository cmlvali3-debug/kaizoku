// ============================================================
// OITAKU IMPORT — adapters/autobellAdapter.js
// Autobell (Hyundai Glovis) — autobellglobal.com
// Korean auction platform — Playwright scraper
// No API key required for public listings
// ============================================================

const axios = require('axios');

let chromium;
try { chromium = require('playwright').chromium; } catch { chromium = null; }

// Autobell Global has a semi-public JSON API used by their website
const AUTOBELL_API = 'https://www.autobellglobal.com/api/v1/vehicles';

async function searchAutobell({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  // Try JSON API first (reverse-engineered from network requests)
  try {
    return await searchAutobellAPI({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant });
  } catch (apiErr) {
    console.warn('[Autobell] API failed, falling back to scraper:', apiErr.message);
  }

  // Fallback to Playwright scraper
  if (!chromium) {
    console.warn('[Autobell] Playwright not installed — skipping');
    return [];
  }

  return searchAutobellScraper({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant });
}

async function searchAutobellAPI({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant }) {
  const params = {
    make:       brand || undefined,
    model:      model || undefined,
    year_from:  yearMin > 0 ? yearMin : undefined,
    year_to:    yearMax < 9999 ? yearMax : undefined,
    mileage_to: kmMax < 999999 ? kmMax : undefined,
    price_to:   budgetMax < 999999 ? Math.round(budgetMax * 1450) : undefined, // EUR→KRW
    page:       1,
    per_page:   20,
  };

  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

  const response = await axios.get(AUTOBELL_API, {
    params,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; OitakuImportBot/1.0)',
      'Accept':     'application/json',
      'Referer':    'https://www.autobellglobal.com',
    },
    timeout: 10000,
  });

  const vehicles = response.data?.data || response.data?.vehicles || response.data?.results || [];

  if (!Array.isArray(vehicles) || vehicles.length === 0) throw new Error('No results from API');

  let cars = vehicles;
  if (q) {
    const ql = q.toLowerCase();
    cars = cars.filter(v =>
      (v.make || '').toLowerCase().includes(ql) ||
      (v.model || '').toLowerCase().includes(ql)
    );
  }

  return cars.map(v => normalizeAutobellAPI(v));
}

async function searchAutobellScraper({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant }) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    const params = new URLSearchParams();
    if (brand) params.set('make', brand);
    if (model) params.set('model', model);
    if (yearMin > 0) params.set('yearFrom', yearMin);
    if (yearMax < 9999) params.set('yearTo', yearMax);
    if (kmMax < 999999) params.set('mileageTo', kmMax);
    if (budgetMax < 999999) params.set('priceTo', Math.round(budgetMax * 1450));

    await page.goto(`https://www.autobellglobal.com/vehicles?${params.toString()}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const cars = await page.evaluate(() => {
      const items = document.querySelectorAll('.vehicle-item, .car-card, [class*="VehicleCard"], [class*="vehicle-list"] li');
      return Array.from(items).slice(0, 20).map(el => {
        const getText = sel => el.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';

        const priceText = getText('[class*="price"]').replace(/[^0-9]/g, '');
        const kmText    = getText('[class*="mileage"]').replace(/[^0-9]/g, '');
        const yearText  = getText('[class*="year"]').match(/\d{4}/)?.[0];

        return {
          name:       getText('[class*="title"], [class*="name"], h3, h2'),
          price:      parseInt(priceText) || 0,
          km:         parseInt(kmText) || 0,
          year:       parseInt(yearText) || 0,
          grade:      getText('[class*="grade"]') || 'N/A',
          imageUrl:   getAttr('img', 'src') || getAttr('img', 'data-src'),
          listingUrl: el.querySelector('a')?.href || '',
        };
      }).filter(c => c.name && c.price > 0);
    });

    return cars.map((c, i) => normalizeAutobellScrape(c, i));

  } catch (err) {
    console.error('[Autobell] Scraper error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

function normalizeAutobellAPI(v) {
  const priceKRW = parseFloat(v.price || v.Price || 0);
  const priceEUR = Math.round(priceKRW / 1450);

  return {
    id:         `autobell-${v.id || v.vehicle_id || v.seq}`,
    name:       `${v.make || ''} ${v.model || ''} ${v.grade || ''}`.trim(),
    brand:      v.make || '',
    model:      v.model || '',
    year:       parseInt(v.year || v.model_year || 0),
    km:         parseInt(v.mileage || v.odometer || 0),
    price:      priceEUR,
    local:      `₩${priceKRW.toLocaleString('ko-KR')}`,
    grade:      v.grade || v.condition || 'N/A',
    source:     'autobell',
    country:    'kr',
    type:       'auction',
    volant:     'left',
    icon:       '🏎️',
    trans:      v.transmission || 'N/A',
    carbu:      v.fuel_type || v.fuel || 'N/A',
    cv:         null,
    imageUrl:   v.main_image || v.image_url || null,
    listingUrl: v.url || `https://www.autobellglobal.com/vehicles/${v.id}`,
  };
}

function normalizeAutobellScrape(c, index) {
  const priceKRW = c.price < 10000 ? c.price * 10000 : c.price;
  const priceEUR = Math.round(priceKRW / 1450);

  return {
    id:         `autobell-${Date.now()}-${index}`,
    name:       c.name,
    brand:      extractBrand(c.name),
    model:      '',
    year:       c.year,
    km:         c.km,
    price:      priceEUR,
    local:      `₩${priceKRW.toLocaleString('ko-KR')}`,
    grade:      c.grade,
    source:     'autobell',
    country:    'kr',
    type:       'auction',
    volant:     'left',
    icon:       '🏎️',
    trans:      'N/A',
    carbu:      'N/A',
    cv:         null,
    imageUrl:   c.imageUrl,
    listingUrl: c.listingUrl,
  };
}

const KR_BRANDS = ['Hyundai','Kia','Genesis','SsangYong','Chevrolet','Renault','Samsung'];
function extractBrand(name = '') {
  const nl = name.toLowerCase();
  return KR_BRANDS.find(b => nl.includes(b.toLowerCase())) || '';
}

module.exports = { searchAutobell };
