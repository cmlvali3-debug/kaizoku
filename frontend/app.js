// ============================================================
// OITAKU IMPORT — app.js  v1.2.0
// ============================================================

const BACKEND_URL = 'https://oitaku-backend-production.up.railway.app';

// ─── SOURCES ────────────────────────────────────────────────

const SOURCES = {
  jp: [
    {id:'uss',         label:'USS Auction',       type:'auction', url:'uss.ne.jp'},
    {id:'taa',         label:'TAA Auction',        type:'auction', url:'taa.ne.jp'},
    {id:'caa',         label:'CAA Auction',        type:'auction', url:'caa-auction.jp'},
    {id:'ju',          label:'JU Auction',         type:'auction', url:'ju-net.or.jp'},
    {id:'haa',         label:'HAA Kobe',           type:'auction', url:'haakobe.jp'},
    {id:'yahoo-jp',    label:'Yahoo! Auctions JP', type:'auction', url:'auctions.yahoo.co.jp'},
    {id:'goo-net',     label:'Goo-net Exchange',   type:'occasion',url:'goo-net-exchange.com'},
    {id:'sbt',         label:'SBT Japan',          type:'occasion',url:'sbtjapan.com'},
    {id:'beforward',   label:'BE FORWARD',         type:'occasion',url:'beforward.jp'},
    {id:'carsensor',   label:'CarSensor',          type:'occasion',url:'carsensor.net'},
    {id:'carused',     label:'Carused.jp',         type:'occasion',url:'carused.jp'},
    {id:'cardealpage', label:'CardealPage',        type:'occasion',url:'cardealpage.com'},
    {id:'carfromjapan',label:'CarFromJapan',       type:'occasion',url:'carfromjapan.com'},
  ],
  kr: [
    {id:'encar',    label:'Encar',                    type:'occasion',url:'encar.com'},
    {id:'kcar',     label:'K Car',                    type:'occasion',url:'kcar.com'},
    {id:'autobell', label:'Autobell (Hyundai Glovis)',type:'auction', url:'autobellglobal.com'},
    {id:'lotte',    label:'Lotte Auto Auction',       type:'auction', url:'lotteautoauction.com'},
    {id:'heydealer',label:'Heydealer',                type:'auction', url:'heydealer.com'},
    {id:'ajsellcar',label:'AJ Sellcar',               type:'auction', url:'ajsellcar.com'},
    {id:'autowini', label:'Autowini',                 type:'occasion',url:'autowini.com'},
    {id:'skEncar',  label:'SK Encar',                 type:'occasion',url:'encar.com'},
  ]
};

const MODELS_BY_BRAND = {
  'Nissan':    ['GT-R R35','Skyline GT-R','GT-R R34','GT-R R33','GT-R R32','Silvia','350Z','Fairlady Z','Stagea'],
  'Toyota':    ['Supra','Supra GR','Chaser','Land Cruiser','Soarer','Celica','MR2','Altezza','AE86','Hilux','Prado'],
  'Honda':     ['NSX','NSX Type R','Integra Type R','Civic Type R','S2000','Prelude','CR-V'],
  'Mazda':     ['RX-7','RX-8','MX-5','Atenza','CX-5','Roadster'],
  'Mitsubishi':['Lancer Evo','Lancer Evo X','3000GT','Pajero','GTO','FTO'],
  'Subaru':    ['Impreza WRX STI','BRZ','Legacy B4','Forester','Levorg','Outback'],
  'Lexus':     ['LFA','IS F','RC F','LC 500','IS','GS'],
  'Suzuki':    ['Jimny'],
  'Infiniti':  ['G35','G37','Q50','Q60'],
  'Hyundai':   ['i30N','i20N','Ioniq 5 N','Ioniq 5','Ioniq 6','Elantra N','Veloster N','Genesis Coupe','Grandeur','Tucson','Santa Fe','Palisade','Kona Electric'],
  'Kia':       ['Stinger GT','EV6 GT','EV6','ProCeed GT','Ceed GT','Sportage','Sorento','Niro EV','K8 Hybrid'],
  'Genesis':   ['G70','G80','G90','GV60','GV70','GV80','GV80 Coupe','G80 Electrified'],
  'SsangYong': ['Musso','Rexton','Rexton Sports','Korando'],
};

// ─── STATE ──────────────────────────────────────────────────

let currentResults = [];
let favorites      = new Set(JSON.parse(localStorage.getItem('oitaku_favs') || '[]'));
let savedCars      = JSON.parse(localStorage.getItem('oitaku_cars') || '[]');
let activeSources  = new Set(Object.values(SOURCES).flat().map(s => s.id));
let srcTab         = 'jp';
let volantFilter   = 'all';

// ─── HELPERS ────────────────────────────────────────────────

function getSrcLabel(id) { return [...SOURCES.jp,...SOURCES.kr].find(s=>s.id===id)?.label || id; }
function getSrcUrl(id)   { return [...SOURCES.jp,...SOURCES.kr].find(s=>s.id===id)?.url   || ''; }
function saveFavs()      { localStorage.setItem('oitaku_favs', JSON.stringify([...favorites])); }
function saveCars()      { localStorage.setItem('oitaku_cars', JSON.stringify(savedCars)); }

// ─── NAV ────────────────────────────────────────────────────

function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
  document.getElementById('page-'+p)?.classList.add('active');
  document.getElementById('nav-'+p)?.classList.add('active');
  if (p === 'favs')    renderFavs();
  if (p === 'sources') renderSourceDetail();
  if (p === 'admin')   initAdmin();
}

// ─── SOURCES ────────────────────────────────────────────────

function renderSourcesGrid() {
  const g = document.getElementById('sourcesGrid');
  g.innerHTML = SOURCES[srcTab].map(s => `
    <div class="source-tag ${srcTab} type-${s.type} ${activeSources.has(s.id)?'':'off'}"
         onclick="toggleSource(this,'${s.id}')">${s.label}</div>
  `).join('');
}

function renderSourceDetail() {
  const all = [...SOURCES.jp,...SOURCES.kr].filter(s => activeSources.has(s.id));
  document.getElementById('sourceDetailList').innerHTML = all.map(s => `
    <div class="source-detail-item">
      <div>
        <h4>${s.label}</h4>
        <p>${s.url} · ${s.type === 'auction' ? 'Enchères' : 'Occasion'}</p>
      </div>
      <span style="font-size:9px;font-family:var(--font-mono);padding:2px 8px;border-radius:4px;
        background:${s.type==='auction'?'rgba(240,165,0,0.15)':'rgba(0,184,148,0.15)'};
        color:${s.type==='auction'?'#F0A500':'#00B894'};">
        ${SOURCES.jp.find(x=>x.id===s.id) ? '🇯🇵 JP' : '🇰🇷 KR'}
      </span>
    </div>
  `).join('');
}

