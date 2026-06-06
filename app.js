/* ============================================================
   WM 2026 Länder-Lexikon – App-Logik
   ============================================================ */

'use strict';

// Aktueller Zustand
let aktiveGruppe = 'alle';
let aktivesLand = null;
let aktiverTab = 'land';
let audioSpielt = false;

// DOM-Elemente
const mainContent  = document.getElementById('main-content');
const modal        = document.getElementById('country-modal');
const modalOverlay = document.getElementById('modal-overlay');
const modalBack    = document.getElementById('modal-back-btn');
const modalFlag    = document.getElementById('modal-flag');
const modalName    = document.getElementById('modal-land-name');
const modalSpitz   = document.getElementById('modal-spitzname');
const modalBadge   = document.getElementById('modal-gruppe-badge');
const modalTabs    = document.getElementById('modal-tabs');
const modalBody    = document.getElementById('modal-body');
const audioEl      = document.getElementById('global-audio');

// Gruppen-Reihenfolge
const GRUPPEN_ORDER = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// ============================================================
// INITIALISIERUNG
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  updateHeaderHeight();
  setupNavigation();
  renderHauptinhalt('alle');
  setupModalEvents();
  // Hash-Routing bei Seitenaufruf
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
  // Header-Höhe bei Größenänderung neu berechnen
  const header = document.getElementById('site-header');
  if (header && window.ResizeObserver) {
    new ResizeObserver(updateHeaderHeight).observe(header);
  }
});

function updateHeaderHeight() {
  const header = document.getElementById('site-header');
  if (header) {
    document.documentElement.style.setProperty(
      '--header-height', header.offsetHeight + 'px'
    );
  }
}

function handleHashChange() {
  const hash = window.location.hash.slice(1);
  if (!hash) return;
  if (hash.startsWith('land-')) {
    const landId = hash.slice(5);
    if (WM_LAENDER[landId]) {
      oeffneModal(landId);
    }
  } else if (hash.startsWith('gruppe-')) {
    const g = hash.slice(7).toUpperCase();
    setAktiveGruppe(g);
  }
}

// ============================================================
// NAVIGATION
// ============================================================

function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const gruppe = btn.dataset.gruppe;
      setAktiveGruppe(gruppe);
    });
  });
}

function setAktiveGruppe(gruppe) {
  aktiveGruppe = gruppe;
  // Aktiven Button markieren
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const aktiv = btn.dataset.gruppe === gruppe;
    btn.classList.toggle('active', aktiv);
    btn.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
  });
  // Nav-Button in Sicht scrollen
  const aktivBtn = document.querySelector(`.nav-btn[data-gruppe="${gruppe}"]`);
  if (aktivBtn) aktivBtn.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
  // Inhalt rendern
  renderHauptinhalt(gruppe);
  // Nach oben scrollen
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
// HAUPTINHALT RENDERN
// ============================================================

function renderHauptinhalt(gruppe) {
  mainContent.innerHTML = '';

  if (gruppe === 'alle') {
    GRUPPEN_ORDER.forEach(g => {
      const section = erstelleGruppenSection(g);
      mainContent.appendChild(section);
    });
  } else {
    const section = erstelleGruppenSection(gruppe, true);
    mainContent.appendChild(section);
  }
}

function erstelleGruppenSection(gruppe, einzelansicht = false) {
  const section = document.createElement('section');
  section.className = 'gruppen-section';
  section.id = `gruppe-${gruppe}`;

  // Header
  const header = document.createElement('div');
  header.className = 'gruppen-header';
  header.innerHTML = `
    <h2>Gruppe ${gruppe}</h2>
    <div class="gruppen-trennlinie"></div>
  `;
  section.appendChild(header);

  // Grid
  const grid = document.createElement('div');
  grid.className = 'laender-grid' + (einzelansicht ? ' single-gruppe' : '');

  const laenderIds = WM_GRUPPEN[gruppe] || [];
  laenderIds.forEach(landId => {
    const land = WM_LAENDER[landId];
    if (land) {
      const karte = erstelleLandKarte(land);
      grid.appendChild(karte);
    }
  });

  section.appendChild(grid);
  return section;
}

