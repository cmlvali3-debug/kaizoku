// ============================================================
// OITAKU IMPORT — jobs/refreshListings.js
// Cron job: fetches all sources, saves to Postgres, fires alerts
// Runs every 2 hours via server.js
// ============================================================

const { searchEncar }     = require('../adapters/encarAdapter');
const { searchYahooJP }   = require('../adapters/yahooAdapter');
const { searchBeForward } = require('../adapters/beforwardAdapter');
const { searchKCar }      = require('../adapters/kcarAdapter');
const { searchGooNet }    = require('../adapters/goonetAdapter');
const { searchSBT }       = require('../adapters/sbtAdapter');
const { searchCarSensor } = require('../adapters/carsensorAdapter');
const { searchAutobell }  = require('../adapters/autobellAdapter');
const { sendAlertEmail }  = require('../services/emailService');

// Default queries to run on each refresh
const DEFAULT_QUERIES = [
  { q: 'GT-R',         brand: 'Nissan'      },
  { q: 'Supra',        brand: 'Toyota'      },
  { q: 'NSX',          brand: 'Honda'       },
  { q: 'RX-7',         brand: 'Mazda'       },
  { q: 'Lancer Evo',   brand: 'Mitsubishi'  },
  { q: 'Impreza WRX',  brand: 'Subaru'      },
  { q: 'Stinger',      brand: 'Kia'         },
  { q: 'Genesis',      brand: 'Hyundai'     },
  { q: 'i30N',         brand: 'Hyundai'     },
  { q: '',             brand: ''            }, // General batch
];

const ALL_ADAPTERS = [
  { id: 'encar',      fn: searchEncar      },
  { id: 'yahoo-jp',   fn: searchYahooJP    },
  { id: 'beforward',  fn: searchBeForward  },
  { id: 'kcar',       fn: searchKCar       },
  { id: 'goo-net',    fn: searchGooNet     },
  { id: 'sbt',        fn: searchSBT        },
  { id: 'carsensor',  fn: searchCarSensor  },
  { id: 'autobell',   fn: searchAutobell   },
];

module.exports = async function refreshListings(db) {
  let totalSaved = 0;

  for (const query of DEFAULT_QUERIES) {
    try {
      const results = await Promise.allSettled(
        ALL_ADAPTERS.map(a => a.fn(query))
      );

      const all = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);

      for (const car of all) {
        await upsertListing(db, car);
        totalSaved++;
      }

    } catch (err) {
      console.error(`[refresh] Error on query "${query.q}":`, err.message);
    }
  }

  console.log(`[refresh] Saved/updated ${totalSaved} listings`);

  // Fire email alerts for matching new listings
  await processAlerts(db);

  return totalSaved;
};

async function processAlerts(db) {
  let activeAlerts;
  try {
    const result = await db.query(
      "SELECT * FROM alerts WHERE active = true AND (last_sent IS NULL OR last_sent < NOW() - INTERVAL '2 hours')"
    );
    activeAlerts = result.rows;
  } catch (err) {
    console.error('[alerts] Could not load alerts:', err.message);
    return;
  }

  for (const alert of activeAlerts) {
    try {
      // Find listings that match this alert, fetched in the last 2h and newer than last_sent
      const sinceTs = alert.last_sent || new Date(Date.now() - 2 * 60 * 60 * 1000);

      const matchQuery = `
        SELECT * FROM listings
        WHERE
          ($1 = '' OR name ILIKE $1 OR brand ILIKE $1 OR model ILIKE $1)
          AND ($2 = '' OR brand ILIKE $2)
          AND ($3 = '' OR model ILIKE $3)
          AND year  >= $4 AND year  <= $5
          AND km    <= $6
          AND price <= $7
          AND ($8 = 'all' OR volant = $8)
          AND ($9::text[] IS NULL OR array_length($9::text[], 1) = 0 OR source = ANY($9::text[]))
          AND fetched_at > $10
        ORDER BY price ASC
        LIMIT 20
      `;

      const vals = [
        alert.query ? `%${alert.query}%` : '',
        alert.brand ? `%${alert.brand}%` : '',
        alert.model ? `%${alert.model}%` : '',
        alert.year_min  || 0,
        alert.year_max  || 9999,
        alert.km_max    || 999999,
        alert.budget_max || 999999,
        alert.volant    || 'all',
        alert.sources && alert.sources.length > 0 ? alert.sources : null,
        sinceTs,
      ];

      const { rows: newCars } = await db.query(matchQuery, vals);

      if (newCars.length > 0) {
        const sent = await sendAlertEmail(alert.email, alert, newCars);
        if (sent) {
          await db.query('UPDATE alerts SET last_sent = NOW() WHERE id = $1', [alert.id]);
        }
      }
    } catch (err) {
      console.error(`[alerts] Error processing alert ${alert.id}:`, err.message);
    }
  }
}

async function upsertListing(db, car) {
  const query = `
    INSERT INTO listings (
      external_id, name, brand, model, year, km, price, local_price,
      grade, source, country, type, volant, trans, carbu, cv,
      image_url, listing_url, fetched_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
    ON CONFLICT (external_id) DO UPDATE SET
      price      = EXCLUDED.price,
      km         = EXCLUDED.km,
      fetched_at = NOW()
  `;
  const vals = [
    String(car.id),
    car.name, car.brand, car.model,
    car.year, car.km, car.price, car.local,
    car.grade, car.source, car.country, car.type, car.volant,
    car.trans, car.carbu, car.cv,
    car.imageUrl, car.listingUrl,
  ];
  await db.query(query, vals);
}
