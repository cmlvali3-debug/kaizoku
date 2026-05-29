// routes/beforward.js
const express = require('express');
const router  = express.Router();
const { searchBeForward } = require('../adapters/beforwardAdapter');
router.get('/', async (req, res) => {
  try { res.json({ results: await searchBeForward(req.query) }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
