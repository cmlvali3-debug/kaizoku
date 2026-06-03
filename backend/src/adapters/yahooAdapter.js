// ============================================================
// OITAKU IMPORT — adapters/yahooAdapter.js
// Yahoo! Auctions Japan — Official REST API v2
// Clé gratuite : https://developer.yahoo.co.jp
// ============================================================

const axios = require('axios');

const YAHOO_API = 'https://auctions.yahooapis.jp/AuctionWebService/V2/json/search';
const APP_ID    = process.env.YAHOO_JP_APP_ID;

// Taux de change JPY → EUR (approximatif, met à jour via env si besoin)
const JPY_EUR = parseFloat(process.env.JPY_EUR_RATE || '160');

// Mots-clés japonais pour les marques principales
const BRAND_JP = {
  nissan:    'ニッサン OR スカイライン OR GT-R',
  toyota:    'トヨタ OR スープラ OR ランクル',
  honda:     'ホンダ OR NSX OR S2000',
  mazda:     'マツダ OR RX-7 OR ロードスター',
  mitsubishi:'三菱 OR ランエボ OR ランサー',
  subaru:    'スバル OR インプレッサ OR WRX',
  lexus:     'レクサス OR LFA',
  infiniti:  'インフィニティ',
};

// Mots-clés pour modèles populaires
const MODEL_JP = {
  'skyline gt-r': 'スカイライン GT-R',
  'gt-r r35':     'GT-R R35 ニスモ',
  'supra':        'スープラ',
  'nsx':          'NSX',
  'rx-7':         'RX-7',
  'rx-8':         'RX-8',
  's2000':        'S2000',
  'silvia':       'シルビア',
  'lancer evo':   'ランサーエボリューション',
  'impreza':      'インプレッサ WRX STI',
  'mx-5':         'ロードスター',
  'lfa':          'LFA レクサス',
  'land cruiser': 'ランドクルーザー',
};

async function searchYahooJP({ q = '', brand = '', model = '', yearMin = 0, yearMax = 9999, kmMax = 999999, budgetMax = 999999 }) {
  if (!APP_ID) {
    console.warn('[Yahoo JP] YAHOO_JP_APP_ID non défini — source ignorée');
    return [];
  }

  // Construction du mot-clé de recherche
  let keyword = buildKeyword(q, brand, model);

  const params = {
    appid:  APP_ID,
    query:  keyword,
    hits:   20,
    output: 'json',
    sort:   'endtime',   // tri par fin d'enchère (les plus urgentes d'abord)
    order:  'a',
  };

  // Filtre budget (EUR → JPY)
  if (budgetMax > 0 && budgetMax < 999999) {
    params.price_to = Math.round(budgetMax * JPY_EUR);
  }

  try {
    const response = await axios.get(YAHOO_API, {
      params,
      timeout: 10000,
      headers: {
        'User-Agent': 'OitakuImport/1.0 (JDM car search; contact@oitakuimport.fr)',
      },
    });

    const result = response.data?.ResultSet?.Result;
    if (!result) return [];

    // L'API peut retourner un objet unique ou un tableau
    const items = Array.isArray(result.Item)
      ? result.Item
      : result.Item ? [result.Item] : [];

    let cars = items.map((item, i) => normalizeYahoo(item, i));

    // Filtres post-récupération
    if (yearMin > 0)    cars = cars.filter(c => !c.year || c.year >= yearMin);
    if (yearMax < 9999) cars = cars.filter(c => !c.year || c.year <= yearMax);
    if (kmMax < 999999) cars = cars.filter(c => !c.km   || c.km   <= kmMax);

    return cars.filter(c => c.price > 0);

  } catch (err) {
    if (err.response?.status === 400) {
      console.error('[Yahoo JP] Erreur 400 — APP_ID invalide ou paramètres incorrects');
    } else if (err.response?.status === 403) {
      console.error('[Yahoo JP] Erreur 403 — APP_ID expiré ou dépassement de quota');
    } else {
      console.error('[Yahoo JP] Erreur:', err.message);
    }
    return [];
  }
}

function buildKeyword(q, brand, model) {
  // Priorité : modèle traduit > marque traduite > mot-clé brut > défaut JDM
  const modelLower = model.toLowerCase();
  const brandLower = brand.toLowerCase();

  if (model && MODEL_JP[modelLower]) return MODEL_JP[modelLower];
  if (brand && BRAND_JP[brandLower]) return BRAND_JP[brandLower];
  if (q) return q;
  // Défaut : recherche générique export JDM
  return '輸出 スポーツカー JDM';
}

