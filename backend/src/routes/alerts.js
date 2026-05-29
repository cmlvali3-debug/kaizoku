// ============================================================
// OITAKU IMPORT — routes/alerts.js
// Email alert system — save searches, notify on new matches
// ============================================================

const express = require('express');
const router  = express.Router();

// POST /api/alerts — create a new alert
router.post('/', async (req, res) => {
  const db = req.app.locals.db;
  const {
    email,
    query      = '',
    brand      = '',
    model      = '',
    yearMin    = 0,
    yearMax    = 9999,
    kmMax      = 999999,
    budgetMax  = 999999,
    volant     = 'all',
    sources    = [],
  } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  // At least one filter required
  if (!query && !brand && !model && budgetMax >= 999999) {
    return res.status(400).json({ error: 'Veuillez préciser au moins un critère de recherche' });
  }

  try {
    const result = await db.query(`
      INSERT INTO alerts (email, query, brand, model, year_min, year_max, km_max, budget_max, volant, sources, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
      RETURNING id
    `, [email, query, brand, model, yearMin, yearMax, kmMax, budgetMax, volant, sources]);

    res.json({ success: true, alertId: result.rows[0].id });
  } catch (err) {
    console.error('[alerts] DB error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/alerts — list alerts (by email param for now, no auth)
router.get('/', async (req, res) => {
  const db = req.app.locals.db;
  const { email } = req.query;

  if (!email) return res.json({ alerts: [] });

  try {
    const result = await db.query(
      'SELECT * FROM alerts WHERE email = $1 AND active = true ORDER BY created_at DESC',
      [email]
    );
    res.json({ alerts: result.rows });
  } catch (err) {
    console.error('[alerts] DB error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/alerts/:id — deactivate an alert
router.delete('/:id', async (req, res) => {
  const db = req.app.locals.db;
  const { id } = req.params;
  const { email } = req.body;

  try {
    await db.query(
      'UPDATE alerts SET active = false WHERE id = $1 AND email = $2',
      [id, email]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[alerts] DB error:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
