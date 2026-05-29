// ============================================================
// OITAKU IMPORT — adapters/encarAdapter.js
// Encar.com (Korea #1) — semi-public JSON API
// No API key required for basic queries
// ============================================================

const axios = require('axios');

const BASE_URL = 'https://api.encar.com/search/car/list/general';

// Maps Encar condition codes to our grade system
const GRADE_MAP = {
  'A': 'A', 'B': 'B', 'C': 'B+', 'R': 'S', 'N': 'A+',
};

async function searchEncar({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  // Build Encar query string
  // Encar uses their own query syntax: (Manufacturer.현대)AND(ModelGroup.아반떼)
  let conditions = ['(Condition.A)'];

  if (brand) {
    const krBrand = translateBrandToKorean(brand);
    if (krBrand) conditions.push(`(Manufacturer.${krBrand})`);
  }

  if (yearMin > 0) conditions.push(`(Year.${yearMin}~)`);
  if (yearMax < 9999) conditions.push(`(Year.~${yearMax})`);
  if (kmMax < 999999) conditions.push(`(Mileage.~${kmMax})`);
  if (budgetMax < 999999) conditions.push(`(Price.~${Math.round(budgetMax * 1450)})`); // EUR → KRW approx

  const params = {
    count: true,
    q:     conditions.join('AND'),
    sr:    '|ModifiedDate|0|20',
  };

  const headers = {
    'User-Agent': 'Mozilla/5.0 (compatible; OitakuImportBot/1.0)',
    'Referer':    'https://www.encar.com',
    'Accept':     'application/json',
  };

  const response = await axios.get(BASE_URL, { params, headers, timeout: 10000 });
  const data = response.data;

  if (!data?.SearchResults) return [];

  // Filter by keyword client-side if needed
  let cars = data.SearchResults;
  if (q) {
    const ql = q.toLowerCase();
    cars = cars.filter(c =>
      (c.Manufacturer || '').toLowerCase().includes(ql) ||
      (c.ModelGroup   || '').toLowerCase().includes(ql) ||
      (c.BadgeName    || '').toLowerCase().includes(ql)
    );
  }

  return cars.map(c => normalizeEncar(c));
}

function normalizeEncar(c) {
  const priceKRW = (c.Price || 0) * 10000; // Encar stores in 만원 (10k KRW)
  const priceEUR = Math.round(priceKRW / 1450);

  return {
    id:      `encar-${c.Id}`,
    name:    `${c.Manufacturer || ''} ${c.ModelGroup || ''} ${c.BadgeName || ''}`.trim(),
    brand:   c.Manufacturer || '',
    model:   c.ModelGroup || '',
    year:    c.Year || 0,
    km:      c.Mileage || 0,
    price:   priceEUR,
    local:   `₩${priceKRW.toLocaleString('ko-KR')}`,
    grade:   GRADE_MAP[c.Condition] || 'B',
    source:  'encar',
    country: 'kr',
    type:    'occasion',
    volant:  'left', // Korean cars are all LHD
    icon:    '🚗',
    trans:   c.GearBox || 'N/A',
    carbu:   c.FuelType || 'N/A',
    cv:      null,
    imageUrl: c.Photo ? `https://ci.encar.com${c.Photo}` : null,
    listingUrl: `https://www.encar.com/dc/dc_cardetailview.do?carid=${c.Id}`,
  };
}

// Translate common brand names to Korean for Encar queries
function translateBrandToKorean(brand) {
  const map = {
    'hyundai': '현대', 'kia': '기아', 'genesis': '제네시스',
    'ssangyong': '쌍용', 'chevrolet': '쉐보레', 'renault': '르노삼성',
  };
  return map[brand.toLowerCase()] || null;
}

module.exports = { searchEncar };
