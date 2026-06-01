// ============================================================
// OITAKU IMPORT — adapters/kcarAdapter.js
// K Car (kcar.com) — Playwright scraper (Tokyo server)
// ============================================================

let chromium;
try { chromium = require('playwright').chromium; } catch { chromium = null; }

const BASE_URL = 'https://www.kcar.com';

// Chemin Chromium selon l'environnement (Docker vs local)
const CHROMIUM_EXEC = process.env.CHROMIUM_PATH ||
  (process.platform === 'linux' ? '/usr/bin/chromium' : undefined);

async function searchKCar({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999 }) {
  if (!chromium) {
    console.warn('[K Car] Playwright non installé');
    return [];
  }

  let browser;
  try {
    const launchOpts = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    };
    if (CHROMIUM_EXEC) launchOpts.executablePath = CHROMIUM_EXEC;

    browser = await chromium.launch(launchOpts);
    const context = await browser.newContext({
      locale: 'ko-KR',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    const params = new URLSearchParams();
    if (brand)            params.set('maker', brand);
    if (model)            params.set('model', model);
    if (yearMin)          params.set('yearFrom', yearMin);
    if (yearMax < 9999)   params.set('yearTo', yearMax);
    if (kmMax < 999999)   params.set('mileageTo', kmMax);
    if (budgetMax < 999999) params.set('priceTo', Math.round(budgetMax * 1450));

    await page.goto(`${BASE_URL}/car/search?${params.toString()}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const cars = await page.evaluate(() => {
      const items = document.querySelectorAll('.car-item, .list-item, [class*="CarItem"], [class*="carItem"]');
      return Array.from(items).slice(0, 20).map(el => {
        const getText = sel => el.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';
        const priceText = getText('[class*="price"]').replace(/[^0-9]/g, '');
        const kmText    = getText('[class*="mileage"], [class*="km"]').replace(/[^0-9]/g, '');
        const yearText  = getText('[class*="year"]').match(/\d{4}/)?.[0] || '0';
        return {
          rawName:  getText('[class*="title"], [class*="name"], h3, h4'),
          price:    parseInt(priceText) || 0,
          km:       parseInt(kmText)    || 0,
          year:     parseInt(yearText)  || 0,
          imageUrl: getAttr('img', 'src') || getAttr('img', 'data-src'),
          linkHref: el.querySelector('a')?.href || '',
        };
      }).filter(c => c.rawName && c.price > 0);
    });

    return cars.map((c, i) => normalizeKCar(c, i));
  } catch (err) {
    console.error('[K Car] Erreur scraper:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

function normalizeKCar(c, index) {
  const priceKRW = c.price < 10000 ? c.price * 10000 : c.price;
  const priceEUR = Math.round(priceKRW / 1450);
  return {
    id: `kcar-${Date.now()}-${index}`,
    name: c.rawName,
    brand: extractBrand(c.rawName),
    model: '',
    year: c.year,
    km: c.km,
    price: priceEUR,
    local: `₩${priceKRW.toLocaleString('ko-KR')}`,
    grade: 'N/A',
    source: 'kcar',
    country: 'kr',
    type: 'occasion',
    volant: 'left',
    icon: '🚗',
    trans: 'N/A',
    carbu: 'N/A',
    cv: null,
    imageUrl: c.imageUrl,
    listingUrl: c.linkHref,
  };
}

const KR_BRANDS = ['Hyundai','Kia','Genesis','SsangYong','Chevrolet','Renault'];
function extractBrand(name = '') {
  const nl = name.toLowerCase();
  return KR_BRANDS.find(b => nl.includes(b.toLowerCase())) || '';
}

module.exports = { searchKCar };
