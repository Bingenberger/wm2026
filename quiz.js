/* ============================================================
   WM 2026 – Quiz-Modul
   ============================================================ */

'use strict';

// ---- Zustand ----
let quizFragen      = [];
let quizIndex       = 0;
let quizPunkte      = 0;
let quizGeantwortet = false;

const TYP_LABEL = {
  flagge:     '🏳️ Flaggen-Quiz',
  trikot:     '👕 Trikot-Quiz',
  hauptstadt: '🏙️ Hauptstadt-Quiz',
  spieler:    '⭐ Spieler-Quiz',
};

// ---- DOM aufbauen ----
function initQuiz() {
  const section = document.createElement('section');
  section.id = 'quiz-section';
  section.hidden = true;
  section.innerHTML = `
    <div id="quiz-start-screen">
      <div class="quiz-card quiz-hero">
        <div class="quiz-hero-icon">🎯</div>
        <h2 class="quiz-hero-titel">WM-Quiz</h2>
        <p class="quiz-hero-sub">Teste dein Wissen über die WM 2026!</p>
        <div class="quiz-kat-grid">
          <span class="quiz-kat-chip">🏳️ Flaggen</span>
          <span class="quiz-kat-chip">👕 Trikots</span>
          <span class="quiz-kat-chip">🏙️ Hauptstädte</span>
          <span class="quiz-kat-chip">⭐ Spieler</span>
        </div>
        <p class="quiz-meta">10 Fragen · 4 Antwortmöglichkeiten</p>
        <button class="quiz-primary-btn" id="quiz-start-btn">Jetzt starten! 🚀</button>
      </div>
    </div>

    <div id="quiz-question-screen" hidden>
      <div class="quiz-progress-wrap">
        <div class="quiz-progress-bg">
          <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
        </div>
        <span class="quiz-progress-text" id="quiz-progress-text">Frage 1 von 10</span>
      </div>
      <div class="quiz-card" id="quiz-question-card">
        <div class="quiz-typ-badge" id="quiz-typ-badge"></div>
        <div class="quiz-bild-wrap" id="quiz-bild-wrap" hidden></div>
        <p class="quiz-frage-text" id="quiz-frage-text"></p>
        <div class="quiz-antworten" id="quiz-antworten"></div>
        <button class="quiz-primary-btn" id="quiz-weiter-btn" hidden>Weiter →</button>
      </div>
    </div>

    <div id="quiz-result-screen" hidden>
      <div class="quiz-card quiz-result-card">
        <div class="quiz-result-emoji" id="quiz-result-emoji"></div>
        <h2 class="quiz-result-titel">Quiz beendet!</h2>
        <div class="quiz-result-score" id="quiz-result-score"></div>
        <p class="quiz-result-text" id="quiz-result-text"></p>
        <button class="quiz-primary-btn" id="quiz-nochmal-btn">🔄 Nochmal spielen</button>
        <button class="quiz-secondary-btn" id="quiz-result-back-btn">← Zurück zu den Ländern</button>
      </div>
    </div>
  `;

  document.getElementById('main-content').insertAdjacentElement('afterend', section);

  document.getElementById('quiz-start-btn').addEventListener('click',      quizStarten);
  document.getElementById('quiz-weiter-btn').addEventListener('click',     quizWeiter);
  document.getElementById('quiz-nochmal-btn').addEventListener('click',    quizStarten);
  document.getElementById('quiz-result-back-btn').addEventListener('click', quizVerlassen);
}

// ---- Navigation ----
function quizOeffnen() {
  document.getElementById('main-content').hidden = true;
  document.getElementById('quiz-section').hidden = false;
  document.querySelectorAll('.nav-btn').forEach(b => {
    const aktiv = b.dataset.gruppe === 'quiz';
    b.classList.toggle('active', aktiv);
    b.setAttribute('aria-pressed', aktiv ? 'true' : 'false');
  });
  zeigeScreen('start');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function quizVerlassen() {
  document.getElementById('quiz-section').hidden = true;
  document.getElementById('main-content').hidden = false;
  setAktiveGruppe(aktiveGruppe);   // aus app.js
}

function zeigeScreen(name) {
  ['start', 'question', 'result'].forEach(s => {
    document.getElementById(`quiz-${s}-screen`).hidden = s !== name;
  });
}

// ---- Quiz-Ablauf ----
function quizStarten() {
  quizFragen = generiereFragenliste();
  quizIndex  = 0;
  quizPunkte = 0;
  zeigeScreen('question');
  zeigeFrage();
}

function quizWeiter() {
  quizIndex++;
  if (quizIndex >= quizFragen.length) {
    zeigeErgebnis();
  } else {
    zeigeFrage();
  }
}

function zeigeFrage() {
  quizGeantwortet = false;
  const frage = quizFragen[quizIndex];
  const total  = quizFragen.length;

  // Fortschrittsbalken
  document.getElementById('quiz-progress-fill').style.width =
    (quizIndex / total * 100) + '%';
  document.getElementById('quiz-progress-text').textContent =
    `Frage ${quizIndex + 1} von ${total}`;

  // Kategorie-Badge
  document.getElementById('quiz-typ-badge').textContent = TYP_LABEL[frage.typ] || '';

  // Bild (Flagge / Trikot)
  const bildWrap = document.getElementById('quiz-bild-wrap');
  if (frage.bild) {
    const css = frage.typ === 'trikot' ? 'quiz-img-trikot' : 'quiz-img-flagge';
    bildWrap.innerHTML =
      `<img src="${frage.bild}" alt="" class="${css}" loading="eager">`;
    bildWrap.hidden = false;
  } else {
    bildWrap.innerHTML = '';
    bildWrap.hidden = true;
  }

  // Frage-Text
  document.getElementById('quiz-frage-text').textContent = frage.frage;

  // Antwort-Buttons
  const container = document.getElementById('quiz-antworten');
  container.innerHTML = '';
  frage.optionen.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'quiz-antwort-btn';
    btn.textContent = opt;
    btn.dataset.option = opt;
    btn.addEventListener('click', () => antwortWaehlen(opt, frage.richtig));
    container.appendChild(btn);
  });

  document.getElementById('quiz-weiter-btn').hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function antwortWaehlen(gewählt, richtig) {
  if (quizGeantwortet) return;
  quizGeantwortet = true;
  if (gewählt === richtig) quizPunkte++;

  document.querySelectorAll('.quiz-antwort-btn').forEach(btn => {
    btn.disabled = true;
    const opt = btn.dataset.option;
    if (opt === richtig) {
      btn.classList.add('richtig');
      btn.textContent = '✓ ' + opt;
    } else if (opt === gewählt) {
      btn.classList.add('falsch');
      btn.textContent = '✗ ' + opt;
    }
  });

  document.getElementById('quiz-weiter-btn').hidden = false;
}

