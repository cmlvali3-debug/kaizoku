// ============================================================
// OITAKU IMPORT — backend/src/server.js
// Express API server — aggregates JP & KR car sources
// Deploy on Railway: https://railway.app
// ============================================================

const express    = require('express');
const cors       = require('cors');
const cron       = require('node-cron');
const { Pool }   = require('pg');

const yahooRouter   = require('./routes/yahoo');
const encarRouter   = require('./routes/encar');
const beforwardRouter = require('./routes/beforward');
const scraperRouter = require('./routes/scraper');
const searchRouter  = require('./routes/search');
const alertRouter   = require('./routes/alerts');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── DATABASE ────────────────────────────────────────────────
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Export db so routes can use it
app.locals.db = db;

// ─── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── ROUTES ──────────────────────────────────────────────────
app.use('/api/search',    searchRouter);
app.use('/api/yahoo',     yahooRouter);
app.use('/api/encar',     encarRouter);
app.use('/api/beforward', beforwardRouter);
app.use('/api/scraper',   scraperRouter);
app.use('/api/alerts',    alertRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok', sources: 21 }));

// Status endpoint — tells frontend which API keys are configured server-side
app.get('/api/status', (_req, res) => {
  res.json({
    yahoo_jp:   !!process.env.YAHOO_JP_APP_ID,
    beforward:  !!process.env.BEFORWARD_API_KEY,
    goonet:     !!process.env.GOONET_API_TOKEN,
    encar:      true,   // no key required for public access
    sendgrid:   !!process.env.SENDGRID_API_KEY,
    database:   !!process.env.DATABASE_URL,
    version:    '1.2.0',
  });
});

// ─── CRON — refresh every 2 hours ────────────────────────────
cron.schedule('0 */2 * * *', async () => {
  console.log('[CRON] Refreshing car listings...');
  try {
    await require('./jobs/refreshListings')(app.locals.db);
    console.log('[CRON] Done.');
  } catch (err) {
    console.error('[CRON] Error:', err.message);
  }
});

// ─── START ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚗 Oitaku Import backend running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});

module.exports = app;