function erstelleLandKarte(land) {
  const btn = document.createElement('button');
  btn.className = 'land-karte';
  btn.setAttribute('aria-label', `${land.land} – Gruppe ${land._gruppe} – Mehr erfahren`);

  const assets = land._assets || {};
  const spitzname = land.spitzname || '';
  const landname = land.land || land._id;

  btn.innerHTML = `
    <div class="land-flagge-wrapper">
      <img src="${assets.flagge || ''}"
           alt="Flagge von ${landname}"
           loading="lazy"
           onerror="this.style.display='none'">
    </div>
    <div class="land-info">
      <div class="land-name">${landname}</div>
      ${spitzname ? `<div class="land-spitzname">${spitzname}</div>` : ''}
      <div class="land-gruppe-badge">Gruppe ${land._gruppe}</div>
    </div>
  `;

  btn.addEventListener('click', () => oeffneModal(land._id));
  return btn;
}

// ============================================================
// MODAL ÖFFNEN / SCHLIESSEN
// ============================================================

function oeffneModal(landId) {
  const land = WM_LAENDER[landId];
  if (!land) return;

  aktivesLand = landId;
  aktiverTab = 'land';

  // Header befüllen
  const assets = land._assets || {};
  modalFlag.src = assets.flagge || '';
  modalFlag.alt = `Flagge von ${land.land}`;
  modalName.textContent = land.land || landId;
  modalSpitz.textContent = land.spitzname || '';
  modalBadge.textContent = `Gruppe ${land._gruppe}`;

  // Tab zurücksetzen
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const aktiv = btn.dataset.tab === 'land';
    btn.classList.toggle('active', aktiv);
    btn.setAttribute('aria-selected', aktiv ? 'true' : 'false');
  });

  // Inhalt rendern
  renderTab('land', land);

  // Modal anzeigen
  modal.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  // Fokus setzen
  setTimeout(() => modalBack.focus(), 100);

  // Hash aktualisieren (ohne scrolling)
  history.pushState(null, '', `#land-${landId}`);

  // Audio stoppen
  stoppeAudio();
}

function schliesseModal() {
  modal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  aktivesLand = null;
  stoppeAudio();
  history.pushState(null, '', window.location.pathname);
}

function setupModalEvents() {
  // Schließen via Overlay-Klick
  modalOverlay.addEventListener('click', schliesseModal);
  // Schließen via Zurück-Button
  modalBack.addEventListener('click', schliesseModal);
  // Schließen via Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
      schliesseModal();
    }
  });
  // Tab-Navigation
  modalTabs.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!aktivesLand) return;
      const tab = btn.dataset.tab;
      // Hymne: Audio bei Tab-Wechsel stoppen
      if (aktiverTab === 'hymne' && tab !== 'hymne') {
        stoppeAudio();
      }
      aktiverTab = tab;
      modalTabs.querySelectorAll('.tab-btn').forEach(b => {
        const aktiv = b.dataset.tab === tab;
        b.classList.toggle('active', aktiv);
        b.setAttribute('aria-selected', aktiv ? 'true' : 'false');
      });
      renderTab(tab, WM_LAENDER[aktivesLand]);
      modalBody.scrollTop = 0;
    });
  });
}

// ============================================================
// TAB-INHALT RENDERN
// ============================================================

function renderTab(tab, land) {
  switch (tab) {
    case 'land':       modalBody.innerHTML = renderLandTab(land); break;
    case 'team':       modalBody.innerHTML = renderTeamTab(land); break;
    case 'karte':      modalBody.innerHTML = renderBildTab(land, 'karte'); break;
    case 'hauptstadt': modalBody.innerHTML = renderHauptstadtTab(land); break;
    case 'trikot':     modalBody.innerHTML = renderTrikotTab(land); break;
    case 'hymne':      renderHymneTab(land); break;
  }
}

