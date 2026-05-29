// routes/encar.js
const express = require('express');
const router  = express.Router();
const { searchEncar } = require('../adapters/encarAdapter');
router.get('/', async (req, res) => {
  try { res.json({ results: await searchEncar(req.query) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
