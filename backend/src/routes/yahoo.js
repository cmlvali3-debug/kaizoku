// ============================================================
// OITAKU IMPORT — routes/yahoo.js
// Direct Yahoo JP search route (proxied through backend)
// ============================================================
const express = require('express');
const router  = express.Router();
const { searchYahooJP } = require('../adapters/yahooAdapter');

router.get('/', async (req, res) => {
  try {
    const results = await searchYahooJP(req.query);
    res.json({ results, count: results.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