function switchSrcTab(tab, el) {
  srcTab = tab;
  document.querySelectorAll('.src-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderSourcesGrid();
}

function toggleSource(el, id) {
  activeSources.has(id) ? activeSources.delete(id) : activeSources.add(id);
  el.classList.toggle('off');
  renderSourceDetail();
}

function selectAll()  { Object.values(SOURCES).flat().forEach(s=>activeSources.add(s.id));     renderSourcesGrid(); renderSourceDetail(); }
function selectNone() { activeSources.clear();                                                   renderSourcesGrid(); renderSourceDetail(); }
function selectJP()   { activeSources.clear(); SOURCES.jp.forEach(s=>activeSources.add(s.id)); renderSourcesGrid(); renderSourceDetail(); }
function selectKR()   { activeSources.clear(); SOURCES.kr.forEach(s=>activeSources.add(s.id)); renderSourcesGrid(); renderSourceDetail(); }

// ─── FILTERS ────────────────────────────────────────────────

function setVolant(v) {
  volantFilter = v;
  ['volAll','volR','volL'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById(v==='all'?'volAll':v==='right'?'volR':'volL').classList.add('active');
}

function updateModelFilter() {
  const b = document.getElementById('brandFilter').value;
  const sel = document.getElementById('modelFilter');
  sel.innerHTML = '<option value="">Tous</option>';
  if (b && MODELS_BY_BRAND[b]) {
    MODELS_BY_BRAND[b].forEach(m => { sel.innerHTML += `<option>${m}</option>`; });
  }
}

// ─── SEARCH ─────────────────────────────────────────────────

async function runSearch() {
  const query     = document.getElementById('queryInput').value.trim();
  const brand     = document.getElementById('brandFilter').value;
  const model     = document.getElementById('modelFilter').value;
  const yearMin   = document.getElementById('yearFilter').value;
  const yearMax   = document.getElementById('yearMaxFilter').value;
  const kmMax     = document.getElementById('kmFilter').value;
  const budgetMax = document.getElementById('budgetFilter').value;

  document.getElementById('resultsList').innerHTML = '';
  document.getElementById('resultsHeader').style.display = 'none';
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('alertBanner').style.display = 'none';

  const ls = document.getElementById('loadingState');
  ls.style.display = 'flex';

  const srcNames = [...activeSources].map(id => getSrcLabel(id));
  let i = 0;
  const iv = setInterval(() => {
    if (srcNames[i]) document.getElementById('loadingSrc').textContent = ' — ' + srcNames[i];
    i++;
    if (i >= srcNames.length) clearInterval(iv);
  }, 90);

  try {
    const params = new URLSearchParams({
      q: query, brand, model, yearMin, yearMax, kmMax, budgetMax,
      volant:  volantFilter,
      sources: [...activeSources].join(','),
    });

    // Clés API locales → headers
    const headers = {};
    const yahooKey = localStorage.getItem('oitaku_key_yahoo');
    const gooKey   = localStorage.getItem('oitaku_key_goonet');
    const encarKey = localStorage.getItem('oitaku_key_encar');
    if (yahooKey) headers['x-yahoo-app-id'] = yahooKey;
    if (gooKey)   headers['x-goonet-token'] = gooKey;
    if (encarKey) headers['x-encar-key']    = encarKey;

    const res  = await fetch(`${BACKEND_URL}/api/search?${params}`, { headers });
    const data = await res.json();
    currentResults = data.results || [];

    if (currentResults.length === 0) {
      currentResults = filterLocalCars({ query, brand, model, yearMin, yearMax, kmMax, budgetMax });
    }
  } catch (err) {
    console.warn('Backend non joignable, données démo:', err.message);
    currentResults = filterLocalCars({ query, brand, model, yearMin, yearMax, kmMax, budgetMax });
  }

  clearInterval(iv);
  ls.style.display = 'none';
  renderResults();

  if (currentResults.length > 0) {
    const lbl = query || model || brand || 'cette recherche';
    document.getElementById('alertText').textContent = `Alerte active — "${lbl}" — ${currentResults.length} annonce(s)`;
    document.getElementById('alertBanner').style.display = 'flex';
  }
}

function filterLocalCars({ query, brand, model, yearMin, yearMax, kmMax, budgetMax }) {
  return DEMO_CARS.filter(c => {
    if (!activeSources.has(c.source)) return false;
    if (query  && !c.name.toLowerCase().includes(query.toLowerCase()) &&
                  !c.brand.toLowerCase().includes(query.toLowerCase()) &&
                  !c.model.toLowerCase().includes(query.toLowerCase())) return false;
    if (brand  && c.brand.toLowerCase() !== brand.toLowerCase()) return false;
    if (model  && !c.model.toLowerCase().includes(model.toLowerCase())) return false;
    if (yearMin && c.year < parseInt(yearMin)) return false;
    if (yearMax && c.year > parseInt(yearMax)) return false;
    if (kmMax   && c.km   > parseInt(kmMax))   return false;
    if (budgetMax && c.price > parseInt(budgetMax)) return false;
    if (volantFilter !== 'all' && c.volant !== volantFilter) return false;
    return true;
  });
}

// ─── RENDER RESULTS ─────────────────────────────────────────

function renderResults() {
  const list   = document.getElementById('resultsList');
  const header = document.getElementById('resultsHeader');
  const empty  = document.getElementById('emptyState');

  if (!currentResults.length) { empty.style.display = 'flex'; header.style.display = 'none'; return; }
  header.style.display = 'flex';
  document.getElementById('resultsCount').innerHTML =
    `<span>${currentResults.length}</span> résultat(s) — ${activeSources.size} source(s)`;

  list.innerHTML = currentResults.map((c, i) => `
    <div class="car-card ${favorites.has(c.id)?'is-fav':''}"
         style="animation-delay:${i*0.03}s" onclick="openModal('${c.id}')">
      <div class="car-img-block">
        ${c.imageUrl
          ? `<img src="${c.imageUrl}" alt="${c.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
          : `<span style="font-size:22px">${c.icon||'🚗'}</span>`}
        <span class="car-src-badge src-${c.country}">${c.country==='jp'?'JDM':'KDM'}</span>
        <span class="type-badge ${c.type==='auction'?'type-enc':'type-occ'}">${c.type==='auction'?'ENC':'OCC'}</span>
      </div>
      <div class="car-info">
        <h3>${c.name}</h3>
        <div class="car-meta">
          <span class="meta-pill meta-year"><i class="ti ti-calendar"></i>${c.year}</span>
          <span class="meta-pill meta-km"><i class="ti ti-gauge"></i>${c.km.toLocaleString('fr-FR')} km</span>
          <span class="meta-pill meta-grade"><i class="ti ti-star"></i>${c.grade}</span>
          <span class="meta-pill ${c.volant==='right'?'meta-vol-r':'meta-vol-l'}">
            <i class="ti ti-steering-wheel"></i>${c.volant==='right'?'Droite':'Gauche'}
          </span>
          <span class="meta-pill" style="color:rgba(240,237,232,0.25)">
            <i class="ti ti-database"></i>${getSrcLabel(c.source)}
          </span>
        </div>
      </div>
      <div class="car-right">
        <div>
          <div class="car-price">${c.price.toLocaleString('fr-FR')} €</div>
          <div class="car-price-local">${c.local||''}</div>
        </div>
        <button class="btn-fav ${favorites.has(c.id)?'active':''}" onclick="toggleFav(event,'${c.id}')">
          <i class="ti ti-star"></i>${favorites.has(c.id)?'Favori':'Sauver'}
        </button>
      </div>
    </div>
  `).join('');
}

function sortResults(val) {
  currentResults.sort((a,b) =>
    val==='price-asc'  ? a.price-b.price :
    val==='price-desc' ? b.price-a.price :
    val==='km-asc'     ? a.km-b.km       : b.year-a.year
  );
  renderResults();
}

// ─── MODAL ──────────────────────────────────────────────────

function openModal(id) {
  const c = [...currentResults, ...savedCars].find(x => String(x.id) === String(id));
  if (!c) return;
  const isFav = favorites.has(c.id);
  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-title">${c.name}</div>
      <button class="modal-close" onclick="document.getElementById('modalOverlay').classList.remove('open')">
        <i class="ti ti-x"></i>
      </button>
    </div>
    <div class="modal-hero">
      ${c.imageUrl
        ? `<img src="${c.imageUrl}" alt="${c.name}">`
        : `<span style="font-size:64px">${c.icon||'🚗'}</span>`}
    </div>
    <div class="modal-badges">
      <span class="mbadge" style="background:rgba(214,48,49,0.15);color:#FF7675;border:1px solid rgba(214,48,49,0.3)">
        ${c.country==='jp'?'🇯🇵 JDM':'🇰🇷 KDM'}
      </span>
      <span class="mbadge" style="background:rgba(240,165,0,0.15);color:#F0A500;border:1px solid rgba(240,165,0,0.3)">
        ${c.type==='auction'?'Enchère':'Occasion'}
      </span>
      <span class="mbadge" style="background:rgba(162,155,254,0.15);color:#A29BFE;border:1px solid rgba(162,155,254,0.3)">
        Grade ${c.grade}
      </span>
      <span class="mbadge" style="background:${c.volant==='right'?'rgba(255,118,117,0.12)':'rgba(85,239,196,0.12)'};
        color:${c.volant==='right'?'#FF7675':'#55EFC4'};
        border:1px solid ${c.volant==='right'?'rgba(255,118,117,0.3)':'rgba(85,239,196,0.3)'}">
        Volant ${c.volant==='right'?'à droite':'à gauche'}
      </span>
    </div>
    <table class="modal-table">
      <tr><td>Marque / Modèle</td><td>${c.brand} ${c.model}</td></tr>
      <tr><td>Année</td><td>${c.year}</td></tr>
      <tr><td>Kilométrage</td><td>${c.km.toLocaleString('fr-FR')} km</td></tr>
      <tr><td>Transmission</td><td>${c.trans||'N/A'}</td></tr>
      <tr><td>Carburant</td><td>${c.carbu||'N/A'}</td></tr>
      <tr><td>Puissance</td><td>${c.cv ? c.cv+' ch' : 'N/A'}</td></tr>
      <tr><td>Source</td>
        <td>${getSrcLabel(c.source)} <span style="color:var(--muted);font-size:10px">(${getSrcUrl(c.source)})</span></td>
      </tr>
      ${c.endsAt ? `<tr><td>Fin enchère</td><td style="color:#F0A500">${new Date(c.endsAt).toLocaleString('fr-FR')}</td></tr>` : ''}
      ${c.bids !== undefined ? `<tr><td>Offres</td><td>${c.bids}</td></tr>` : ''}
    </table>
    <div class="modal-price">
      <div class="eur">${c.price.toLocaleString('fr-FR')} €</div>
      ${c.local ? `<div class="local">${c.local}</div>` : ''}
    </div>
    <div class="modal-actions">
      ${c.listingUrl
        ? `<a class="btn-primary" href="${c.listingUrl}" target="_blank" rel="noopener">
            <i class="ti ti-external-link"></i> Voir l'annonce
           </a>`
        : `<button class="btn-primary" onclick="analyzeImport('${c.id}')">
            <i class="ti ti-file-analytics"></i> Analyser l'import
           </button>`}
      <button class="btn-secondary" id="favModalBtn" onclick="toggleFavModal('${c.id}')">
        <i class="ti ti-star"></i> ${isFav ? 'Retirer' : 'Sauver en favori'}
      </button>
    </div>
  `;
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal(e) {
  if (e.target.id === 'modalOverlay') document.getElementById('modalOverlay').classList.remove('open');
}

// ─── FAVORITES ──────────────────────────────────────────────

function toggleFav(e, id) {
  e.stopPropagation();
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
    const car = currentResults.find(c => String(c.id) === String(id));
    if (car && !savedCars.find(c => String(c.id) === String(id))) {
      savedCars.push(car);
      saveCars();
    }
  }
  saveFavs();
  updateFavCount();
  renderResults();
}

function toggleFavModal(id) {
  favorites.has(id) ? favorites.delete(id) : favorites.add(id);
  saveFavs();
  updateFavCount();
  const btn = document.getElementById('favModalBtn');
  if (btn) btn.innerHTML = `<i class="ti ti-star"></i> ${favorites.has(id)?'Retirer':'Sauver en favori'}`;
  renderResults();
}

function updateFavCount() {
  document.getElementById('favCount').textContent = favorites.size;
}

function renderFavs() {
  const content = document.getElementById('favsContent');
  const favCars = savedCars.filter(c => favorites.has(c.id));

  if (!favCars.length) {
    content.innerHTML = `<div class="favs-empty">
      <i class="ti ti-star" style="font-size:36px;display:block;margin-bottom:12px;color:rgba(255,255,255,0.08)"></i>
      Aucun favori — recherchez des voitures et cliquez sur "Sauver"
    </div>`;
    return;
  }

  const totalVal = favCars.reduce((s,c) => s+c.price, 0);
  const avgKm    = Math.round(favCars.reduce((s,c) => s+c.km, 0) / favCars.length);

  content.innerHTML = `
    <div class="fav-actions">
      <button class="btn-export" onclick="exportFavs()"><i class="ti ti-download"></i>Exporter</button>
    </div>
    <div class="fav-summary">
      <div><div class="fav-stat-label">Véhicules</div><div class="fav-stat-val">${favCars.length}</div></div>
      <div><div class="fav-stat-label">Valeur totale</div><div class="fav-stat-val">${totalVal.toLocaleString('fr-FR')} €</div></div>
      <div><div class="fav-stat-label">KM moyen</div><div class="fav-stat-val">${avgKm.toLocaleString('fr-FR')}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${favCars.map(c => `
        <div class="car-card is-fav" onclick="openModal('${c.id}')">
          <div class="car-img-block">
            <span>${c.icon||'🚗'}</span>
            <span class="car-src-badge src-${c.country}">${c.country==='jp'?'JDM':'KDM'}</span>
            <span class="type-badge ${c.type==='auction'?'type-enc':'type-occ'}">${c.type==='auction'?'ENC':'OCC'}</span>
          </div>
          <div class="car-info">
            <h3>${c.name}</h3>
            <div class="car-meta">
              <span class="meta-pill meta-year"><i class="ti ti-calendar"></i>${c.year}</span>
              <span class="meta-pill meta-km"><i class="ti ti-gauge"></i>${c.km.toLocaleString('fr-FR')} km</span>
              <span class="meta-pill meta-grade"><i class="ti ti-star"></i>${c.grade}</span>
              <span class="meta-pill ${c.volant==='right'?'meta-vol-r':'meta-vol-l'}">
                <i class="ti ti-steering-wheel"></i>${c.volant==='right'?'Droite':'Gauche'}
              </span>
            </div>
          </div>
          <div class="car-right">
            <div class="car-price">${c.price.toLocaleString('fr-FR')} €</div>
            <button class="btn-fav active" onclick="removeFav(event,'${c.id}')">
              <i class="ti ti-trash"></i>Retirer
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function removeFav(e, id) {
  e.stopPropagation();
  favorites.delete(id);
  saveFavs();
  updateFavCount();
  renderFavs();
  renderResults();
}

function exportFavs() {
  const favCars = savedCars.filter(c => favorites.has(c.id));
  const lines = [
    'OITAKU IMPORT — Export Favoris — ' + new Date().toLocaleDateString('fr-FR'),
    '='.repeat(60),
    ...favCars.map((c,i) =>
      `${i+1}. ${c.name}\n   ${c.year} · ${c.km.toLocaleString('fr-FR')} km · ${c.price.toLocaleString('fr-FR')} € (${c.local||''})\n   Volant ${c.volant==='right'?'droite':'gauche'} · Grade ${c.grade} · ${getSrcLabel(c.source)}\n   ${c.listingUrl||'Pas de lien'}`
    ),
    '',
    `Total : ${favCars.reduce((s,c)=>s+c.price,0).toLocaleString('fr-FR')} €`,
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'oitaku-favoris.txt'; a.click();
  URL.revokeObjectURL(url);
}

// ─── ALERTS ─────────────────────────────────────────────────

async function saveAlert() {
  const email = prompt('Entrez votre email pour recevoir les alertes :');
  if (!email || !email.includes('@')) return;

  const query     = document.getElementById('queryInput').value.trim();
  const brand     = document.getElementById('brandFilter').value;
  const model     = document.getElementById('modelFilter').value;
  const yearMin   = parseInt(document.getElementById('yearFilter').value)    || 0;
  const yearMax   = parseInt(document.getElementById('yearMaxFilter').value) || 9999;
  const kmMax     = parseInt(document.getElementById('kmFilter').value)      || 999999;
  const budgetMax = parseInt(document.getElementById('budgetFilter').value)  || 999999;

  try {
    const res = await fetch(`${BACKEND_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, query, brand, model, yearMin, yearMax, kmMax, budgetMax, volant: volantFilter, sources: [...activeSources] }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Alerte créée ! Vous recevrez un email à ${email} dès qu'une nouvelle annonce correspondra.`);
      document.getElementById('alertBanner').style.display = 'none';
    } else {
      alert('Erreur : ' + (data.error || 'Impossible de créer l\'alerte'));
    }
  } catch {
    alert('Backend non connecté — configurez SendGrid dans Admin pour activer les alertes.');
  }
}

function analyzeImport(id) {
  document.getElementById('modalOverlay').classList.remove('open');
  alert('Analyse import disponible prochainement.');
}

// ─── ADMIN PANEL ────────────────────────────────────────────

const KEY_NAMES = {
  yahoo:     { ls: 'oitaku_key_yahoo',     label: 'Yahoo! JP App ID',   statusId: 'yahooStatus',     inputId: 'yahooKeyInput' },
  sendgrid:  { ls: 'oitaku_key_sendgrid',  label: 'SendGrid API Key',   statusId: 'sendgridStatus',  inputId: 'sendgridKeyInput' },
  beforward: { ls: 'oitaku_key_beforward', label: 'BE FORWARD API Key', statusId: 'beforwardStatus', inputId: 'beforwardKeyInput' },
  goonet:    { ls: 'oitaku_key_goonet',    label: 'Goo-net Token',      statusId: 'goonetStatus',    inputId: 'goonetKeyInput' },
};

function initAdmin() {
  for (const [k, cfg] of Object.entries(KEY_NAMES)) {
    const saved = localStorage.getItem(cfg.ls);
    const el    = document.getElementById(cfg.inputId);
    const badge = document.getElementById(cfg.statusId);
    if (!el || !badge) continue;
    if (saved) {
      el.placeholder   = '●●●●●●●●●●●● (enregistrée)';
      badge.textContent = 'LOCAL';
      badge.className   = 'api-status local';
    } else {
      el.placeholder    = '';
      badge.textContent  = 'NON CONFIGURÉ';
      badge.className    = 'api-status missing';
    }
  }
  fetch(`${BACKEND_URL}/api/status`)
    .then(r => r.json())
    .then(s => renderServerStatus(s))
    .catch(() => renderServerStatus(null));
}

function saveKey(key) {
  const cfg   = KEY_NAMES[key];
  const input = document.getElementById(cfg.inputId);
  const val   = input.value.trim();
  if (!val) { alert('Entrez une clé valide.'); return; }
  localStorage.setItem(cfg.ls, val);
  input.value = '';
  input.placeholder = '●●●●●●●●●●●● (enregistrée)';
  const badge = document.getElementById(cfg.statusId);
  if (badge) { badge.textContent = 'LOCAL'; badge.className = 'api-status local'; }
  alert(`${cfg.label} sauvegardée. Elle sera envoyée au backend à chaque recherche.`);
}

function clearKey(key) {
  const cfg = KEY_NAMES[key];
  localStorage.removeItem(cfg.ls);
  const input = document.getElementById(cfg.inputId);
  if (input) { input.value = ''; input.placeholder = ''; }
  const badge = document.getElementById(cfg.statusId);
  if (badge) { badge.textContent = 'NON CONFIGURÉ'; badge.className = 'api-status missing'; }
}

async function testYahooKey() {
  const stored   = localStorage.getItem('oitaku_key_yahoo');
  const inputVal = document.getElementById('yahooKeyInput')?.value.trim();
  const key      = inputVal || stored;
  if (!key) { showTestResult('yahooTestResult', false, 'Aucune clé — enregistrez votre App ID d\'abord.'); return; }

  showTestResult('yahooTestResult', null, 'Test en cours...');
  try {
    const r = await fetch(`${BACKEND_URL}/api/search?q=GT-R&sources=yahoo-jp&yearMin=2000`, {
      headers: { 'x-yahoo-app-id': key }
    });
    const d = await r.json();
    if (d.results?.length > 0) {
      showTestResult('yahooTestResult', true, `Yahoo JP OK — ${d.results.length} annonce(s) trouvée(s) en live.`);
    } else {
      showTestResult('yahooTestResult', false, 'Clé acceptée mais 0 résultat. Vérifiez les permissions de l\'app sur developer.yahoo.co.jp');
    }
  } catch (err) {
    showTestResult('yahooTestResult', false, 'Erreur réseau: ' + err.message);
  }
}

async function testSendgrid() {
  const key = document.getElementById('sendgridKeyInput')?.value.trim() || localStorage.getItem('oitaku_key_sendgrid');
  if (!key) { showTestResult('sendgridTestResult', false, 'Aucune clé SendGrid enregistrée.'); return; }
  showTestResult('sendgridTestResult', true, 'Clé présente — testez en créant une alerte email depuis la recherche.');
}

function showTestResult(id, ok, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = 'block';
  if (ok === null) {
    el.className = 'test-result';
    el.style.cssText = 'display:block;margin-top:8px;padding:8px 12px;border-radius:6px;font-size:10px;font-family:var(--font-mono);background:rgba(255,255,255,0.04);color:var(--muted);border:1px solid var(--border)';
  } else {
    el.className = 'test-result ' + (ok ? 'success' : 'error');
    el.style.cssText = '';
  }
  el.textContent = msg;
}

function renderServerStatus(s) {
  const card = document.getElementById('serverStatusCard');
  if (!card) return;
  if (!s) {
    card.innerHTML = `<div style="font-size:11px;font-family:var(--font-mono);color:#FF7675">
      Backend non joignable — vérifiez Railway</div>`;
    return;
  }
  const rows = [
    ['Yahoo! JP API',   s.yahoo_jp],
    ['BE FORWARD',      s.beforward],
    ['Goo-net',         s.goonet],
    ['Encar (public)',  s.encar],
    ['SendGrid Email',  s.sendgrid],
    ['Base de données', s.database],
  ];
  card.innerHTML = `
    <div style="font-size:10px;font-family:var(--font-mono);color:var(--muted);margin-bottom:10px">
      Backend Railway — v${s.version||'?'} — <a href="${BACKEND_URL}/health" target="_blank" style="color:var(--muted)">${BACKEND_URL}</a>
    </div>
    ${rows.map(([label, ok]) => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:11px;font-family:var(--font-mono)">${label}</span>
        <span style="font-size:9px;font-family:var(--font-mono);padding:2px 8px;border-radius:8px;
          background:${ok?'rgba(0,184,148,0.12)':'rgba(214,48,49,0.1)'};
          color:${ok?'#00B894':'#FF7675'};
          border:1px solid ${ok?'rgba(0,184,148,0.25)':'rgba(214,48,49,0.2)'}">
          ${ok?'ACTIF':'MANQUANT'}
        </span>
      </div>
    `).join('')}
    <div style="margin-top:10px;font-size:10px;font-family:var(--font-mono);color:var(--muted)">
      Config serveur : Railway → oitaku-backend → Variables d'environnement
    </div>
  `;

  // Mise à jour pastille statut en haut
  const dot  = document.getElementById('statusDot');
  const pill = document.getElementById('statusPill');
  const txt  = document.getElementById('statusText');
  if (s.yahoo_jp) {
    dot.className  = 'status-dot';
    pill.className = 'status-pill';
    txt.textContent = 'En ligne · APIs actives';
  } else {
    dot.className  = 'status-dot warn';
    pill.className = 'status-pill warn';
    txt.textContent = 'En ligne · Config Admin';
  }
}

async function checkBackendStatus() {
  try {
    const r = await fetch(`${BACKEND_URL}/api/status`);
    const s = await r.json();
    renderServerStatus(s);
  } catch {
    const dot  = document.getElementById('statusDot');
    const pill = document.getElementById('statusPill');
    const txt  = document.getElementById('statusText');
    if (dot)  dot.className  = 'status-dot warn';
    if (pill) pill.className = 'status-pill warn';
    if (txt)  txt.textContent = 'Mode démo';
  }
}

// ─── DEMO DATA — 84 véhicules JDM/KDM réalistes ─────────────

const DEMO_CARS = [
  // ── USS Auction
  {id:'d1',  name:'Nissan Skyline GT-R R34 V-Spec II Nür',  brand:'Nissan',    model:'Skyline GT-R',   year:2002,km:28000, price:115000,local:'¥18,400,000',grade:'S+',source:'uss',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d2',  name:'Honda NSX-R Type R NA2 Champion White',   brand:'Honda',     model:'NSX Type R',     year:2003,km:31000, price:152000,local:'¥24,300,000',grade:'S', source:'uss',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:290},
  {id:'d3',  name:'Nissan GT-R R35 Nismo MY2018',            brand:'Nissan',    model:'GT-R R35',       year:2018,km:11800, price:148000,local:'¥23,700,000',grade:'S+',source:'uss',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Automatique', carbu:'Essence',    cv:600},
  {id:'d4',  name:'Lexus LFA — 1 of 500 — #247',            brand:'Lexus',     model:'LFA',            year:2011,km:7800,  price:418000,local:'¥66,900,000',grade:'S+',source:'uss',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Séquentielle',carbu:'Essence',    cv:560},

  // ── TAA Auction
  {id:'d5',  name:'Toyota Supra A80 RZ 6MT BPU',            brand:'Toyota',    model:'Supra',          year:1997,km:82000, price:58000, local:'¥9,280,000', grade:'A', source:'taa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d6',  name:'Mazda RX-7 FD3S Spirit R Type A',        brand:'Mazda',     model:'RX-7',           year:2002,km:28500, price:72000, local:'¥11,520,000',grade:'S', source:'taa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:255},
  {id:'d7',  name:'Honda Integra Type R DC5 6MT',           brand:'Honda',     model:'Integra Type R', year:2001,km:61000, price:32500, local:'¥5,200,000', grade:'A', source:'taa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:220},
  {id:'d8',  name:'Subaru Impreza WRX STI RA Type R',       brand:'Subaru',    model:'Impreza WRX STI',year:1999,km:88000, price:22500, local:'¥3,600,000', grade:'B+',source:'taa',        country:'jp',icon:'🚙',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},

  // ── CAA Auction
  {id:'d9',  name:'Nissan Silvia S15 Spec-R Aero 6MT',      brand:'Nissan',    model:'Silvia',         year:2001,km:74000, price:24500, local:'¥3,920,000', grade:'A', source:'caa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:250},
  {id:'d10', name:'Toyota MR2 GT-S SW20 Turbo',             brand:'Toyota',    model:'MR2',            year:1995,km:68000, price:13800, local:'¥2,208,000', grade:'B+',source:'caa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:245},
  {id:'d11', name:'Mitsubishi Lancer Evo X GSR FQ-400',     brand:'Mitsubishi',model:'Lancer Evo X',   year:2010,km:44500, price:38500, local:'¥6,160,000', grade:'A+',source:'caa',        country:'jp',icon:'🚗',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:400},
  {id:'d12', name:'Honda S2000 AP2 Gran Turismo Edition',   brand:'Honda',     model:'S2000',          year:2007,km:38500, price:39500, local:'¥6,320,000', grade:'A+',source:'caa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:240},

  // ── JU Auction
  {id:'d13', name:'Nissan Skyline GT-R R33 V-Spec II',      brand:'Nissan',    model:'Skyline GT-R',   year:1997,km:85000, price:38500, local:'¥6,160,000', grade:'B+',source:'ju',         country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d14', name:'Toyota Soarer UZZ40 4.3 V8',             brand:'Toyota',    model:'Soarer',         year:2003,km:48000, price:15500, local:'¥2,480,000', grade:'A', source:'ju',         country:'jp',icon:'🚗',type:'auction',volant:'right',trans:'Automatique', carbu:'Essence',    cv:300},
  {id:'d15', name:'Nissan Fairlady Z Z34 NISMO Version',    brand:'Nissan',    model:'Fairlady Z',     year:2015,km:38000, price:32000, local:'¥5,120,000', grade:'A', source:'ju',         country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:336},
  {id:'d16', name:'Toyota AE86 Trueno GT-APEX 2-door',      brand:'Toyota',    model:'AE86',           year:1985,km:82500, price:24500, local:'¥3,920,000', grade:'B', source:'ju',         country:'jp',icon:'🚗',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:128},

  // ── HAA Kobe
  {id:'d17', name:'Nissan Stagea 260RS Autech Version',     brand:'Nissan',    model:'Stagea',         year:1997,km:72000, price:19500, local:'¥3,120,000', grade:'B+',source:'haa',        country:'jp',icon:'🚙',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d18', name:'Mitsubishi 3000GT VR-4 Twin Turbo',      brand:'Mitsubishi',model:'3000GT',         year:1993,km:108000,price:11200, local:'¥1,792,000', grade:'B', source:'haa',        country:'jp',icon:'🚗',type:'auction',volant:'right',trans:'Automatique', carbu:'Essence',    cv:296},
  {id:'d19', name:'Subaru BRZ tS STI Sport 6MT',            brand:'Subaru',    model:'BRZ',            year:2018,km:29000, price:22500, local:'¥3,600,000', grade:'A+',source:'haa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:200},
  {id:'d20', name:'Lexus IS F 5.0 V8 416 ch',              brand:'Lexus',     model:'IS F',           year:2012,km:52000, price:28500, local:'¥4,560,000', grade:'A', source:'haa',        country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Automatique', carbu:'Essence',    cv:416},

  // ── Yahoo! Auctions JP
  {id:'d21', name:'Nissan Skyline GT-R R32 BNR32 V-Spec',  brand:'Nissan',    model:'Skyline GT-R',   year:1993,km:118000,price:28500, local:'¥4,560,000', grade:'B+',source:'yahoo-jp',   country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d22', name:'Honda Civic Type R EK9 98 Spec',         brand:'Honda',     model:'Civic Type R',   year:1999,km:85000, price:22500, local:'¥3,600,000', grade:'B', source:'yahoo-jp',   country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:185},
  {id:'d23', name:'Toyota Celica GT-Four ST205 WRC Homol.', brand:'Toyota',    model:'Celica',         year:1994,km:92000, price:19500, local:'¥3,120,000', grade:'B+',source:'yahoo-jp',   country:'jp',icon:'🏎️',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:255},
  {id:'d24', name:'Mazda Roadster NA6CE Cabriolet 1.6',     brand:'Mazda',     model:'MX-5',           year:1991,km:68000, price:9500,  local:'¥1,520,000', grade:'B+',source:'yahoo-jp',   country:'jp',icon:'🚗',type:'auction',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:115},

  // ── Goo-net Exchange
  {id:'d25', name:'Nissan GT-R R35 Black Edition Premium',  brand:'Nissan',    model:'GT-R R35',       year:2016,km:25000, price:85000, local:'¥13,600,000',grade:'A+',source:'goo-net',    country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:570},
  {id:'d26', name:'Honda NSX NA1 Type R 3.0 V6',            brand:'Honda',     model:'NSX Type R',     year:1994,km:68000, price:88000, local:'¥14,080,000',grade:'A', source:'goo-net',    country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d27', name:'Toyota GR Supra A90 RZ 3.0T 387 ch',    brand:'Toyota',    model:'Supra GR',       year:2020,km:15000, price:64000, local:'¥10,240,000',grade:'S', source:'goo-net',    country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:387},
  {id:'d28', name:'Mazda RX-8 Type RS 231 ch 6MT',          brand:'Mazda',     model:'RX-8',           year:2004,km:82000, price:9800,  local:'¥1,568,000', grade:'B+',source:'goo-net',    country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:250},

  // ── SBT Japan
  {id:'d29', name:'Toyota Land Cruiser 200 ZX 4WD Diesel',  brand:'Toyota',    model:'Land Cruiser',   year:2018,km:62000, price:65000, local:'¥10,400,000',grade:'A', source:'sbt',        country:'jp',icon:'🚘',type:'occasion',volant:'right',trans:'Automatique', carbu:'Diesel',     cv:188},
  {id:'d30', name:'Toyota Hilux Revo 2.8D Extra Cab 4WD',   brand:'Toyota',    model:'Hilux',          year:2019,km:55000, price:29500, local:'¥4,720,000', grade:'A', source:'sbt',        country:'jp',icon:'🚚',type:'occasion',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:177},
  {id:'d31', name:'Suzuki Jimny JB74W AllGrip Pro',          brand:'Suzuki',    model:'Jimny',          year:2019,km:28000, price:19500, local:'¥3,120,000', grade:'S', source:'sbt',        country:'jp',icon:'🚙',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:102},
  {id:'d32', name:'Mitsubishi Pajero 3.2 DI-D Long 4WD',    brand:'Mitsubishi',model:'Pajero',         year:2004,km:168000,price:8500,  local:'¥1,360,000', grade:'B', source:'sbt',        country:'jp',icon:'🚘',type:'occasion',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:165},

  // ── BE FORWARD
  {id:'d33', name:'Toyota Land Cruiser Prado 150 TX-L',     brand:'Toyota',    model:'Prado',          year:2017,km:55000, price:39500, local:'¥6,320,000', grade:'A', source:'beforward',  country:'jp',icon:'🚘',type:'occasion',volant:'right',trans:'Automatique', carbu:'Diesel',     cv:177},
  {id:'d34', name:'Subaru Forester SJ 2.0i Eyesight AWD',   brand:'Subaru',    model:'Forester',       year:2015,km:72000, price:15800, local:'¥2,528,000', grade:'A', source:'beforward',  country:'jp',icon:'🚙',type:'occasion',volant:'right',trans:'CVT',         carbu:'Essence',    cv:170},
  {id:'d35', name:'Honda Vezel RS Hybrid Sensing 4WD',       brand:'Honda',     model:'CR-V',           year:2017,km:38000, price:17500, local:'¥2,800,000', grade:'A+',source:'beforward',  country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'CVT',         carbu:'Hybride',    cv:136},
  {id:'d36', name:'Nissan X-Trail T32 20Xi Hybrid 4WD',     brand:'Nissan',    model:'GT-R R35',       year:2016,km:58000, price:14800, local:'¥2,368,000', grade:'A', source:'beforward',  country:'jp',icon:'🚙',type:'occasion',volant:'right',trans:'CVT',         carbu:'Hybride',    cv:144},

  // ── CarSensor
  {id:'d37', name:'Mitsubishi Lancer Evo IX MR GSR',        brand:'Mitsubishi',model:'Lancer Evo',     year:2006,km:85000, price:22000, local:'¥3,520,000', grade:'B+',source:'carsensor',  country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d38', name:'Honda Integra Type R DC2 98 Spec 6MT',   brand:'Honda',     model:'Integra Type R', year:1997,km:92000, price:28500, local:'¥4,560,000', grade:'B', source:'carsensor',  country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:200},
  {id:'d39', name:'Subaru Legacy B4 BL5 GT-B EyeSight',     brand:'Subaru',    model:'Legacy B4',      year:2005,km:88000, price:10500, local:'¥1,680,000', grade:'B+',source:'carsensor',  country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:265},
  {id:'d40', name:'Nissan Skyline GT-R R32 BNR32',          brand:'Nissan',    model:'Skyline GT-R',   year:1992,km:95000, price:32000, local:'¥5,120,000', grade:'B+',source:'carsensor',  country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:280},

  // ── Carused.jp
  {id:'d41', name:'Nissan Silvia S14 Kouki K\'s Aero',      brand:'Nissan',    model:'Silvia',         year:1997,km:88000, price:14500, local:'¥2,320,000', grade:'B+',source:'carused',    country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:200},
  {id:'d42', name:'Toyota Altezza RS200 Z Edition 6MT',      brand:'Toyota',    model:'Altezza',        year:2001,km:82000, price:9500,  local:'¥1,520,000', grade:'B+',source:'carused',    country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:210},
  {id:'d43', name:'Honda Prelude SiR H22A VTEC Type S',      brand:'Honda',     model:'Prelude',        year:1998,km:95000, price:7200,  local:'¥1,152,000', grade:'B', source:'carused',    country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:200},
  {id:'d44', name:'Mazda MX-5 NC Roadster 2.0 RHT',         brand:'Mazda',     model:'MX-5',           year:2008,km:52000, price:11800, local:'¥1,888,000', grade:'A', source:'carused',    country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:170},

  // ── CardealPage
  {id:'d45', name:'Subaru Impreza WRX STI Type RA-R',       brand:'Subaru',    model:'Impreza WRX STI',year:2007,km:28000, price:39500, local:'¥6,320,000', grade:'A+',source:'cardealpage',country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Manuelle',    carbu:'Essence',    cv:300},
  {id:'d46', name:'Lexus RC F Carbon Package V8 477 ch',    brand:'Lexus',     model:'RC F',           year:2016,km:38000, price:52000, local:'¥8,320,000', grade:'A+',source:'cardealpage',country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:477},
  {id:'d47', name:'Toyota Chaser Tourer V JZX100 1JZ',      brand:'Toyota',    model:'Chaser',         year:1998,km:95000, price:14500, local:'¥2,320,000', grade:'B+',source:'cardealpage',country:'jp',icon:'🚗',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:280},
  {id:'d48', name:'Nissan GT-R R35 Premium Edition MY2014', brand:'Nissan',    model:'GT-R R35',       year:2014,km:42000, price:72000, local:'¥11,520,000',grade:'A+',source:'cardealpage',country:'jp',icon:'🏎️',type:'occasion',volant:'right',trans:'Automatique', carbu:'Essence',    cv:550},

  // ── CarFromJapan
  {id:'d49', name:'Toyota RAV4 Adventure 2.5 Hybrid AWD',   brand:'Toyota',    model:'RAV4',           year:2019,km:38000, price:29500, local:'¥4,720,000', grade:'A', source:'carfromjapan',country:'jp',icon:'🚙',type:'occasion',volant:'left', trans:'Automatique', carbu:'Hybride',    cv:222},
  {id:'d50', name:'Suzuki Jimny Sierra JB74W 4WD Export',   brand:'Suzuki',    model:'Jimny',          year:2020,km:18000, price:22500, local:'¥3,600,000', grade:'A+',source:'carfromjapan',country:'jp',icon:'🚙',type:'occasion',volant:'left', trans:'Manuelle',    carbu:'Essence',    cv:102},
  {id:'d51', name:'Honda CR-V Hybrid AWD Sensing',           brand:'Honda',     model:'CR-V',           year:2018,km:45000, price:22500, local:'¥3,600,000', grade:'A', source:'carfromjapan',country:'jp',icon:'🚙',type:'occasion',volant:'left', trans:'Automatique', carbu:'Hybride',    cv:215},
  {id:'d52', name:'Mazda CX-5 XD Touring Diesel AWD',        brand:'Mazda',     model:'CX-5',           year:2019,km:48000, price:22000, local:'¥3,520,000', grade:'A', source:'carfromjapan',country:'jp',icon:'🚙',type:'occasion',volant:'right',trans:'Automatique', carbu:'Diesel',     cv:190},

  // ── Encar
  {id:'d53', name:'Kia Stinger GT 3.3T AWD 370 ch',         brand:'Kia',       model:'Stinger GT',     year:2019,km:38000, price:28500, local:'₩42,000,000',grade:'A', source:'encar',      country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:370},
  {id:'d54', name:'Hyundai i30N Performance 2.0T 280 ch',   brand:'Hyundai',   model:'i30N',           year:2021,km:19000, price:25000, local:'₩36,800,000',grade:'A+',source:'encar',      country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Manuelle',    carbu:'Essence',    cv:280},
  {id:'d55', name:'Genesis G80 Sport 3.5T AWD 380 ch',      brand:'Genesis',   model:'G80',            year:2021,km:22000, price:48000, local:'₩70,700,000',grade:'A+',source:'encar',      country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:380},
  {id:'d56', name:'Hyundai Genesis Coupe 3.8 V6 Track',     brand:'Hyundai',   model:'Genesis Coupe',  year:2013,km:55000, price:14500, local:'₩21,400,000',grade:'B+',source:'encar',      country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Manuelle',    carbu:'Essence',    cv:306},

  // ── K Car
  {id:'d57', name:'Kia EV6 GT 77.4kWh AWD 585 ch',         brand:'Kia',       model:'EV6 GT',         year:2022,km:12000, price:41500, local:'₩61,100,000',grade:'S', source:'kcar',       country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Électrique', cv:585},
  {id:'d58', name:'Hyundai Ioniq 5 N 84kWh AWD 650 ch',    brand:'Hyundai',   model:'Ioniq 5 N',      year:2023,km:8000,  price:45500, local:'₩67,000,000',grade:'S+',source:'kcar',       country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Électrique', cv:650},
  {id:'d59', name:'Genesis G70 3.3T Sport AWD 370 ch 8AT', brand:'Genesis',   model:'G70',            year:2021,km:28000, price:34000, local:'₩50,100,000',grade:'A+',source:'kcar',       country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:370},
  {id:'d60', name:'Kia ProCeed GT 1.6T 7DCT 204 ch',       brand:'Kia',       model:'ProCeed GT',     year:2020,km:35000, price:22500, local:'₩33,100,000',grade:'A', source:'kcar',       country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:204},

  // ── Autobell
  {id:'d61', name:'Genesis GV80 3.5T AWD Prestige 380 ch', brand:'Genesis',   model:'GV80',           year:2021,km:18000, price:55000, local:'₩81,000,000',grade:'S', source:'autobell',   country:'kr',icon:'🚘',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:380},
  {id:'d62', name:'Hyundai Palisade Calligraphy AWD Diesel',brand:'Hyundai',   model:'Palisade',       year:2022,km:25000, price:39500, local:'₩58,200,000',grade:'A+',source:'autobell',   country:'kr',icon:'🚘',type:'auction',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:202},
  {id:'d63', name:'Genesis GV70 Sport 2.5T AWD 304 ch',    brand:'Genesis',   model:'GV70',           year:2022,km:15000, price:47000, local:'₩69,200,000',grade:'S', source:'autobell',   country:'kr',icon:'🚘',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:304},
  {id:'d64', name:'Kia Stinger GT-Line 2.5T AWD 304 ch',   brand:'Kia',       model:'Stinger GT',     year:2021,km:32000, price:25000, local:'₩36,800,000',grade:'A', source:'autobell',   country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:304},

  // ── Lotte Auto Auction
  {id:'d65', name:'Hyundai Veloster N TCR 275 ch Sébring',  brand:'Hyundai',   model:'Veloster N',     year:2020,km:28000, price:29500, local:'₩43,400,000',grade:'A+',source:'lotte',      country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Manuelle',    carbu:'Essence',    cv:275},
  {id:'d66', name:'Genesis G90 3.5T AWD LWB Prestige',      brand:'Genesis',   model:'G90',            year:2022,km:12000, price:72000, local:'₩106,000,000',grade:'S+',source:'lotte',     country:'kr',icon:'🚘',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:380},
  {id:'d67', name:'Kia EV6 2WD 228 ch Long Range',          brand:'Kia',       model:'EV6',            year:2022,km:22000, price:29500, local:'₩43,400,000',grade:'A', source:'lotte',      country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Électrique', cv:228},
  {id:'d68', name:'Hyundai Tucson N Line Hybrid AWD',        brand:'Hyundai',   model:'Tucson',         year:2022,km:22000, price:29000, local:'₩42,700,000',grade:'A+',source:'lotte',      country:'kr',icon:'🚙',type:'auction',volant:'left', trans:'Automatique', carbu:'Hybride',    cv:230},

  // ── Heydealer
  {id:'d69', name:'Genesis GV60 Sport Plus AWD 360 ch',     brand:'Genesis',   model:'GV60',           year:2022,km:18000, price:48000, local:'₩70,700,000',grade:'S', source:'heydealer',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Électrique', cv:360},
  {id:'d70', name:'Hyundai Ioniq 6 Long Range AWD 325 ch',  brand:'Hyundai',   model:'Ioniq 6',        year:2023,km:8000,  price:36000, local:'₩53,000,000',grade:'S', source:'heydealer',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Électrique', cv:325},
  {id:'d71', name:'Hyundai Elantra N 2.0T 276 ch 8DCT',    brand:'Hyundai',   model:'Elantra N',      year:2022,km:22000, price:26000, local:'₩38,300,000',grade:'A+',source:'heydealer',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:276},
  {id:'d72', name:'Genesis G80 Electrified AWD 365 ch',     brand:'Genesis',   model:'G80 Electrified',year:2022,km:18000, price:62000, local:'₩91,300,000',grade:'S', source:'heydealer',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Électrique', cv:365},

  // ── AJ Sellcar
  {id:'d73', name:'Hyundai Grandeur IG 3.3 V6 Prestige',    brand:'Hyundai',   model:'Grandeur',       year:2020,km:45000, price:23000, local:'₩33,900,000',grade:'A', source:'ajsellcar',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:290},
  {id:'d74', name:'Genesis GV80 Coupe 3.5T AWD 380 ch',    brand:'Genesis',   model:'GV80 Coupe',     year:2024,km:5000,  price:68000, local:'₩100,100,000',grade:'S+',source:'ajsellcar',  country:'kr',icon:'🚘',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:380},
  {id:'d75', name:'Kia K8 3.5 GDi Prestige AWD',           brand:'Kia',       model:'K8 Hybrid',      year:2022,km:28000, price:32000, local:'₩47,100,000',grade:'A+',source:'ajsellcar',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:300},
  {id:'d76', name:'Genesis G70 2.0T Sport AWD MY2022',      brand:'Genesis',   model:'G70',            year:2022,km:18000, price:35500, local:'₩52,300,000',grade:'A+',source:'ajsellcar',  country:'kr',icon:'🚗',type:'auction',volant:'left', trans:'Automatique', carbu:'Essence',    cv:245},

  // ── Autowini
  {id:'d77', name:'Hyundai i20 N Performance 1.6T 208 ch',  brand:'Hyundai',   model:'i20N',           year:2022,km:15000, price:20500, local:'₩30,200,000',grade:'A+',source:'autowini',   country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Manuelle',    carbu:'Essence',    cv:208},
  {id:'d78', name:'Kia Ceed GT 1.6T 7DCT 204 ch',          brand:'Kia',       model:'Ceed GT',        year:2019,km:42000, price:17500, local:'₩25,800,000',grade:'A', source:'autowini',   country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:204},
  {id:'d79', name:'Hyundai Elantra N Line 1.6T 204 ch',    brand:'Hyundai',   model:'Elantra N',      year:2021,km:28000, price:19500, local:'₩28,700,000',grade:'A', source:'autowini',   country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Essence',    cv:204},
  {id:'d80', name:'Kia Niro EV Long Range 204 ch',          brand:'Kia',       model:'Niro EV',        year:2022,km:22000, price:21000, local:'₩30,900,000',grade:'A+',source:'autowini',   country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Électrique', cv:204},

  // ── SK Encar
  {id:'d81', name:'SsangYong Rexton Sports Khan 2.2D AWD',  brand:'SsangYong', model:'Rexton Sports',  year:2021,km:35000, price:25500, local:'₩37,600,000',grade:'A', source:'skEncar',    country:'kr',icon:'🚘',type:'occasion',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:181},
  {id:'d82', name:'Hyundai Kona Electric 64kWh Premium',    brand:'Hyundai',   model:'Kona Electric',  year:2022,km:18000, price:23500, local:'₩34,600,000',grade:'A+',source:'skEncar',    country:'kr',icon:'🚗',type:'occasion',volant:'left', trans:'Automatique', carbu:'Électrique', cv:204},
  {id:'d83', name:'Kia Sorento 2.2D AWD 7 places',          brand:'Kia',       model:'Sorento',        year:2022,km:28000, price:34000, local:'₩50,100,000',grade:'A', source:'skEncar',    country:'kr',icon:'🚘',type:'occasion',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:202},
  {id:'d84', name:'SsangYong Musso Grand 4WD Ultimate',     brand:'SsangYong', model:'Musso',          year:2022,km:25000, price:29500, local:'₩43,400,000',grade:'A', source:'skEncar',    country:'kr',icon:'🚘',type:'occasion',volant:'left', trans:'Automatique', carbu:'Diesel',     cv:181},
];

// ─── INIT ───────────────────────────────────────────────────

document.getElementById('queryInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch();
});

updateFavCount();
renderSourcesGrid();
checkBackendStatus();
