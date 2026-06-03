// ============================================================
// OITAKU IMPORT — routes/search.js
// Aggregates results from all active sources
// ============================================================

const express = require('express');
const router  = express.Router();

const { searchYahooJP }   = require('../adapters/yahooAdapter');
const { searchEncar }     = require('../adapters/encarAdapter');
const { searchBeForward } = require('../adapters/beforwardAdapter');
const { searchKCar }      = require('../adapters/kcarAdapter');
const { searchGooNet }    = require('../adapters/goonetAdapter');
const { searchSBT }       = require('../adapters/sbtAdapter');
const { searchCarSensor } = require('../adapters/carsensorAdapter');
const { searchAutobell }  = require('../adapters/autobellAdapter');

// Map source IDs to their adapter functions
const SOURCE_ADAPTERS = {
  'yahoo-jp':   searchYahooJP,
  'encar':      searchEncar,
  'beforward':  searchBeForward,
  'kcar':       searchKCar,
  'goo-net':    searchGooNet,
  'sbt':        searchSBT,
  'carsensor':  searchCarSensor,
  'autobell':   searchAutobell,
};

// GET /api/search
router.get('/', async (req, res) => {
  const {
    q         = '',
    brand     = '',
    model     = '',
    yearMin   = 0,
    yearMax   = 9999,
    kmMax     = 999999,
    budgetMax = 999999,
    volant    = 'all',   // 'all' | 'right' | 'left'
    sources   = '',      // comma-separated list of source IDs
  } = req.query;

  // API keys can be forwarded from frontend admin panel via headers
  const yahooAppId  = req.headers['x-yahoo-app-id']  || '';
  const goonetToken = req.headers['x-goonet-token']  || '';
  const encarKey    = req.headers['x-encar-key']      || '';

  const requestedSources = sources ? sources.split(',') : Object.keys(SOURCE_ADAPTERS);
  const db = req.app.locals.db;

  // Try DB cache first (results stored by cron job)
  try {
    const cached = await getCachedResults(db, {
      q, brand, model,
      yearMin: parseInt(yearMin),
      yearMax: parseInt(yearMax),
      kmMax:   parseInt(kmMax),
      budgetMax: parseInt(budgetMax),
      volant,
      sources: requestedSources,
    });

    if (cached.length > 0) {
      return res.json({ results: cached, source: 'cache', count: cached.length });
    }
  } catch (dbErr) {
    console.warn('[search] DB not available, querying live:', dbErr.message);
  }

  // Live fetch from all requested sources in parallel
  const promises = requestedSources
    .filter(id => SOURCE_ADAPTERS[id])
    .map(id => SOURCE_ADAPTERS[id]({
      q, brand, model,
      yearMin: parseInt(yearMin),
      yearMax: parseInt(yearMax),
      kmMax:   parseInt(kmMax),
      budgetMax: parseInt(budgetMax),
      volant,
      yahooAppId,
      goonetToken,
      encarKey,
    }).catch(err => {
      console.error(`[search] ${id} error:`, err.message);
      return []; // Don't fail the whole request if one source fails
    }));

  const resultsArrays = await Promise.allSettled(promises);
  let results = resultsArrays
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);

  // Deduplicate by name+year+km
  const seen = new Set();
  results = results.filter(car => {
    const key = `${car.name}-${car.year}-${car.km}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by price ascending by default
  results.sort((a, b) => a.price - b.price);

  res.json({ results, source: 'live', count: results.length });
});

// ─── DB CACHE QUERY ──────────────────────────────────────────
async function getCachedResults(db, filters) {
  const query = `
    SELECT * FROM listings
    WHERE
      ($1 = '' OR name ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1)
      AND ($2 = '' OR brand ILIKE $2)
      AND ($3 = '' OR model ILIKE $3)
      AND year  >= $4 AND year  <= $5
      AND km    <= $6
      AND price <= $7
      AND ($8 = 'all' OR volant = $8)
      AND source = ANY($9)
      AND fetched_at > NOW() - INTERVAL '2 hours'
    ORDER BY price ASC
    LIMIT 100
  `;
  const vals = [
    filters.q ? `%${filters.q}%` : '',
    filters.brand ? `%${filters.brand}%` : '',
    filters.model ? `%${filters.model}%` : '',
    filters.yearMin,
    filters.yearMax,
    filters.kmMax,
    filters.budgetMax,
    filters.volant,
    filters.sources,
  ];
  const { rows } = await db.query(query, vals);
  return rows;
}

module.exports = router;
