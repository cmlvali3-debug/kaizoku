// routes/scraper.js
const express = require('express');
const router  = express.Router();
const { searchKCar } = require('../adapters/kcarAdapter');
router.get('/kcar', async (req, res) => {
  try { res.json({ results: await searchKCar(req.query) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
