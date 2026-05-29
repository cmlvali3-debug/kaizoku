// ============================================================
// OITAKU IMPORT — app.js
// Frontend logic — connects to backend API at /api/*
// Replace BACKEND_URL with your Railway URL once deployed
// ============================================================

const BACKEND_URL = 'http://localhost:3001'; // Replace with Railway URL

// ─── DATA ────────────────────────────────────────────────────

const SOURCES = {
  jp: [
    {id:'uss',       label:'USS Auction',       type:'auction', url:'uss.ne.jp'},
    {id:'taa',       label:'TAA Auction',        type:'auction', url:'taa.ne.jp'},
    {id:'caa',       label:'CAA Auction',        type:'auction', url:'caa-auction.jp'},
    {id:'ju',        label:'JU Auction',         type:'auction', url:'ju-net.or.jp'},
    {id:'haa',       label:'HAA Kobe',           type:'auction', url:'haakobe.jp'},
    {id:'yahoo-jp',  label:'Yahoo! Auctions JP', type:'auction', url:'auctions.yahoo.co.jp'},
    {id:'goo-net',   label:'Goo-net Exchange',   type:'occasion',url:'goo-net-exchange.com'},
    {id:'sbt',       label:'SBT Japan',          type:'occasion',url:'sbtjapan.com'},
    {id:'beforward', label:'BE FORWARD',         type:'occasion',url:'beforward.jp'},
    {id:'carsensor', label:'CarSensor',          type:'occasion',url:'carsensor.net'},
    {id:'carused',   label:'Carused.jp',         type:'occasion',url:'carused.jp'},
    {id:'cardealpage',label:'CardealPage',       type:'occasion',url:'cardealpage.com'},
    {id:'carfromjapan',label:'CarFromJapan',     type:'occasion',url:'carfromjapan.com'},
  ],
  kr: [
    {id:'encar',     label:'Encar',                    type:'occasion',url:'encar.com'},
    {id:'kcar',      label:'K Car',                    type:'occasion',url:'kcar.com'},
    {id:'autobell',  label:'Autobell (Hyundai Glovis)',type:'auction', url:'autobellglobal.com'},
    {id:'lotte',     label:'Lotte Auto Auction',       type:'auction', url:'lotteautoauction.com'},
    {id:'heydealer', label:'Heydealer',                type:'auction', url:'heydealer.com'},
    {id:'ajsellcar', label:'AJ Sellcar',               type:'auction', url:'ajsellcar.com'},
    {id:'autowini',  label:'Autowini',                 type:'occasion',url:'autowini.com'},
    {id:'skEncar',   label:'SK Encar',                 type:'occasion',url:'encar.com'},
  ]
};

const MODELS_BY_BRAND = {
  'Nissan':    ['Skyline GT-R','Silvia','350Z','370Z','GT-R R35','Fairlady Z','Stagea','Laurel','Cima','Note','March'],
  'Toyota':    ['Supra','Chaser','Land Cruiser','Soarer','Celica','MR2','Altezza','Crown','Mark II','Hilux','RAV4','Prado'],
  'Honda':     ['NSX','Integra','Civic Type R','S2000','Legend','CR-V','Accord','Prelude','Jazz','Stream'],
  'Mazda':     ['RX-7','RX-8','MX-5','Atenza','Axela','CX-5','CX-8','Roadster'],
  'Mitsubishi':['Lancer Evo','Eclipse','GTO','Pajero','Outlander','FTO','3000GT'],
  'Subaru':    ['Impreza WRX STI','Legacy','Forester','BRZ','Outback','Levorg','XV'],
  'Lexus':     ['LFA','IS','GS','LS','LC','RC F','LX','RX'],
  'Infiniti':  ['G35','G37','Q50','Q60','FX','QX70'],
  'Hyundai':   ['Genesis Coupe','i30N','Veloster N','Sonata','Elantra','Tucson','Santa Fe','Ioniq 5','Ioniq 6'],
  'Kia':       ['Stinger','EV6','Ceed GT','Optima','Sportage','Sorento','ProCeed'],
  'Genesis':   ['G70','G80','G90','GV70','GV80','GV60'],
  'SsangYong': ['Musso','Rexton','Korando','Tivoli'],
};

