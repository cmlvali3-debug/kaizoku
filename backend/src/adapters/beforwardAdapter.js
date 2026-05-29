// ============================================================
// OITAKU IMPORT — adapters/beforwardAdapter.js
// BE FORWARD — Partner API (requires approval)
// Request access: api@beforward.jp
// Set BEFORWARD_API_KEY in your .env once received
// ============================================================

const axios = require('axios');

const BASE_URL = 'https://www.beforward.jp/api/v1';
const API_KEY  = process.env.BEFORWARD_API_KEY;

async function searchBeForward({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999, volant = 'all' }) {
  if (!API_KEY) {
    console.warn('[BE FORWARD] BEFORWARD_API_KEY not set — skipping');
    return [];
  }

  const params = {
    api_key:     API_KEY,
    make:        brand || undefined,
    model:       model || undefined,
    year_min:    yearMin > 0 ? yearMin : undefined,
    year_max:    yearMax < 9999 ? yearMax : undefined,
    mileage_max: kmMax < 999999 ? kmMax : undefined,
    price_max:   budgetMax < 999999 ? budgetMax : undefined,
    steering:    volant === 'right' ? 'RHD' : volant === 'left' ? 'LHD' : undefined,
    limit:       20,
    format:      'json',
  };

  // Remove undefined keys
  Object.keys(params).forEach(k => params[k] === undefined && delete params[k]);

  const response = await axios.get(`${BASE_URL}/stock`, { params, timeout: 15000 });
  const vehicles = response.data?.vehicles || response.data?.data || [];

  return vehicles.map(v => normalizeBeForward(v));
}

function normalizeBeForward(v) {
  const priceUSD = parseFloat(v.price || v.Price || 0);
  const priceEUR = Math.round(priceUSD * 0.92);
  const priceJPY = Math.round(priceUSD * 155);

  return {
    id:      `beforward-${v.stock_id || v.id}`,
    name:    `${v.make || ''} ${v.model || ''} ${v.grade || ''}`.trim(),
    brand:   v.make || '',
    model:   v.model || '',
    year:    parseInt(v.year || 0),
    km:      parseInt(v.mileage || 0),
    price:   priceEUR,
    local:   `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:   v.auction_grade || 'B',
    source:  'beforward',
    country: 'jp',
    type:    'occasion',
    volant:  (v.steering || '').toUpperCase() === 'LHD' ? 'left' : 'right',
    icon:    '🚗',
    trans:   v.transmission || 'N/A',
    carbu:   v.fuel_type || 'N/A',
    cv:      null,
    imageUrl:   v.main_image || v.image_url || null,
    listingUrl: `https://www.beforward.jp/vehicle/${v.stock_id || v.id}`,
  };
}

module.exports = { searchBeForward };