// --- Land-Tab ---
function renderLandTab(land) {
  const sb = land.steckbrief || {};
  const wiss = land.wissenswertes || {};
  const hs = land.hauptstadt || {};
  const assets = land._assets || {};

  const sprache = sb.sprache || (Array.isArray(sb.sprachen) ? sb.sprachen.join(', ') : (sb.sprachen || '–'));
  const nachbarn = Array.isArray(sb.nachbarn) ? sb.nachbarn.join(', ') : (sb.nachbarn || '–');
  const bekanntFuer = Array.isArray(sb.bekannt_fuer) ? sb.bekannt_fuer : [];
  const wahrzeichen = Array.isArray(hs.wahrzeichen) ? hs.wahrzeichen : [];

  const bekanntTags = bekanntFuer.map(b => `<span class="tag">${b}</span>`).join('');
  const wahrzeichenItems = wahrzeichen.map(w => `<li>${w}</li>`).join('');

  const flaggeBeschreibung = land.flagge ? `
    <div class="info-karte">
      <h3><span class="section-icon">🏳️</span> Die Flagge</h3>
      <img src="${assets.flagge}" alt="Flagge von ${land.land}"
           style="width:180px;border-radius:6px;box-shadow:var(--schatten);margin-bottom:12px"
           loading="lazy" onerror="this.style.display='none'">
      <p class="wissenstext">${land.flagge}</p>
    </div>` : '';

  const kurzFakt = wiss.kurz ? `<div class="kurz-fakt">💡 ${wiss.kurz}</div>` : '';
  const langText = wiss.lang ? `<p class="wissenstext">${wiss.lang}</p>` : '';

  const steckbriefRows = [
    ['🏙️ Hauptstadt', hs.name || sb.hauptstadt || '–'],
    ['👥 Einwohner', sb.einwohner || '–'],
    ['🗣️ Sprache(n)', sprache],
    ['💰 Währung', sb.waehrung || '–'],
    ['📍 Lage', sb.lage || '–'],
    ['🌍 Nachbarn', nachbarn],
  ].map(([label, wert]) => `
    <span class="steckbrief-label">${label}</span>
    <span class="steckbrief-wert">${wert}</span>
  `).join('');

  return `
    ${kurzFakt ? `<div class="info-karte" style="padding:14px">${kurzFakt}</div>` : ''}

    <div class="info-karte">
      <h3><span class="section-icon">📋</span> Steckbrief</h3>
      <div class="steckbrief-grid">${steckbriefRows}</div>
      ${bekanntTags ? `<div style="margin-top:14px"><strong style="font-size:.85rem;color:var(--text-mid)">Bekannt für:</strong><div class="tag-liste" style="margin-top:6px">${bekanntTags}</div></div>` : ''}
    </div>

    ${langText ? `<div class="info-karte"><h3><span class="section-icon">📖</span> Wissenswertes</h3>${langText}</div>` : ''}

    ${flaggeBeschreibung}
  `;
}