function normalizeYahoo(item, index) {
  const priceJPY = parseInt(item.CurrentPrice || item.Price || 0);
  const priceEUR = Math.round(priceJPY / JPY_EUR);
  const title    = item.Title || '';

  // Extraction année depuis le titre (ex: "2001年式", "H13", "2001")
  const yearMatch = title.match(/\b(19[89]\d|20[012]\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : 0;

  // Extraction km depuis le titre (ex: "走行 45,000km", "45000km")
  const kmMatch = title.match(/(?:走行|mileage)?[\s：:]*(\d[\d,]+)\s*km/i);
  const km = kmMatch ? parseInt(kmMatch[1].replace(/,/g, '')) : 0;

  // Extraction grade JCI/inspection (ex: "車検2年", "R指定")
  const gradeMatch = title.match(/([A-Z][+-]?|\d点)/);
  const grade = gradeMatch ? gradeMatch[0] : 'N/A';

  // Détection transmission
  const trans = /マニュアル|MT/.test(title) ? 'Manuelle'
    : /オートマ|AT|CVT/.test(title) ? 'Automatique' : 'N/A';

  // Détection carburant
  const carbu = /ディーゼル|diesel/i.test(title) ? 'Diesel'
    : /ハイブリッド|hybrid/i.test(title) ? 'Hybride'
    : /電気|EV|electric/i.test(title) ? 'Électrique' : 'Essence';

  return {
    id:         `yahoo-${item.AuctionID || Date.now()}-${index}`,
    name:       title.substring(0, 80),
    brand:      extractBrand(title),
    model:      extractModel(title),
    year,
    km,
    price:      priceEUR,
    local:      `¥${priceJPY.toLocaleString('ja-JP')}`,
    grade,
    source:     'yahoo-jp',
    country:    'jp',
    type:       'auction',
    volant:     'right',
    icon:       '🏎️',
    trans,
    carbu,
    cv:         null,
    imageUrl:   item.Image?.Medium || item.Image?.Small || null,
    listingUrl: item.AuctionItemUrl || `https://page.auctions.yahoo.co.jp/jp/auction/${item.AuctionID}`,
    endsAt:     item.EndTime || null,
    bids:       parseInt(item.Bids || 0),
  };
}

const JP_BRANDS = [
  ['Nissan',     ['nissan','ニッサン','日産']],
  ['Toyota',     ['toyota','トヨタ','豊田']],
  ['Honda',      ['honda','ホンダ','本田']],
  ['Mazda',      ['mazda','マツダ','松田']],
  ['Subaru',     ['subaru','スバル','富士重工']],
  ['Mitsubishi', ['mitsubishi','三菱']],
  ['Lexus',      ['lexus','レクサス']],
  ['Infiniti',   ['infiniti','インフィニティ']],
  ['Suzuki',     ['suzuki','スズキ']],
  ['Daihatsu',   ['daihatsu','ダイハツ']],
  ['Isuzu',      ['isuzu','いすゞ']],
];

const JP_MODELS = [
  ['GT-R R35',      ['GT-R R35', 'R35']],
  ['Skyline GT-R',  ['スカイライン GT-R', 'R34', 'R33', 'R32', 'BNR34', 'BCNR33']],
  ['Supra',         ['スープラ', 'JZA80', 'GR Supra']],
  ['NSX',           ['NSX', 'NA1', 'NA2', 'NC1']],
  ['RX-7',          ['RX-7', 'FD3S', 'FC3S']],
  ['RX-8',          ['RX-8', 'SE3P']],
  ['S2000',         ['S2000', 'AP1', 'AP2']],
  ['Silvia',        ['シルビア', 'S15', 'S14', 'S13']],
  ['Lancer Evo',    ['ランサーエボ', 'ランエボ', 'CZ4A', 'CT9A']],
  ['Impreza WRX STI',['インプレッサ', 'WRX STI', 'GDB', 'GRB']],
  ['MX-5',          ['ロードスター', 'NC', 'ND', 'NA6', 'NB8']],
  ['Land Cruiser',  ['ランドクルーザー', 'FJ', '200系', '100系']],
  ['Chaser',        ['チェイサー', 'JZX100']],
  ['Soarer',        ['ソアラ', 'UZZ40']],
  ['Fairlady Z',    ['フェアレディZ', 'Z34', 'RZ34']],
  ['LFA',           ['LFA', 'レクサス LFA']],
];

function extractBrand(title = '') {
  const t = title.toLowerCase();
  for (const [brand, kws] of JP_BRANDS) {
    if (kws.some(kw => t.includes(kw.toLowerCase()))) return brand;
  }
  return '';
}

function extractModel(title = '') {
  for (const [model, kws] of JP_MODELS) {
    if (kws.some(kw => title.includes(kw))) return model;
  }
  return '';
}

module.exports = { searchYahooJP };
