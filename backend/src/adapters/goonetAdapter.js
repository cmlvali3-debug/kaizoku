// ============================================================
// OITAKU IMPORT — adapters/goonetAdapter.js
// Goo-net Exchange — Japan's largest used car export site
// Scraping Playwright (public site) — no key required for basic use
// Optional: GOONET_API_TOKEN for partner API (higher rate limits)
// ============================================================

const axios = require('axios');

// Lazy-load playwright
let chromium;
try { chromium = require('playwright').chromium; } catch { chromium = null; }

const GOONET_SEARCH_URL = 'https://www.goo-net-exchange.com/usedcars/search/';

async function searchGooNet({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  // Try API first if token available
  const token = process.env.GOONET_API_TOKEN;
  if (token) {
    return searchGooNetAPI({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant, token });
  }

  if (!chromium) {
    console.warn('[Goo-net] Playwright not installed — skipping');
    return [];
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Build search URL
    const params = new URLSearchParams();
    if (brand) params.set('maker_name', brand.toUpperCase());
    if (model) params.set('car_name', model);
    if (yearMin > 0) params.set('year_from', yearMin);
    if (yearMax < 9999) params.set('year_to', yearMax);
    if (kmMax < 999999) params.set('mileage_to', Math.round(kmMax / 1000)); // km → 1000km unit
    if (budgetMax < 999999) params.set('price_to', Math.round(budgetMax * 160)); // EUR → JPY

    const keyword = [brand, model, q].filter(Boolean).join('+') || 'export';
    params.set('keyword', keyword);
    params.set('lang', 'en');

    await page.goto(`${GOONET_SEARCH_URL}?${params.toString()}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const cars = await page.evaluate(() => {
      const items = document.querySelectorAll('.car-list-item, .vehicle-card, [class*="CarList"], [class*="car-item"]');
      return Array.from(items).slice(0, 20).map(el => {
        const getText = sel => el.querySelector(sel)?.textContent?.trim() || '';
        const getAttr = (sel, attr) => el.querySelector(sel)?.getAttribute(attr) || '';

        const priceText = getText('[class*="price"]').replace(/[^0-9]/g, '');
        const kmText    = getText('[class*="mileage"], [class*="odometer"]').replace(/[^0-9]/g, '');
        const yearText  = getText('[class*="year"]').match(/\d{4}/)?.[0] || '0';
        const name      = getText('[class*="title"], [class*="name"], h3, h2');

        return {
          name:       name,
          price:      parseInt(priceText) || 0,
          km:         parseInt(kmText) * 1000 || 0, // site shows in 1000km
          year:       parseInt(yearText) || 0,
          imageUrl:   getAttr('img', 'src') || getAttr('img', 'data-src'),
          listingUrl: el.querySelector('a')?.href || '',
          grade:      getText('[class*="grade"]') || 'N/A',
          trans:      getText('[class*="transmission"]') || 'N/A',
        };
      }).filter(c => c.name && c.price > 0);
    });

    return cars.map((c, i) => normalizeGooNet(c, i));

  } catch (err) {
    console.error('[Goo-net] Scraper error:', err.message);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}

async function searchGooNetAPI({ q, brand, model, yearMin, yearMax, kmMax, budgetMax, volant, token }) {
  // Partner API endpoint (requires GOONET_API_TOKEN)
  const params = {
    token,
    maker:      brand || undefined,
    model:      model || undefined,
    year_from:  yearMin > 0 ? yearMin : undefined,
    year_to:    yearMax < 9999 ? yearMax : undefined,
    mileage_to: kmMax < 999999 ? kmMax : undefined,
    price_to:   budgetMax < 999999 ? Math.round(budgetMax * 160) : undefined,
    limit:      20,
    lang:       'en',
  };

  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

  const response = await axios.get('https://api.goo-net-exchange.com/v1/vehicles', {
    params,
    timeout: 15000,
  });

  const vehicles = response.data?.vehicles || response.data?.data || [];
  return vehicles.map(v => normalizeGooNetAPI(v));
}

function normalizeGooNet(c, index) {
  const priceJPY = c.price < 100000 ? c.price * 10000 : c.price;
  const priceEUR = Math.round(priceJPY / 160);

  return {
    id:         `goonet-${Date.now()}-${index}`,
    name:       c.name,
    brand:      extractBrand(c.name),
    model:      '',
    year:       c.year,
    km:         c.km,
    price:      priceEUR,
    local:      `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:      c.grade || 'N/A',
    source:     'goo-net',
    country:    'jp',
    type:       'occasion',
    volant:     'right', // JDM
    icon:       '🚗',
    trans:      c.trans || 'N/A',
    carbu:      'N/A',
    cv:         null,
    imageUrl:   c.imageUrl,
    listingUrl: c.listingUrl,
  };
}

function normalizeGooNetAPI(v) {
  const priceJPY = parseFloat(v.price || 0);
  const priceEUR = Math.round(priceJPY / 160);

  return {
    id:         `goonet-${v.id || v.vehicle_id}`,
    name:       `${v.maker || ''} ${v.model || ''} ${v.grade || ''}`.trim(),
    brand:      v.maker || '',
    model:      v.model || '',
    year:       parseInt(v.year || 0),
    km:         parseInt(v.mileage || 0) * 1000,
    price:      priceEUR,
    local:      `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:      v.auction_grade || v.grade || 'N/A',
    source:     'goo-net',
    country:    'jp',
    type:       'occasion',
    volant:     'right',
    icon:       '🚗',
    trans:      v.transmission || 'N/A',
    carbu:      v.fuel || 'N/A',
    cv:         null,
    imageUrl:   v.main_photo || v.image || null,
    listingUrl: v.url || `https://www.goo-net-exchange.com/usedcars/detail/${v.id}`,
  };
}

const JP_BRANDS = ['Nissan','Toyota','Honda','Mazda','Subaru','Mitsubishi','Lexus','Infiniti','Suzuki','Daihatsu'];
function extractBrand(name = '') {
  const nl = name.toLowerCase();
  return JP_BRANDS.find(b => nl.includes(b.toLowerCase())) || '';
}

module.exports = { searchGooNet };
