// ============================================================
// OITAKU IMPORT — adapters/yahooAdapter.js
// Yahoo! Auctions Japan — Official API
// Requires: YAHOO_JP_APP_ID in .env
// Get your key at: https://developer.yahoo.co.jp
// ============================================================

const axios = require('axios');

const YAHOO_API  = 'https://auctions.yahooapis.jp/AuctionWebService/V2/json/search';
const APP_ID     = process.env.YAHOO_JP_APP_ID;

async function searchYahooJP({ q = '', brand = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999 }) {
  if (!APP_ID) {
    console.warn('[Yahoo JP] YAHOO_JP_APP_ID not set — skipping');
    return [];
  }

  // Build search query
  const keyword = [brand, q].filter(Boolean).join(' ') || '車 輸出';

  const params = {
    appid:   APP_ID,
    query:   keyword,
    category: '26308', // Yahoo Auctions: car category
    sort:    '-bids',
    order:   'd',
    hits:    20,
    output:  'json',
  };

  if (budgetMax < 999999) {
    params.price_to = Math.round(budgetMax * 160); // EUR → JPY approx
  }

  const response = await axios.get(YAHOO_API, { params, timeout: 10000 });
  const items = response.data?.ResultSet?.Result?.Item || [];

  if (!Array.isArray(items)) return [];

  return items.map(item => normalizeYahoo(item));
}

function normalizeYahoo(item) {
  const priceJPY = parseInt(item.CurrentPrice || 0);
  const priceEUR = Math.round(priceJPY / 160);

  // Try to extract year from title
  const yearMatch = (item.Title || '').match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;

  return {
    id:      `yahoo-${item.AuctionID}`,
    name:    item.Title || 'Véhicule Yahoo Auctions JP',
    brand:   extractBrand(item.Title),
    model:   '',
    year:    year || 0,
    km:      0, // KM not always in Yahoo listing title
    price:   priceEUR,
    local:   `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade:   'N/A',
    source:  'yahoo-jp',
    country: 'jp',
    type:    'auction',
    volant:  'right', // Japanese domestic cars are RHD
    icon:    '🏎️',
    trans:   'N/A',
    carbu:   'N/A',
    cv:      null,
    imageUrl:   item.Image?.Medium || null,
    listingUrl: item.AuctionItemUrl || null,
    endsAt:     item.EndTime || null,
    bids:       parseInt(item.Bids || 0),
  };
}

const JP_BRANDS = ['Nissan','Toyota','Honda','Mazda','Subaru','Mitsubishi','Lexus','Infiniti','Suzuki','Daihatsu'];

function extractBrand(title = '') {
  const titleLower = title.toLowerCase();
  return JP_BRANDS.find(b => titleLower.includes(b.toLowerCase())) || '';
}

module.exports = { searchYahooJP };