// ─── STATE ───────────────────────────────────────────────────

let currentResults  = [];
let favorites       = new Set(JSON.parse(localStorage.getItem('oitaku_favs') || '[]'));
let savedCars       = JSON.parse(localStorage.getItem('oitaku_cars') || '[]');
let activeSources   = new Set(Object.values(SOURCES).flat().map(s => s.id));
let srcTab          = 'jp';
let volantFilter    = 'all';

// ─── HELPERS ─────────────────────────────────────────────────

function getSrcLabel(id) { return [...SOURCES.jp,...SOURCES.kr].find(s=>s.id===id)?.label || id; }
function getSrcUrl(id)   { return [...SOURCES.jp,...SOURCES.kr].find(s=>s.id===id)?.url || ''; }
function saveFavs()      { localStorage.setItem('oitaku_favs', JSON.stringify([...favorites])); }
function saveCars()      { localStorage.setItem('oitaku_cars', JSON.stringify(savedCars)); }

// ─── NAV ─────────────────────────────────────────────────────

function showPage(p) {
  document.querySelectorAll('.page').forEach(x => x.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
  document.getElementById('page-'+p).classList.add('active');
  document.getElementById('nav-'+p).classList.add('active');
  if (p === 'favs') renderFavs();
  if (p === 'sources') renderSourceDetail();
}

// ─── SOURCES ─────────────────────────────────────────────────

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

function selectAll()  { Object.values(SOURCES).flat().forEach(s=>activeSources.add(s.id));    renderSourcesGrid(); renderSourceDetail(); }
function selectNone() { activeSources.clear();                                                  renderSourcesGrid(); renderSourceDetail(); }
function selectJP()   { activeSources.clear(); SOURCES.jp.forEach(s=>activeSources.add(s.id)); renderSourcesGrid(); renderSourceDetail(); }
function selectKR()   { activeSources.clear(); SOURCES.kr.forEach(s=>activeSources.add(s.id)); renderSourcesGrid(); renderSourceDetail(); }

// ─── FILTERS ─────────────────────────────────────────────────

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

// ─── SEARCH ──────────────────────────────────────────────────

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

  // Animate source names while loading
  const srcNames = [...activeSources].map(id => getSrcLabel(id));
  let i = 0;
  const iv = setInterval(() => {
    if (srcNames[i]) document.getElementById('loadingSrc').textContent = ' — ' + srcNames[i];
    i++;
    if (i >= srcNames.length) clearInterval(iv);
  }, 90);

  try {
    const params = new URLSearchParams({
      q:          query,
      brand,
      model,
      yearMin,
      yearMax,
      kmMax,
      budgetMax,
      volant:     volantFilter,
      sources:    [...activeSources].join(','),
    });

    const res  = await fetch(`${BACKEND_URL}/api/search?${params}`);
    const data = await res.json();
    currentResults = data.results || [];

    // Merge with locally saved car data if backend not yet connected
    if (!res.ok || currentResults.length === 0) {
      currentResults = filterLocalCars({ query, brand, model, yearMin, yearMax, kmMax, budgetMax });
    }

  } catch (err) {
    // Fallback to demo data if backend not reachable
    console.warn('Backend not reachable, using demo data:', err);
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

// Fallback local filter used when backend is not yet connected
function filterLocalCars({ query, brand, model, yearMin, yearMax, kmMax, budgetMax }) {
  return DEMO_CARS.filter(c => {
    if (!activeSources.has(c.source)) return false;
    if (query  && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (brand  && c.brand.toLowerCase() !== brand.toLowerCase()) return false;
    if (model  && c.model.toLowerCase() !== model.toLowerCase()) return false;
    if (yearMin && c.year < parseInt(yearMin)) return false;
    if (yearMax && c.year > parseInt(yearMax)) return false;
    if (kmMax   && c.km   > parseInt(kmMax))   return false;
    if (budgetMax && c.price > parseInt(budgetMax)) return false;
    if (volantFilter !== 'all' && c.volant !== volantFilter) return false;
    return true;
  });
}

// ─── RENDER RESULTS ──────────────────────────────────────────

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
         style="animation-delay:${i*0.04}s" onclick="openModal('${c.id}')">
      <div class="car-img-block">
        ${c.imageUrl
          ? `<img src="${c.imageUrl}" alt="${c.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
          : `<span>${c.icon}</span>`}
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
          <span class="meta-pill" style="color:rgba(240,237,232,0.3)">
            <i class="ti ti-database"></i>${getSrcLabel(c.source)}
          </span>
        </div>
      </div>
      <div class="car-right">
        <div>
          <div class="car-price">${c.price.toLocaleString('fr-FR')} €</div>
          <div class="car-price-local">${c.local || ''}</div>
        </div>
        <button class="btn-fav ${favorites.has(c.id)?'active':''}" onclick="toggleFav(event,${c.id})">
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

// ─── MODAL ───────────────────────────────────────────────────

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
        ? `<img src="${c.imageUrl}" alt="${c.name}" style="width:100%;max-height:220px;object-fit:cover;border-radius:8px">`
        : `<span style="font-size:64px">${c.icon}</span>`}
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
      <tr><td>Transmission</td><td>${c.trans || 'N/A'}</td></tr>
      <tr><td>Carburant</td><td>${c.carbu || 'N/A'}</td></tr>
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
      ${c.listingUrl ? `<a class="btn-primary" href="${c.listingUrl}" target="_blank" rel="noopener" style="text-decoration:none;display:flex;align-items:center;gap:6px">
        <i class="ti ti-external-link"></i> Voir l'annonce
      </a>` : `<button class="btn-primary" onclick="analyzeImport('${c.id}')">
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

// ─── FAVORITES ───────────────────────────────────────────────

function toggleFav(e, id) {
  e.stopPropagation();
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
    const car = currentResults.find(c => c.id === id);
    if (car && !savedCars.find(c => c.id === id)) {
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
      <button class="btn-export" onclick="analyzeAll()"><i class="ti ti-chart-bar"></i>Comparer</button>
    </div>
    <div class="fav-summary">
      <div><div class="fav-stat-label">Véhicules</div><div class="fav-stat-val">${favCars.length}</div></div>
      <div><div class="fav-stat-label">Valeur totale</div><div class="fav-stat-val">${totalVal.toLocaleString('fr-FR')} €</div></div>
      <div><div class="fav-stat-label">KM moyen</div><div class="fav-stat-val">${avgKm.toLocaleString('fr-FR')}</div></div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${favCars.map(c => `
        <div class="car-card is-fav" onclick="openModal(${c.id})">
          <div class="car-img-block">
            <span>${c.icon}</span>
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
            <button class="btn-fav active" onclick="removeFav(event,${c.id})">
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
  const text = favCars.map((c,i) =>
    `${i+1}. ${c.name} — ${c.year} — ${c.km.toLocaleString('fr-FR')} km — ${c.price.toLocaleString('fr-FR')} € — Volant ${c.volant==='right'?'droite':'gauche'} — ${getSrcLabel(c.source)}`
  ).join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'oitaku-favoris.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function analyzeAll() {
  alert('Connectez Claude Code pour activer cette fonction d\'analyse comparative.');
}

// ─── ALERTS ──────────────────────────────────────────────────

async function saveAlert() {
  const email = prompt('Entrez votre email pour recevoir les alertes :');
  if (!email || !email.includes('@')) return;

  const query     = document.getElementById('queryInput').value.trim();
  const brand     = document.getElementById('brandFilter').value;
  const model     = document.getElementById('modelFilter').value;
  const yearMin   = parseInt(document.getElementById('yearFilter').value) || 0;
  const yearMax   = parseInt(document.getElementById('yearMaxFilter').value) || 9999;
  const kmMax     = parseInt(document.getElementById('kmFilter').value) || 999999;
  const budgetMax = parseInt(document.getElementById('budgetFilter').value) || 999999;

  try {
    const res = await fetch(`${BACKEND_URL}/api/alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, query, brand, model, yearMin, yearMax, kmMax, budgetMax,
        volant: volantFilter,
        sources: [...activeSources],
      }),
    });
    const data = await res.json();
    if (data.success) {
      alert(`Alerte créée ! Vous recevrez un email à ${email} dès qu'une nouvelle annonce correspondra.`);
      document.getElementById('alertBanner').style.display = 'none';
    } else {
      alert('Erreur : ' + (data.error || 'Impossible de créer l\'alerte'));
    }
  } catch (err) {
    alert('Backend non connecté — alerte non sauvegardée. Déployez d\'abord le backend sur Railway.');
  }
}

// ─── IMPORT ANALYSIS ─────────────────────────────────────────

function analyzeImport(id) {
  const c = [...currentResults, ...savedCars].find(x => String(x.id) === String(id));
  if (!c) return;
  document.getElementById('modalOverlay').classList.remove('open');
  alert(`Analyse d'import pour : ${c.name}\nConnectez le backend pour activer cette fonction.`);
}

// ─── DEMO DATA (fallback when backend not connected) ──────────

const DEMO_CARS = [
  {id:1,  name:"Nissan Skyline GT-R R34",       brand:"Nissan",    model:"Skyline GT-R",    year:2000,km:72000, price:38500,local:"¥6,200,000", grade:"S",  source:"uss",        country:"jp",icon:"🏎️",type:"auction",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:280},
  {id:2,  name:"Toyota Supra MK4 RZ",           brand:"Toyota",    model:"Supra",           year:1997,km:95000, price:55000,local:"¥8,900,000", grade:"A",  source:"taa",        country:"jp",icon:"🚗",type:"auction",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:320},
  {id:3,  name:"Honda NSX Type R",              brand:"Honda",     model:"NSX",             year:2002,km:48000, price:82000,local:"¥13,200,000",grade:"S+", source:"caa",        country:"jp",icon:"🏎️",type:"auction",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:290},
  {id:4,  name:"Mazda RX-7 FD3S Spirit R",      brand:"Mazda",     model:"RX-7",            year:2002,km:61000, price:44000,local:"¥7,100,000", grade:"A",  source:"carsensor",  country:"jp",icon:"🚗",type:"occasion",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:255},
  {id:5,  name:"Mitsubishi Lancer Evo IX MR",   brand:"Mitsubishi",model:"Lancer Evo",      year:2006,km:85000, price:22000,local:"¥3,500,000", grade:"B+", source:"yahoo-jp",   country:"jp",icon:"🚙",type:"auction",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:280},
  {id:6,  name:"Subaru Impreza WRX STI RA",     brand:"Subaru",    model:"Impreza WRX STI", year:2001,km:112000,price:18500,local:"¥2,980,000", grade:"B",  source:"goo-net",    country:"jp",icon:"🚙",type:"occasion",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:280},
  {id:7,  name:"Honda S2000 AP2",               brand:"Honda",     model:"S2000",           year:2005,km:62000, price:28000,local:"¥4,500,000", grade:"A",  source:"sbt",        country:"jp",icon:"🏎️",type:"occasion",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:240},
  {id:8,  name:"Nissan Silvia S15 Spec R",       brand:"Nissan",    model:"Silvia",          year:2001,km:67000, price:21000,local:"¥3,380,000", grade:"A",  source:"beforward",  country:"jp",icon:"🏎️",type:"occasion",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:250},
  {id:9,  name:"Toyota Celica GT-Four ST205",   brand:"Toyota",    model:"Celica",          year:1995,km:97000, price:17500,local:"¥2,820,000", grade:"B+", source:"cardealpage",country:"jp",icon:"🚗",type:"occasion",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:255},
  {id:10, name:"Nissan GT-R R35 Black Edition", brand:"Nissan",    model:"GT-R R35",        year:2015,km:38000, price:68000,local:"¥10,900,000",grade:"A+", source:"uss",        country:"jp",icon:"🏎️",type:"auction",volant:"right",trans:"Automatique", carbu:"Essence",   cv:550},
  {id:11, name:"Lexus LFA",                     brand:"Lexus",     model:"LFA",             year:2012,km:9000,  price:395000,local:"¥63,700,000",grade:"S+",source:"taa",        country:"jp",icon:"🏎️",type:"auction",volant:"right",trans:"Séquentielle",carbu:"Essence",   cv:560},
  {id:12, name:"Hyundai Genesis Coupe 3.8 V6",  brand:"Hyundai",   model:"Genesis Coupe",   year:2012,km:68000, price:12000,local:"₩18,000,000",grade:"B+", source:"encar",      country:"kr",icon:"🚗",type:"occasion",volant:"left", trans:"Manuelle",    carbu:"Essence",   cv:306},
  {id:13, name:"Kia Stinger GT 3.3T AWD",       brand:"Kia",       model:"Stinger",         year:2018,km:42000, price:24500,local:"₩36,500,000",grade:"A",  source:"kcar",       country:"kr",icon:"🚗",type:"occasion",volant:"left", trans:"Automatique", carbu:"Essence",   cv:370},
  {id:14, name:"Hyundai i30N Performance",      brand:"Hyundai",   model:"i30N",            year:2021,km:19000, price:21000,local:"₩31,000,000",grade:"A+", source:"autobell",   country:"kr",icon:"🚙",type:"auction",volant:"left", trans:"Manuelle",    carbu:"Essence",   cv:280},
  {id:15, name:"Genesis G70 Sport 2.0T",        brand:"Genesis",   model:"G70",             year:2020,km:31000, price:26000,local:"₩38,700,000",grade:"A",  source:"encar",      country:"kr",icon:"🚗",type:"occasion",volant:"left", trans:"Automatique", carbu:"Essence",   cv:245},
  {id:16, name:"Kia EV6 GT AWD",               brand:"Kia",       model:"EV6",             year:2022,km:14000, price:32000,local:"₩47,500,000",grade:"S",  source:"lotte",      country:"kr",icon:"🚗",type:"auction",volant:"left", trans:"Automatique", carbu:"Électrique",cv:585},
  {id:17, name:"Hyundai Sonata N Line",         brand:"Hyundai",   model:"Sonata",          year:2021,km:22000, price:17000,local:"₩25,200,000",grade:"A",  source:"heydealer",  country:"kr",icon:"🚙",type:"auction",volant:"left", trans:"Automatique", carbu:"Essence",   cv:180},
  {id:18, name:"Genesis GV80 3.5T AWD",         brand:"Genesis",   model:"GV80",            year:2021,km:25000, price:45000,local:"₩66,700,000",grade:"A+", source:"ajsellcar",  country:"kr",icon:"🚘",type:"auction",volant:"left", trans:"Automatique", carbu:"Essence",   cv:380},
  {id:19, name:"Toyota Land Cruiser 200 Export",brand:"Toyota",    model:"Land Cruiser",    year:2019,km:55000, price:58000,local:"¥9,350,000", grade:"A",  source:"beforward",  country:"jp",icon:"🚘",type:"occasion",volant:"left", trans:"Automatique", carbu:"Diesel",    cv:190},
  {id:20, name:"Mazda MX-5 NA Roadster",        brand:"Mazda",     model:"MX-5",            year:1993,km:74000, price:9800, local:"¥1,580,000", grade:"B+", source:"ju",         country:"jp",icon:"🚗",type:"auction",volant:"right",trans:"Manuelle",    carbu:"Essence",   cv:115},
];

// ─── INIT ────────────────────────────────────────────────────

document.getElementById('queryInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch();
});

updateFavCount();
renderSourcesGrid();
