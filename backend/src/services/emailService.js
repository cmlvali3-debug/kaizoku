// ============================================================
// OITAKU IMPORT — services/emailService.js
// SendGrid email notifications for car alerts
// Set SENDGRID_API_KEY in .env to enable
// ============================================================

const axios = require('axios');

const SENDGRID_URL = 'https://api.sendgrid.com/v3/mail/send';
const API_KEY      = process.env.SENDGRID_API_KEY;
const FROM_EMAIL   = process.env.ALERT_FROM_EMAIL || 'alerts@oitakuimport.fr';
const FROM_NAME    = 'Oitaku Import';

async function sendAlertEmail(toEmail, alert, newCars) {
  if (!API_KEY) {
    console.warn('[Email] SENDGRID_API_KEY not set — alert email skipped');
    return false;
  }

  const subject = `🚗 ${newCars.length} nouveau(x) véhicule(s) correspondent à votre alerte`;
  const html = buildAlertHtml(alert, newCars);
  const text = buildAlertText(alert, newCars);

  const body = {
    personalizations: [{ to: [{ email: toEmail }] }],
    from: { email: FROM_EMAIL, name: FROM_NAME },
    subject,
    content: [
      { type: 'text/plain', value: text },
      { type: 'text/html',  value: html },
    ],
  };

  try {
    await axios.post(SENDGRID_URL, body, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    console.log(`[Email] Alert sent to ${toEmail} — ${newCars.length} cars`);
    return true;
  } catch (err) {
    console.error('[Email] SendGrid error:', err.response?.data || err.message);
    return false;
  }
}

function buildAlertHtml(alert, cars) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
  const filterDesc = [
    alert.brand && `Marque: <strong>${alert.brand}</strong>`,
    alert.model && `Modèle: <strong>${alert.model}</strong>`,
    alert.query && `Recherche: <strong>${alert.query}</strong>`,
    alert.year_min && `À partir de: <strong>${alert.year_min}</strong>`,
    alert.budget_max && `Budget max: <strong>${alert.budget_max.toLocaleString('fr-FR')} €</strong>`,
  ].filter(Boolean).join(' | ');

  const carCards = cars.slice(0, 10).map(c => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #eee">
        ${c.image_url ? `<img src="${c.image_url}" style="width:80px;height:60px;object-fit:cover;border-radius:4px" alt="">` : ''}
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee">
        <strong>${c.name}</strong><br>
        <span style="color:#666;font-size:13px">${c.year || 'N/A'} • ${c.km ? c.km.toLocaleString() + ' km' : 'N/A'} • ${c.source?.toUpperCase()}</span>
      </td>
      <td style="padding:12px;border-bottom:1px solid #eee;text-align:right">
        <strong style="font-size:18px;color:#e85d04">${c.price ? c.price.toLocaleString('fr-FR') + ' €' : 'N/A'}</strong><br>
        ${c.listing_url ? `<a href="${c.listing_url}" style="color:#0066cc;font-size:13px">Voir l'annonce →</a>` : ''}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1a1a2e;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
    <h1 style="margin:0;font-size:24px">🚗 Oitaku Import</h1>
    <p style="margin:8px 0 0;opacity:0.8">Alerte véhicule — ${cars.length} nouveau(x) résultat(s)</p>
  </div>
  <div style="background:#f9f9f9;padding:16px;border:1px solid #ddd;border-top:0">
    <p style="margin:0;font-size:13px;color:#666">Filtres : ${filterDesc || 'Tous véhicules'}</p>
  </div>
  <table style="width:100%;border-collapse:collapse;margin-top:0;border:1px solid #ddd;border-top:0">
    ${carCards}
  </table>
  <div style="text-align:center;padding:20px;color:#999;font-size:12px">
    <a href="${frontendUrl}">Ouvrir Oitaku Import</a> •
    Vous recevez cet email car vous avez créé une alerte.
    <br>Pour vous désabonner, contactez alerts@oitakuimport.fr
  </div>
</body>
</html>`;
}

function buildAlertText(alert, cars) {
  const lines = [
    `Oitaku Import — ${cars.length} nouveau(x) véhicule(s)`,
    '',
    ...cars.slice(0, 10).map(c =>
      `• ${c.name} — ${c.year || 'N/A'} — ${c.km ? c.km.toLocaleString() + ' km' : 'N/A'} — ${c.price ? c.price.toLocaleString('fr-FR') + ' €' : 'N/A'} — ${c.listing_url || ''}`
    ),
  ];
  return lines.join('\n');
}

module.exports = { sendAlertEmail };