// ---- Ergebnis ----
function zeigeErgebnis() {
  zeigeScreen('result');
  const total = quizFragen.length;
  const pct   = quizPunkte / total;

  const [emoji, text] =
    pct === 1  ? ['🏆', 'Perfekt! Du kennst die WM in- und auswendig!']
    : pct >= 0.8 ? ['🥇', 'Sehr gut! Du bist ein echter WM-Experte!']
    : pct >= 0.6 ? ['🥈', 'Gut gemacht! Da steckt WM-Wissen drin!']
    : pct >= 0.4 ? ['🥉', 'Nicht schlecht – beim nächsten Mal wird\'s noch besser!']
    :              ['⚽', 'Üben macht den Meister – versuch\'s nochmal!'];

  document.getElementById('quiz-result-emoji').textContent = emoji;
  document.getElementById('quiz-result-score').textContent =
    `${quizPunkte} von ${total} richtig`;
  document.getElementById('quiz-result-text').textContent = text;
}

// ============================================================
// FRAGEN-GENERIERUNG
// ============================================================

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function andereLaenderNamen(ausnahmeId, n) {
  return shuffle(Object.keys(WM_LAENDER).filter(id => id !== ausnahmeId))
    .slice(0, n)
    .map(id => WM_LAENDER[id].land);
}

function generiereFragenliste() {
  return shuffle([
    ...generiereAssetFragen('flagge', 3),
    ...generiereAssetFragen('trikot', 3),
    ...generiereHauptstadtFragen(2),
    ...generiereSpielerFragen(2),
  ]);
}

function generiereAssetFragen(typ, anzahl) {
  const ids = shuffle(
    Object.keys(WM_LAENDER).filter(id => WM_LAENDER[id]._assets?.[typ])
  ).slice(0, anzahl);

  return ids.map(id => {
    const land = WM_LAENDER[id];
    return {
      typ,
      bild: land._assets[typ],
      frage: typ === 'flagge'
        ? 'Zu welchem Land gehört diese Flagge?'
        : 'Welches Land trägt dieses Trikot?',
      richtig: land.land,
      optionen: shuffle([land.land, ...andereLaenderNamen(id, 3)]),
    };
  });
}

function generiereHauptstadtFragen(anzahl) {
  const alleIds = Object.keys(WM_LAENDER).filter(id => WM_LAENDER[id].hauptstadt?.name);
  const ausgewählt = shuffle(alleIds).slice(0, anzahl);

  return ausgewählt.map(id => {
    const land = WM_LAENDER[id];
    const hs   = land.hauptstadt.name;
    const falsche = shuffle(alleIds.filter(fid => fid !== id))
      .slice(0, 3)
      .map(fid => WM_LAENDER[fid].hauptstadt.name);
    return {
      typ: 'hauptstadt',
      bild: null,
      frage: `Was ist die Hauptstadt von ${land.land}?`,
      richtig: hs,
      optionen: shuffle([hs, ...falsche]),
    };
  });
}

function generiereSpielerFragen(anzahl) {
  const pool = [];
  Object.keys(WM_LAENDER).forEach(id => {
    const land = WM_LAENDER[id];
    (land.wm_2026?.stars || []).forEach(s => {
      if (s.name) pool.push({ spieler: s.name, landName: land.land, landId: id });
    });
  });

  return shuffle(pool).slice(0, anzahl).map(({ spieler, landName, landId }) => ({
    typ: 'spieler',
    bild: null,
    frage: `Für welches Land spielt ${spieler}?`,
    richtig: landName,
    optionen: shuffle([landName, ...andereLaenderNamen(landId, 3)]),
  }));
}

document.addEventListener('DOMContentLoaded', initQuiz);