// --- Team-Tab ---
function renderTeamTab(land) {
  const wm = land.wm_2026 || {};
  const stars = Array.isArray(wm.stars) ? wm.stars : [];
  const trainer = wm.trainer || {};
  const gegner = Array.isArray(wm.gruppenGegner) ? wm.gruppenGegner : [];
  const spielorte = wm.spielorte || {};
  const spieltermine = wm.spieltermine || {};

  // Spielplan
  const spieleRows = gegner.map(g => `
    <tr>
      <td><strong>vs. ${g}</strong></td>
      <td>${spieltermine[g] || '–'}</td>
      <td style="color:var(--text-light);font-size:.82rem">${spielorte[g] || '–'}</td>
    </tr>
  `).join('');

  // Spieler-Karten
  const spielerCards = stars.map(s => `
    <div class="spieler-karte">
      <div class="spieler-name">${s.name || '–'}</div>
      <div class="spieler-position">${s.position || ''}</div>
      <div class="spieler-verein">${s.verein || ''}</div>
      <div class="spieler-rolle">${s.rolle || ''}</div>
    </div>
  `).join('');

  // WM-Statistiken
  const teilnahmen = wm.teilnahmen_gesamt != null ? wm.teilnahmen_gesamt : '–';
  const titel = wm.wm_titel != null ? wm.wm_titel : '–';
  const titelJahre = Array.isArray(wm.wm_titel_jahre) ? wm.wm_titel_jahre.join(', ') : '';
  const bestes = wm.bestes_ergebnis || '–';
  const letztesTurnier = wm.letztes_turnier || {};

  const trainerBlock = trainer.name ? `
    <div class="info-karte">
      <h3><span class="section-icon">🧑‍💼</span> Trainer</h3>
      <div class="trainer-karte">
        <div class="trainer-symbol">🏆</div>
        <div>
          <div class="trainer-name">${trainer.name}</div>
          <div class="trainer-nation">${trainer.nationalitaet || ''}</div>
          <div class="trainer-besonderheit">${trainer.besonderheit || ''}</div>
        </div>
      </div>
    </div>` : '';

  const kapitaen = wm.kapitaen ? `<p style="font-size:.9rem;color:var(--text-mid);margin-bottom:8px">🎗️ Kapitän: <strong>${wm.kapitaen}</strong></p>` : '';

  const besonderheit = wm.besonderheit ? `
    <div class="kurz-fakt" style="margin-bottom:0">⭐ ${wm.besonderheit}</div>` : '';

  const funFact = wm.fun_fact ? `
    <div class="info-karte">
      <div class="fun-fact-box">
        <strong>💡 Wusstest du?</strong>
        ${wm.fun_fact}
      </div>
    </div>` : '';

  const qualifikation = wm.qualifikation || {};
  const qualBlock = qualifikation.beschreibung ? `
    <div class="info-karte">
      <h3><span class="section-icon">🎟️</span> Qualifikation</h3>
      <p class="wissenstext">${qualifikation.beschreibung}</p>
    </div>` : '';

  const letztesTurnierBlock = letztesTurnier.beschreibung ? `
    <div style="margin-top:10px;padding:10px;background:var(--bg);border-radius:var(--radius)">
      <strong style="font-size:.85rem">Letztes Turnier (${letztesTurnier.jahr || ''}): </strong>
      <span style="font-size:.85rem">${letztesTurnier.ergebnis || ''}</span>
      <p style="font-size:.82rem;color:var(--text-mid);margin-top:4px">${letztesTurnier.beschreibung || ''}</p>
    </div>` : '';

  return `
    <div class="info-karte">
      <h3><span class="section-icon">⚽</span> WM 2026 – Gruppe ${land._gruppe}</h3>
      ${besonderheit}
      ${kapitaen}
      ${spieleRows ? `
        <table class="spiele-tabelle" style="margin-top:10px">
          <thead><tr><th>Gegner</th><th>Datum</th><th>Ort</th></tr></thead>
          <tbody>${spieleRows}</tbody>
        </table>` : ''}
    </div>

    ${trainerBlock}

    ${stars.length ? `
    <div class="info-karte">
      <h3><span class="section-icon">⭐</span> Starke Spieler</h3>
      <div class="spieler-grid">${spielerCards}</div>
    </div>` : ''}

    <div class="info-karte">
      <h3><span class="section-icon">📊</span> WM-Geschichte</h3>
      <div class="wm-stats">
        <div class="stat-chip">
          <span class="stat-zahl">${teilnahmen}</span>
          <span class="stat-label">WM-Teil&shy;nahmen</span>
        </div>
        <div class="stat-chip">
          <span class="stat-zahl">${titel}</span>
          <span class="stat-label">WM-Titel${titelJahre ? `<br><small>${titelJahre}</small>` : ''}</span>
        </div>
        <div class="stat-chip" style="min-width:140px">
          <span class="stat-zahl" style="font-size:1rem;padding-top:4px">${bestes}</span>
          <span class="stat-label">Bestes Ergebnis</span>
        </div>
      </div>
      ${letztesTurnierBlock}
    </div>

    ${qualBlock}

    ${funFact}
  `;
}

// --- Hauptstadt-Tab ---
function renderHauptstadtTab(land) {
  const hs = land.hauptstadt || {};
  const assets = land._assets || {};
  const wahrzeichen = Array.isArray(hs.wahrzeichen) ? hs.wahrzeichen : [];
  const wahrzeichenItems = wahrzeichen.map(w => `<li>${w}</li>`).join('');

  const postkarte = assets.postkarte ? `
    <div class="bild-container" style="margin-bottom:16px">
      <img src="${assets.postkarte}"
           alt="Postkarte aus ${hs.name || land.land}"
           loading="lazy" onerror="this.style.display='none'">
      <p class="bild-caption">📮 Postkarte aus <strong>${hs.name || land.land}</strong></p>
    </div>` : '';

  const infos = [];
  if (hs.einwohner) infos.push(['👥 Einwohner', hs.einwohner]);
  if (hs.fluss)     infos.push(['🌊 Fluss', hs.fluss]);
  const infoRows = infos.map(([l, w]) => `
    <span class="steckbrief-label">${l}</span>
    <span class="steckbrief-wert">${w}</span>`).join('');

  const infoBlock = (hs.beschreibung || infos.length || wahrzeichen.length) ? `
    <div class="info-karte">
      <h3><span class="section-icon">🏙️</span> ${hs.name || 'Hauptstadt'}</h3>
      ${infos.length ? `<div class="steckbrief-grid" style="margin-bottom:12px">${infoRows}</div>` : ''}
      ${hs.beschreibung ? `<p class="wissenstext">${hs.beschreibung}</p>` : ''}
      ${wahrzeichen.length ? `
        <p style="font-weight:700;font-size:.85rem;color:var(--text-mid);margin:12px 0 6px">Sehenswürdigkeiten:</p>
        <ul class="wahrzeichen-liste">${wahrzeichenItems}</ul>` : ''}
    </div>` : '';

  return postkarte + infoBlock;
}

