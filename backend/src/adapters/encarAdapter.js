// ============================================================
// OITAKU IMPORT — adapters/encarAdapter.js
// Encar.com (Korea #1) — semi-public JSON API
// No API key required — works from Asian IPs (Tokyo/Singapore)
// ============================================================

const axios = require('axios');

const BASE_URL = 'https://api.encar.com/search/car/list/general';

const GRADE_MAP = { 'A': 'A', 'B': 'B', 'C': 'B+', 'R': 'S', 'N': 'A+' };

// Headers simulant un navigateur coréen
const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Origin':          'https://www.encar.com',
  'Referer':         'https://www.encar.com/',
  'sec-ch-ua':       '"Chromium";v="124", "Google Chrome";v="124"',
  'sec-fetch-mode':  'cors',
  'sec-fetch-site':  'same-site',
};

async function searchEncar({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  let conditions = [];

  if (brand) {
    const krBrand = translateBrandToKorean(brand);
    if (krBrand) conditions.push(`(Manufacturer.${krBrand})`);
  }

  if (model) {
    const krModel = translateModelToKorean(model);
    if (krModel) conditions.push(`(ModelGroup.${krModel})`);
  }

  if (yearMin > 0)    conditions.push(`(Year.${yearMin}~)`);
  if (yearMax < 9999) conditions.push(`(Year.~${yearMax})`);
  if (kmMax < 999999) conditions.push(`(Mileage.~${kmMax})`);
  if (budgetMax < 999999) conditions.push(`(Price.~${Math.round(budgetMax * 1450)})`);

  // Sans condition = toutes les voitures récentes
  const qParam = conditions.length > 0 ? conditions.join('AND') : '(Year.2015~)';

  const params = {
    count: true,
    q:     qParam,
    sr:    '|ModifiedDate|0|20',
    inav:  '|Metadata|Sort',
  };

  const response = await axios.get(BASE_URL, { params, headers: HEADERS, timeout: 12000 });
  const data = response.data;

  if (!data?.SearchResults) return [];

  let cars = data.SearchResults;

  // Filtre par mot-clé si fourni
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
  const priceKRW = (c.Price || 0) * 10000;
  const priceEUR = Math.round(priceKRW / 1450);

  return {
    id:         `encar-${c.Id}`,
    name:       `${c.Manufacturer || ''} ${c.ModelGroup || ''} ${c.BadgeName || ''}`.trim(),
    brand:      c.Manufacturer || '',
    model:      c.ModelGroup || '',
    year:       c.Year || 0,
    km:         c.Mileage || 0,
    price:      priceEUR,
    local:      `₩${priceKRW.toLocaleString('ko-KR')}`,
    grade:      GRADE_MAP[c.Condition] || 'B',
    source:     'encar',
    country:    'kr',
    type:       'occasion',
    volant:     'left',
    icon:       '🚗',
    trans:      c.GearBox || 'N/A',
    carbu:      c.FuelType || 'N/A',
    cv:         null,
    imageUrl:   c.Photo ? `https://ci.encar.com${c.Photo}` : null,
    listingUrl: `https://www.encar.com/dc/dc_cardetailview.do?carid=${c.Id}`,
  };
}

function translateBrandToKorean(brand) {
  const map = {
    'hyundai': '현대', 'kia': '기아', 'genesis': '제네시스',
    'ssangyong': '쌍용', 'chevrolet': '쉐보레', 'renault': '르노삼성',
    'samsung': '르노삼성', 'bmw': 'BMW', 'mercedes': '메르세데스-벤츠',
    'benz': '메르세데스-벤츠', 'audi': '아우디', 'volkswagen': '폭스바겐',
  };
  return map[brand.toLowerCase()] || null;
}

function translateModelToKorean(model) {
  const map = {
    'stinger': '스팅어', 'sonata': '쏘나타', 'elantra': '아반떼',
    'tucson': '투싼', 'santa fe': '싼타페', 'genesis': '제네시스',
    'k5': 'K5', 'k7': 'K7', 'k8': 'K8', 'k9': 'K9',
    'sportage': '스포티지', 'sorento': '쏘렌토',
    'grandeur': '그랜저', 'ioniq': '아이오닉',
  };
  return map[model.toLowerCase()] || null;
}

module.exports = { searchEncar };