// --- Bild-Tab (Karte) ---
function renderBildTab(land, typ) {
  const assets = land._assets || {};
  const src = assets[typ] || '';

  let caption = '';
  if (typ === 'karte') {
    caption = `Politische Karte von ${land.land}`;
  }

  return `
    <div class="bild-container">
      <img src="${src}" alt="${caption}" loading="lazy" onerror="this.style.display='none'">
      ${caption ? `<p class="bild-caption">${caption}</p>` : ''}
    </div>
  `;
}

// --- Trikot-Tab ---
function renderTrikotTab(land) {
  const assets = land._assets || {};
  const src = assets.trikot || '';
  return `
    <div style="text-align:center;margin-bottom:16px">
      <h3 style="color:var(--gruen-dark);font-size:1.1rem;margin-bottom:4px">Das Trikot von ${land.land}</h3>
      <p style="color:var(--text-light);font-size:.85rem;font-style:italic">WM 2026</p>
    </div>
    <div class="trikot-container">
      <img src="${src}" alt="Trikot von ${land.land}" loading="lazy" onerror="this.style.display='none'">
    </div>
  `;
}

// --- Hymnen-Tab ---
function renderHymneTab(land) {
  const assets = land._assets || {};
  const hymneSrc = assets.hymne;

  if (!hymneSrc) {
    modalBody.innerHTML = `
      <div class="keine-hymne-box">
        <span class="keine-hymne-icon">🎵</span>
        <p>
          <strong>Keine Hymne verfügbar</strong><br><br>
          Aus Urheberrechtsgründen können wir die Nationalhymne von
          <strong>${land.land}</strong> leider nicht abspielen.
        </p>
      </div>
    `;
    return;
  }

  modalBody.innerHTML = `
    <div class="hymne-container">
      <img src="${assets.flagge || ''}" alt="Flagge von ${land.land}" class="hymne-flag-gross" loading="lazy">
      <div class="hymne-titel">Nationalhymne von ${land.land}</div>
      <button class="play-btn" id="hymne-play-btn" aria-label="Hymne abspielen">
        ▶
      </button>
      <p class="hymne-status" id="hymne-status">Auf ▶ drücken zum Abspielen</p>
    </div>
  `;

  const playBtn = document.getElementById('hymne-play-btn');
  const statusEl = document.getElementById('hymne-status');

  // Audio konfigurieren
  audioEl.src = hymneSrc;
  audioEl.load();

  function updatePlayState() {
    if (audioSpielt) {
      playBtn.textContent = '⏸';
      playBtn.classList.add('playing');
      playBtn.setAttribute('aria-label', 'Hymne pausieren');
      statusEl.textContent = '▶ Hymne wird abgespielt …';
    } else {
      playBtn.textContent = '▶';
      playBtn.classList.remove('playing');
      playBtn.setAttribute('aria-label', 'Hymne abspielen');
      statusEl.textContent = 'Auf ▶ drücken zum Abspielen';
    }
  }

  playBtn.addEventListener('click', () => {
    if (audioSpielt) {
      audioEl.pause();
      audioSpielt = false;
    } else {
      audioEl.play().then(() => {
        audioSpielt = true;
        updatePlayState();
      }).catch(err => {
        statusEl.textContent = 'Wiedergabe konnte nicht gestartet werden.';
        console.warn('Audio play error:', err);
      });
    }
    updatePlayState();
  });

  audioEl.onended = () => {
    audioSpielt = false;
    updatePlayState();
  };

  audioEl.onpause = () => {
    audioSpielt = false;
    updatePlayState();
  };
}

function stoppeAudio() {
  if (!audioEl.paused) {
    audioEl.pause();
    audioEl.currentTime = 0;
  }
  audioSpielt = false;
}
