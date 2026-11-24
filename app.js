'use strict';
/* APExpress24 – Sopralluogo APE (Regione Lombardia)
   App web installabile (PWA): dati salvati sul dispositivo, esportazione in ZIP
   con scheda PDF compilata + dati.json/csv + foto/video/documenti. */

/* ───────────── schema del modulo (rispecchia la scheda cartacea) ───────────── */
const NS = ['Assente', 'Presente', 'Non noto'];
const SN = ['No', 'Sì'];
const SCHEMA = [
  { id: 's1', t: '1. Richiedente e immobile', rows: [
    { l: 'Richiedente / contatti', f: [
      { k: 'nome', p: 'Nome', cap: 'words' },
      { k: 'cognome', p: 'Cognome', cap: 'words' },
      { k: 'cf', p: 'Codice fiscale / P.IVA', up: 1, cap: 'characters' },
      { k: 'tel', p: 'Telefono', t: 'tel' },
      { k: 'email', p: 'E-mail', t: 'email', cap: 'none' } ] },
    { l: 'Immobile', f: [
      { k: 'indirizzo', p: 'Indirizzo / civico', cap: 'words' },
      { k: 'comune', p: 'Comune', cap: 'words' },
      { k: 'prov', p: 'Prov.', cap: 'characters', up: 1 },
      { k: 'cap', p: 'CAP', im: 'numeric', cap: 'none' } ] },
    { l: 'Catasto / uso', f: [
      { k: 'fg', p: 'Foglio', cap: 'none' }, { k: 'mapp', p: 'Mappale', cap: 'none' },
      { k: 'sub', p: 'Sub.', cap: 'none' }, { k: 'piano', p: 'Piano / interno', cap: 'none' },
      { k: 'destinazione', p: 'Destinazione d’uso' } ] },
    { l: 'Finalità / fabbricato', f: [
      { k: 'finalita', p: 'Finalità', t: 'radio', o: ['Vendita', 'Locazione', 'Fine lavori', 'Altro'], x: { k: 'finalita_altro', on: 'Altro', p: 'Specificare' } },
      { k: 'anno_costr', p: 'Anno costruzione', im: 'numeric', cap: 'none' } ] } ] },

  { id: 's2', t: '2. Documentazione da allegare, se disponibile', rows: [
    { l: 'Catasto / edificio', f: [
      { k: 'doc_cat', p: 'Catasto / edificio', t: 'multi', o: ['Visura', 'Planimetria', 'APE precedente', 'Legge 10 / elaborati tecnici'] } ] },
    { l: 'Impianti / involucro', f: [
      { k: 'doc_imp', p: 'Impianti / involucro', t: 'multi', o: ['Libretto e controllo impianto', 'Schede generatori e split', 'Schede serramenti / isolanti'] } ] },
    { media: ['doc'] } ] },

  { id: 's3', t: '3. Involucro e interventi', rows: [
    { l: 'Tipologia / posizione', f: [
      { k: 'tipologia', p: 'Tipologia', t: 'radio', o: ['Appartamento', 'Casa', 'Altro'], x: { k: 'tipologia_altro', on: 'Altro', p: 'Specificare' } },
      { k: 'posizione', p: 'Posizione', t: 'radio', o: ['Terra', 'Intermedio', 'Ultimo piano'] } ] },
    { l: 'Isolamento', f: [
      { k: 'iso_pareti', p: 'Pareti', t: 'radio', o: NS },
      { k: 'iso_tetto', p: 'Tetto / solaio', t: 'radio', o: NS } ] },
    { l: 'Serramenti / lavori', f: [
      { k: 'vetro', p: 'Vetro', t: 'radio', o: ['Singolo', 'Doppio', 'Triplo'] },
      { k: 'telaio', p: 'Telaio (legno, PVC, alluminio…)' },
      { k: 'interventi', p: 'Interventi e anno', t: 'area' } ] },
    { media: ['serramenti', 'involucro'] } ] },

  { id: 's4', t: '4. Impianti', sub: 'allegare foto delle targhe e del libretto', rows: [
    { l: 'Riscaldamento', f: [
      { k: 'risc', p: 'Riscaldamento', t: 'radio', o: ['Autonomo', 'Centralizzato', 'Assente'] },
      { k: 'locali', p: 'Locali riscaldati / esclusi' } ] },
    { l: 'Generatore / CURIT', f: [
      { k: 'gen', p: 'Generatore', t: 'radio', o: ['Caldaia', 'PDC', 'Ibrido', 'Teleriscaldamento', 'Altro'], x: { k: 'gen_altro', on: 'Altro', p: 'Specificare' } },
      { k: 'curit', p: 'Codice CURIT', up: 1, cap: 'characters' } ] },
    { l: 'Dati generatore', f: [
      { k: 'gen_marca', p: 'Marca / modello', cap: 'words' },
      { k: 'gen_anno', p: 'Anno', im: 'numeric', cap: 'none' },
      { k: 'gen_comb', p: 'Combustibile' } ] },
    { l: 'Terminali / ACS', f: [
      { k: 'term', p: 'Terminali', t: 'multi', o: ['Radiatori', 'Radiante', 'Fan-coil'] },
      { k: 'acs', p: 'ACS (acqua calda sanitaria)', t: 'radio', o: ['Stesso generatore', 'Altro'], x: { k: 'acs_altro', on: 'Altro', p: 'Specificare' } } ] },
    { l: 'Climatizzatori', f: [
      { k: 'clima', p: 'Climatizzatori', t: 'radio', o: ['Assenti', 'Presenti'] },
      { k: 'clima_int', p: 'N. unità interne', t: 'number', im: 'numeric', if: d => d.clima === 'Presenti' },
      { k: 'clima_est', p: 'N. unità esterne', t: 'number', im: 'numeric', if: d => d.clima === 'Presenti' },
      { k: 'clima_anno', p: 'Anno installazione', im: 'numeric', cap: 'none', if: d => d.clima === 'Presenti' } ] },
    { l: 'Split / ACS separata', f: [
      { k: 'split', p: 'Marca / modello / anno (o foto targa)', t: 'area' } ] },
    { media: ['targa_gen', 'libretto', 'targa_split'] } ] },

  { id: 's5', t: '5. Isolamento, rinnovabili e sopralluogo', rows: [
    { l: 'Cappotto / isolamento', f: [
      { k: 'cappotto', p: 'Cappotto / isolamento', t: 'radio', o: ['Assente', 'Cappotto', 'Altro isolamento', 'Non noto'], x: { k: 'cappotto_altro', on: 'Altro isolamento', p: 'Specificare' } },
      { k: 'cappotto_anno', p: 'Anno', im: 'numeric', cap: 'none' } ] },
    { l: 'FV / solare / VMC', f: [
      { k: 'fv', p: 'Fotovoltaico', t: 'radio', o: SN },
      { k: 'fv_kwp', p: 'Potenza (kWp)', t: 'number', im: 'decimal', if: d => d.fv === 'Sì' },
      { k: 'solare', p: 'Solare termico', t: 'radio', o: SN },
      { k: 'vmc', p: 'VMC (ventilazione meccanica)', t: 'radio', o: SN } ] },
    { l: 'Accesso / note', f: [
      { k: 'referente', p: 'Referente', cap: 'words' },
      { k: 'tel_ref', p: 'Telefono referente', t: 'tel' },
      { k: 'disponibilita', p: 'Disponibilità' } ] },
    { l: 'Particolarità', f: [ { k: 'particolarita', p: 'Particolarità', t: 'area' } ] },
    { media: ['altro', 'video'] } ] }
];


/* ───────────── passi dell'app (una pagina per passo) ───────────── */
const rowsOf = (id, idx) => { const sec = SCHEMA.find(x => x.id === id); return idx.map(i => sec.rows[i]); };
const STEPS = [
  { t: 'Richiedente', d: 'Chi richiede l’attestato e come contattarlo.', rows: rowsOf('s1', [0]) },
  { t: 'Immobile', d: 'Indirizzo completo e dati catastali (se non li hai, tocca “non noto”: si completano dopo).', rows: rowsOf('s1', [1, 2]) },
  { t: 'Finalità e fabbricato', d: 'Perché serve l’APE e quando è stato costruito l’edificio.', rows: rowsOf('s1', [3]) },
  { t: 'Documentazione', d: 'Spunta cosa è disponibile e allega subito foto o PDF.', rows: [...rowsOf('s2', [0, 1]), { media: ['doc'] }] },
  { t: 'Involucro', d: 'Tipo di unità, posizione e isolamento di pareti e tetto.', rows: rowsOf('s3', [0, 1]) },
  { t: 'Serramenti e interventi', d: 'Finestre e lavori già eseguiti.', rows: [...rowsOf('s3', [2]), { media: ['serramenti', 'involucro'] }] },
  { t: 'Riscaldamento e generatore', d: 'Tipo di impianto e dati della caldaia / pompa di calore. Fotografa targa e libretto.', rows: [...rowsOf('s4', [0, 1, 2]), { media: ['targa_gen', 'libretto'] }] },
  { t: 'Terminali, ACS e climatizzatori', d: 'Radiatori, acqua calda sanitaria, split.', rows: [...rowsOf('s4', [3, 4, 5]), { media: ['targa_split'] }] },
  { t: 'Isolamento e rinnovabili', d: 'Cappotto, fotovoltaico, solare termico, VMC.', rows: rowsOf('s5', [0, 1]) },
  { t: 'Sopralluogo', d: 'Chi dà accesso, quando, e note particolari. Foto e video generali.', rows: [...rowsOf('s5', [2, 3]), { media: ['altro', 'video'] }] },
  { t: 'Firma e riepilogo', d: 'Controlla, fai firmare e genera il pacchetto per il certificatore.', final: true, rows: [] }
];

const CATS = {
  doc:         { n: 'Documenti (visura, planimetria, APE…)', kind: 'doc',   f: 'Documenti' },
  serramenti:  { n: 'Serramenti',                            kind: 'photo', f: 'Serramenti' },
  involucro:   { n: 'Facciate / involucro',                  kind: 'photo', f: 'Involucro' },
  targa_gen:   { n: 'Targa generatore',                      kind: 'photo', f: 'Targa_generatore' },
  libretto:    { n: 'Libretto impianto',                     kind: 'photo', f: 'Libretto_impianto' },
  targa_split: { n: 'Targhe split / ACS',                    kind: 'photo', f: 'Targhe_split_ACS' },
  altro:       { n: 'Altre foto',                            kind: 'photo', f: 'Altre_foto' },
  video:       { n: 'Video sopralluogo',                     kind: 'video', f: 'Video' }
};

const STUDIO = 'APExpress24 - marchio di Home Properties Group S.r.l.   |   info@apexpress24.it   |   +39 331 2743842';
const STUDIO2 = 'Viale Campania 65, 20900 Monza (MB) - C.F./P.IVA 13514350969 - apexpress24.it';
const CONFERMA = 'Il richiedente conferma i dati per quanto a propria conoscenza. La scheda non sostituisce il sopralluogo e le verifiche del certificatore.';

/* ───────────── utilità ───────────── */
const $ = (s, e = document) => e.querySelector(s);
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'value') e.value = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(9).forEach(c => { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c)); });
  return e;
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return iso || ''; } };
const fmtDT = iso => { try { return new Date(iso).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); } catch { return ''; } };
const slug = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const fmtSize = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }
const isArr = Array.isArray;
const filled = v => isArr(v) ? v.length > 0 : v != null && String(v).trim() !== '';

/* ───────────── database locale (IndexedDB) ───────────── */
let dbp;
function db() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open('apexpress24-ape', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('pratiche', { keyPath: 'id' });
      d.createObjectStore('media', { keyPath: 'id' }).createIndex('pid', 'pid');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(store, mode);
    let out; const rq = fn(t.objectStore(store));
    if (rq) rq.onsuccess = () => out = rq.result;
    t.oncomplete = () => res(out);
    t.onerror = t.onabort = () => rej(t.error);
  });
}
const dbPut = (s, o) => tx(s, 'readwrite', x => x.put(o));
const dbGet = (s, id) => tx(s, 'readonly', x => x.get(id));
const dbAll = s => tx(s, 'readonly', x => x.getAll());
const dbDel = (s, id) => tx(s, 'readwrite', x => x.delete(id));
const mediaOf = pid => tx('media', 'readonly', x => x.index('pid').getAll(pid));

/* ───────────── stato ───────────── */
let cur = null;          // pratica aperta {id, created, updated, d:{}, nmedia}
let media = [];          // allegati della pratica aperta
const urls = new Map();  // id -> objectURL
const panels = [];       // pannelli allegati visibili
let saveT;
const app = $('#app');

function title(p) {
  const n = [p.d.cognome, p.d.nome].filter(Boolean).join(' ');
  return n || 'Nuova pratica';
}
function scheduleSave() {
  clearTimeout(saveT);
  saveT = setTimeout(saveNow, 450);
}
async function saveNow() {
  clearTimeout(saveT);
  if (!cur) return;
  cur.updated = new Date().toISOString();
  cur.nmedia = media.length;
  try { await dbPut('pratiche', cur); } catch (e) { toast('Errore di salvataggio: spazio esaurito?'); }
}
function setVal(k, v) { cur.d[k] = v; scheduleSave(); updateProgress(); }

/* ───────────── Home ───────────── */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; if (!cur) renderHome(); });

const LOGO = `<img src="icons/logo.png" alt="APExpress24">`;

async function renderHome() {
  cur = null; media = []; panels.length = 0;
  const list = (await dbAll('pratiche')).sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  app.replaceChildren(
    h('div', { class: 'wrap' },
      h('div', { class: 'logo', html: LOGO }),
      h('span', { class: 'tag' }, 'Sopralluogo APE · Regione Lombardia'),
      h('div', { class: 'hero' },
        h('h2', {}, 'Raccolta dati sul posto'),
        h('p', {}, 'Compila la scheda passo dopo passo, allega foto e documenti e genera il pacchetto per il certificatore.'),
        h('button', { class: 'btn gold block', onclick: newPratica }, '＋  Nuova pratica')),
      !standalone && (deferredInstall || ios) ? h('div', { class: 'card install' },
        h('b', {}, 'Installa l’app'),
        h('p', { class: 'hint', style: 'margin:6px 0 10px' }, ios
          ? 'Su iPhone/iPad: tocca il pulsante Condividi di Safari, poi “Aggiungi alla schermata Home”.'
          : 'Aggiungila alla schermata Home per usarla come una vera app, anche senza connessione.'),
        deferredInstall ? h('button', { class: 'btn pri small', onclick: async () => { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; renderHome(); } }, 'Installa') : null) : null,
      list.length ? h('h3', { style: 'margin:22px 0 4px;color:var(--ink)' }, 'Pratiche (' + list.length + ')') : h('div', { class: 'empty' }, 'Nessuna pratica ancora.', h('br'), 'Tocca “Nuova pratica” per iniziare un sopralluogo.'),
      list.map(p => {
        const sub = [p.d.comune, p.d.indirizzo].filter(Boolean).join(' – ');
        return h('div', { class: 'card pr', onclick: () => openPratica(p.id) },
          h('div', { class: 'grow' }, h('div', { class: 't' }, title(p)), h('div', { class: 's' }, sub || 'Indirizzo non inserito'), h('div', { class: 's' }, 'Modificata ' + fmtDT(p.updated))),
          h('span', { class: 'badge' }, '📎 ' + (p.nmedia || 0)),
          h('button', { class: 'btn small danger', 'aria-label': 'Elimina', onclick: ev => { ev.stopPropagation(); delPratica(p); } }, '🗑'));
      }),
      h('button', { class: 'btn block', style: 'margin-top:18px', onclick: installGuide }, '📲  Come installare l’app sulla Home'),
      h('p', { class: 'hint', style: 'margin-top:18px' }, 'I dati restano salvati su questo dispositivo. Alla fine esporta il pacchetto ZIP e invialo al certificatore.'),
      h('p', { class: 'hint', style: 'margin:4px 0 0;font-size:12px' }, 'APExpress24 · info@apexpress24.it · +39 331 2743842'))
  );
  window.scrollTo(0, 0);
}

function installGuide() {
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) ov.remove(); } },
    h('div', { class: 'sheet guide' }, h('h3', {}, 'Installa l’app sulla Home'),
      h('p', { class: 'hint', style: 'margin:0' }, 'Si fa una volta sola. Poi l’app si apre dall’icona APExpress24, anche senza connessione.'),
      h('h4', {}, '🍎 iPhone e iPad (usa Safari)'),
      h('ol', {}, h('li', {}, 'Apri questa pagina con ', h('b', {}, 'Safari'), ' (non Chrome).'), h('li', {}, 'Tocca il pulsante ', h('b', {}, 'Condividi'), ' (il quadrato con la freccia).'), h('li', {}, 'Scorri e scegli ', h('b', {}, '“Aggiungi alla schermata Home”'), '.'), h('li', {}, 'Tocca ', h('b', {}, 'Aggiungi'), ': l’icona APExpress24 compare sulla Home.')),
      h('h4', {}, '🤖 Android (usa Chrome)'),
      h('ol', {}, h('li', {}, 'Apri questa pagina con ', h('b', {}, 'Chrome'), '.'), h('li', {}, 'Tocca il menu ', h('b', {}, '⋮'), ' in alto a destra.'), h('li', {}, 'Scegli ', h('b', {}, '“Installa app”'), ' (o “Aggiungi a schermata Home”).'), h('li', {}, 'Conferma: l’app compare tra le tue app.')),
      h('p', { class: 'hint' }, 'Al primo avvio concedi l’accesso a fotocamera e foto quando richiesto.'),
      h('button', { class: 'btn pri block', onclick: () => ov.remove() }, 'Ho capito')));
  document.body.append(ov);
}

async function delPratica(p) {
  if (!confirm('Eliminare definitivamente la pratica “' + title(p) + '” con tutti gli allegati?')) return;
  const m = await mediaOf(p.id);
  for (const x of m) await dbDel('media', x.id);
  await dbDel('pratiche', p.id);
  renderHome();
}
async function newPratica() {
  const p = { id: uid(), created: new Date().toISOString(), updated: new Date().toISOString(), d: { data_firma: today() }, nmedia: 0 };
  await dbPut('pratiche', p);
  openPratica(p.id);
  try { navigator.storage?.persist?.(); } catch {}
}
async function openPratica(id) {
  cur = await dbGet('pratiche', id);
  media = (await mediaOf(id)).sort((a, b) => a.ts - b.ts);
  step = Math.min(cur.step || 0, STEPS.length - 1);
  renderEditor();
}

/* ───────────── Editor ───────────── */
function visible(f) { return !f.if || f.if(cur.d); }
function stepStats(st) {
  let tot = 0, ok = 0;
  st.rows.forEach(r => (r.f || []).forEach(f => { if (visible(f)) { tot++; if (filled(cur.d[f.k])) ok++; } }));
  return { tot, ok };
}
function updateProgress() {
  let tot = 0, ok = 0;
  STEPS.forEach(st => { const x = stepStats(st); tot += x.tot; ok += x.ok; });
  const pct = tot ? Math.round(ok / tot * 100) : 0;
  const s = $('#pct'); if (s) s.textContent = 'Passo ' + (step + 1) + ' di ' + STEPS.length + '  ·  ' + pct + '% compilato';
  const t = $('#ttl'); if (t) t.firstChild.nodeValue = title(cur);
  const fin = $('#missing'); if (fin) fin.textContent = (tot - ok) ? (tot - ok) + ' campi ancora vuoti (puoi esportare lo stesso e completare dopo).' : 'Tutti i campi sono compilati.';
}

let step = 0;
async function goStep(n) {
  step = Math.max(0, Math.min(STEPS.length - 1, n)); cur.step = step;
  await saveNow();
  renderEditor();
}
function stepMenu() {
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) ov.remove(); } },
    h('div', { class: 'sheet' }, h('h3', {}, 'Vai al passo'),
      ...STEPS.map((st, i) => { const x = stepStats(st);
        return h('button', { class: 'btn block' + (i === step ? ' pri' : ''), style: 'justify-content:space-between;margin-top:8px', onclick: () => { ov.remove(); goStep(i); } },
          h('span', {}, (i + 1) + '.  ' + st.t), h('span', { class: 'badge' }, st.final ? '' : x.ok + '/' + x.tot)); }),
      h('button', { class: 'btn block', style: 'margin-top:12px', onclick: () => ov.remove() }, 'Chiudi')));
  document.body.append(ov);
}

function renderEditor() {
  panels.length = 0;
  const st = STEPS[step], last = !!st.final;
  const body = last ? finalStep() : h('section', { class: 'sec' }, ...st.rows.map(r => r.media ? mediaPanel(r.media) : renderRow(r)));
  app.replaceChildren(
    h('div', { class: 'hdr' },
      h('button', { class: 'ibtn', 'aria-label': 'Torna all’elenco', onclick: async () => { await saveNow(); renderHome(); } }, '‹ Elenco'),
      h('h1', { id: 'ttl' }, title(cur), h('span', { class: 'sub', id: 'pct' }, '')),
      h('button', { class: 'ibtn', onclick: stepMenu }, '☰ Passi')),
    h('div', { class: 'prog' }, h('i', { style: 'width:' + Math.round((step + 1) / STEPS.length * 100) + '%' })),
    h('div', { class: 'wrap' },
      h('div', { class: 'stephead' }, h('div', { class: 'stepno' }, 'Passo ' + (step + 1) + ' di ' + STEPS.length), h('h2', {}, st.t), h('p', { class: 'hint', style: 'margin:4px 0 0' }, st.d)),
      body,
      h('p', { class: 'hint', style: 'text-align:center' }, 'Salvataggio automatico su questo dispositivo.')),
    h('div', { class: 'bar' },
      h('button', { class: 'btn', disabled: step === 0 ? true : null, onclick: () => goStep(step - 1) }, '‹ Indietro'),
      last ? h('button', { class: 'btn gold', onclick: openExport }, '📦  Genera pacchetto')
           : h('button', { class: 'btn pri', onclick: () => goStep(step + 1) }, 'Avanti ›'))
  );
  updateProgress();
  window.scrollTo(0, 0);
}

function finalStep() {
  return h('div', {},
    h('section', { class: 'sec' }, h('h2', {}, h('span', {}, 'Riepilogo')),
      h('div', { style: 'padding:6px 14px 12px' },
        ...STEPS.filter(x => !x.final).map((st, i) => { const x = stepStats(st);
          return h('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--line);cursor:pointer', onclick: () => goStep(i) },
            h('span', {}, (i + 1) + '. ' + st.t), h('span', { class: 'badge', style: x.ok === x.tot ? 'background:#dff3e8;color:#1f6b43' : '' }, x.tot ? x.ok + '/' + x.tot : '—')); }),
        h('p', { class: 'hint', id: 'missing', style: 'margin:10px 0 0' }, ''),
        h('p', { class: 'hint', style: 'margin:4px 0 0' }, '📎 Allegati: ' + media.length + ' (foto, video, documenti)'))),
    h('section', { class: 'sec' }, h('h2', {}, h('span', {}, 'Conferma e firma')),
      h('div', { style: 'padding:14px' },
        h('p', { class: 'hint', style: 'margin-top:0' }, CONFERMA),
        h('label', { class: 'fld', style: 'max-width:220px;margin-bottom:12px' }, h('span', { class: 'lbl' }, 'Data'),
          h('input', { type: 'date', value: cur.d.data_firma || today(), oninput: e => setVal('data_firma', e.target.value) })),
        signaturePad())));
}

function renderRow(row) {
  let el;
  const build = () => h('div', { class: 'row' },
    h('div', { class: 'rl' }, row.l),
    h('div', { class: 'rv' }, row.f.filter(visible).map(f => fieldEl(f, redraw))));
  const redraw = () => { const n = build(); el.replaceWith(n); el = n; updateProgress(); };
  el = build();
  return el;
}

function fieldEl(f, redraw) {
  const v = cur.d[f.k];
  if (f.t === 'radio' || f.t === 'multi') {
    const multi = f.t === 'multi';
    const sel = o => multi ? (v || []).includes(o) : v === o;
    const box = h('div', { class: 'fld wfull' },
      h('span', { class: 'lbl' }, f.p),
      h('div', { class: 'chips' }, f.o.map(o => h('button', {
        type: 'button', class: 'chip' + (sel(o) ? ' on' : ''), 'aria-pressed': sel(o) ? 'true' : 'false',
        onclick: () => {
          if (multi) { const a = new Set(v || []); a.has(o) ? a.delete(o) : a.add(o); cur.d[f.k] = [...a]; }
          else cur.d[f.k] = sel(o) ? '' : o;
          scheduleSave(); redraw();
        } }, o))));
    if (f.x && sel(f.x.on)) box.append(textInput({ k: f.x.k, p: f.x.p }, 'margin-top:6px;max-width:340px'));
    return box;
  }
  return textInput(f);
}
function textInput(f, style) {
  const area = f.t === 'area';
  const inp = h(area ? 'textarea' : 'input', {
    type: area ? null : (f.t || 'text'), rows: area ? 3 : null, inputmode: f.im, autocomplete: 'off',
    autocapitalize: f.cap || 'sentences', enterkeyhint: 'next', spellcheck: 'false'
  });
  inp.value = cur.d[f.k] || '';
  inp.addEventListener('input', () => { if (f.up) { const s = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(s, s); } catch {} } setVal(f.k, inp.value); });
  const nn = h('button', { type: 'button', class: 'nn', tabindex: '-1', onclick: () => { inp.value = 'non noto'; setVal(f.k, 'non noto'); } }, 'non noto');
  return h('label', { class: 'fld' + (area ? ' wfull' : ''), style }, h('span', { class: 'lbl' }, f.p), h('span', { class: 'inwrap' }, inp, area ? null : nn));
}

/* ───────────── firma ───────────── */
function signaturePad() {
  const c = h('canvas', { class: 'sig' });
  const ctx = () => c.getContext('2d');
  const size = () => {
    const r = c.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
    const x = ctx(); x.scale(dpr, dpr); x.lineWidth = 2.2; x.lineCap = 'round'; x.lineJoin = 'round'; x.strokeStyle = '#111';
    if (cur.d.firma) { const im = new Image(); im.onload = () => ctx().drawImage(im, 0, 0, r.width, r.height); im.src = cur.d.firma; }
  };
  let drawing = false, last = null;
  const pt = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  c.addEventListener('pointerdown', e => { drawing = true; last = pt(e); c.setPointerCapture(e.pointerId); ctx().beginPath(); ctx().moveTo(last.x, last.y); ctx().lineTo(last.x + .1, last.y + .1); ctx().stroke(); e.preventDefault(); });
  c.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx().beginPath(); ctx().moveTo(last.x, last.y); ctx().lineTo(p.x, p.y); ctx().stroke(); last = p; e.preventDefault(); });
  const end = () => { if (!drawing) return; drawing = false; cur.d.firma = c.toDataURL('image/png'); scheduleSave(); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  requestAnimationFrame(size);
  return h('div', {}, h('span', { class: 'lbl' }, 'Firma del richiedente (disegna con il dito)'), c,
    h('button', { class: 'btn small', style: 'margin-top:8px', onclick: () => { const r = c.getBoundingClientRect(); ctx().clearRect(0, 0, r.width, r.height); delete cur.d.firma; scheduleSave(); } }, 'Cancella firma'));
}

/* ───────────── allegati ───────────── */
function mediaPanel(cats) {
  const el = h('div', { class: 'media' });
  const p = { el, cats };
  panels.push(p);
  drawPanel(p);
  return el;
}
function drawPanel(p) {
  p.el.replaceChildren(h('h3', {}, '📎 Foto, video e documenti'), ...p.cats.map(cat => {
    const c = CATS[cat]; const items = media.filter(m => m.cat === cat);
    return h('div', { class: 'mcat' },
      h('div', { class: 'mh' }, h('b', {}, c.n),
        c.kind === 'video'
          ? h('button', { class: 'btn small pri', onclick: () => pick(cat, 'video') }, '🎥 Registra video')
          : c.kind === 'photo' ? h('button', { class: 'btn small pri', onclick: () => pick(cat, 'camera') }, '📷 Scatta foto') : null,
        h('button', { class: 'btn small', onclick: () => pick(cat, 'file') }, c.kind === 'doc' ? '📁 Aggiungi file / foto' : '🖼 Galleria / file')),
      items.length ? h('div', { class: 'thumbs' }, items.map(thumb)) : null);
  }));
}
function drawPanels() { panels.forEach(drawPanel); }
function urlOf(m) { if (!urls.has(m.id)) urls.set(m.id, URL.createObjectURL(m.blob)); return urls.get(m.id); }
function thumb(m) {
  const t = h('div', { class: 'th', onclick: () => viewMedia(m) });
  if (m.type.startsWith('image/')) t.append(h('img', { src: urlOf(m), alt: m.name, loading: 'lazy' }));
  else t.append(h('div', {}, h('span', { class: 'ic' }, m.type.startsWith('video/') ? '🎬' : '📄'), fmtSize(m.size)));
  t.append(h('button', { class: 'x', 'aria-label': 'Rimuovi', onclick: async ev => { ev.stopPropagation(); if (!confirm('Rimuovere questo allegato?')) return; await dbDel('media', m.id); media = media.filter(x => x.id !== m.id); URL.revokeObjectURL(urls.get(m.id)); urls.delete(m.id); drawPanels(); scheduleSave(); } }, '×'));
  return t;
}
function viewMedia(m) {
  const body = m.type.startsWith('image/') ? h('img', { src: urlOf(m) }) : m.type.startsWith('video/') ? h('video', { src: urlOf(m), controls: true, playsinline: true }) : h('p', {}, m.name + ' (' + fmtSize(m.size) + ') – sarà incluso nel pacchetto.');
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) ov.remove(); } },
    h('div', { class: 'sheet viewer' }, body, h('button', { class: 'btn block', style: 'margin-top:12px', onclick: () => ov.remove() }, 'Chiudi')));
  document.body.append(ov);
}
function pick(cat, mode) {
  const inp = h('input', { type: 'file', multiple: mode !== 'video' ? true : null });
  if (mode === 'camera') { inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.multiple = false; }
  else if (mode === 'video') { inp.accept = 'video/*'; inp.setAttribute('capture', 'environment'); }
  else inp.accept = CATS[cat].kind === 'video' ? 'video/*' : (CATS[cat].kind === 'doc' ? 'image/*,application/pdf' : 'image/*,video/*');
  inp.addEventListener('change', async () => {
    const files = [...inp.files]; if (!files.length) return;
    toast('Salvataggio in corso…');
    for (const f of files) await addMedia(cat, f);
    drawPanels(); await saveNow(); toast(files.length > 1 ? files.length + ' allegati aggiunti' : 'Allegato aggiunto');
  });
  inp.click();
}
async function shrink(blob, max, q) {
  try {
    const bmp = await createImageBitmap(blob);
    const sc = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * sc), hh = Math.round(bmp.height * sc);
    const c = document.createElement('canvas'); c.width = w; c.height = hh;
    c.getContext('2d').drawImage(bmp, 0, 0, w, hh); bmp.close?.();
    const out = await new Promise(r => c.toBlob(r, 'image/jpeg', q));
    return out ? { blob: out, w, h: hh } : null;
  } catch { return null; }
}
async function addMedia(cat, file) {
  let blob = file, type = file.type || 'application/octet-stream';
  if (type.startsWith('image/')) { const s = await shrink(file, 2400, 0.87); if (s) { blob = s.blob; type = 'image/jpeg'; } }
  const ext = type === 'image/jpeg' ? 'jpg' : type === 'application/pdf' ? 'pdf' : ((file.name || '').split('.').pop() || (type.split('/')[1] || 'bin')).toLowerCase();
  const m = { id: uid(), pid: cur.id, cat, name: file.name || (cat + '.' + ext), ext, type, size: blob.size, blob, ts: Date.now() };
  await dbPut('media', m); media.push(m);
}

/* ───────────── esportazione ───────────── */
function labelOf(f) { return f.p; }
function flatData() {
  const out = [];
  SCHEMA.forEach(s => s.rows.forEach(r => (r.f || []).forEach(f => {
    const v = cur.d[f.k]; if (!filled(v) && !visible(f)) return;
    let val = isArr(v) ? v.join(', ') : (v || '');
    if (f.x && v === f.x.on && cur.d[f.x.k]) val += ' (' + cur.d[f.x.k] + ')';
    out.push({ sezione: s.t, campo: labelOf(f), chiave: f.k, valore: val });
  })));
  out.push({ sezione: 'Firma', campo: 'Data', chiave: 'data_firma', valore: cur.d.data_firma || '' });
  return out;
}
function baseName() {
  return ['APE', slug(cur.d.cognome) || 'SenzaCognome', slug(cur.d.comune), today()].filter(Boolean).join('_');
}
function mediaFileName(m, i, cat) { return String(i + 1).padStart(2, '0') + '_' + (cat.f) + '.' + m.ext; }

async function buildZip(onProg) {
  const zip = new JSZip();
  const root = baseName();
  onProg(2, 'Creo la scheda PDF…');
  const pdf = await buildPdf();
  zip.file(root + '/00_Scheda_raccolta_dati_APE.pdf', pdf);
  const rows = flatData();
  const json = { formato: 'apexpress24-ape-v1', creata: cur.created, esportata: new Date().toISOString(), pratica: Object.fromEntries(rows.map(r => [r.chiave, r.valore])), allegati: [] };
  const csv = '﻿Sezione;Campo;Valore\r\n' + rows.map(r => [r.sezione, r.campo, r.valore].map(x => '"' + String(x).replace(/"/g, '""') + '"').join(';')).join('\r\n');
  if (cur.d.firma) zip.file(root + '/Firma_richiedente.png', cur.d.firma.split(',')[1], { base64: true });
  let n = 0;
  for (const cat of Object.keys(CATS)) {
    const items = media.filter(m => m.cat === cat);
    items.forEach((m, i) => {
      const path = 'Allegati/' + CATS[cat].f + '/' + mediaFileName(m, i, CATS[cat]);
      zip.file(root + '/' + path, m.blob, { compression: 'STORE' });
      json.allegati.push({ categoria: CATS[cat].n, file: path, tipo: m.type, byte: m.size });
      n++;
    });
  }
  zip.file(root + '/dati_pratica.json', JSON.stringify(json, null, 2));
  zip.file(root + '/dati_pratica.csv', csv);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, streamFiles: true },
    meta => onProg(10 + meta.percent * 0.9, 'Compressione allegati… ' + Math.round(meta.percent) + '%'));
}

async function buildPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 12, LW = 38, X0 = M + LW + 2, RW = W - M - X0, LH = 4.5, PAD = 1.7, BOTTOM = 280;
  const NAVY = [15, 100, 104], LAB = [233, 244, 246];
  let y = 14;
  const footer = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110); doc.text(STUDIO, W / 2, 288.5, { align: 'center' }); doc.text(STUDIO2, W / 2, 292, { align: 'center' }); doc.text('Pag. ' + i + '/' + n, W - M, 292, { align: 'right' }); }
  };
  // logo APExpress24
  try {
    const lg = await fetch('icons/logo.png').then(r => r.blob());
    const du = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(lg); });
    doc.addImage(du, 'PNG', M, y - 2, 54, 12);
  } catch { doc.setTextColor(15, 36, 65); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text('APExpress24', M, y + 6); }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90);
  doc.text('Certificatori abilitati - Regione Lombardia', W - M, y + 2.5, { align: 'right' });
  doc.text('info@apexpress24.it  |  +39 331 2743842', W - M, y + 6.5, { align: 'right' });
  doc.setDrawColor(15, 100, 104); doc.setLineWidth(.6); doc.line(M, y + 12, W - M, y + 12);
  y = 36;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...NAVY); doc.text('SCHEDA RACCOLTA DATI APE', W / 2, y, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60);
  doc.text('Raccolta dati per attestato di prestazione energetica - Regione Lombardia', W / 2, y + 4.6, { align: 'center' });
  y += 10;

  const ensure = hh => { if (y + hh > BOTTOM) { doc.addPage(); y = 14; } };
  const tokensOf = row => {
    const T = [];
    row.f.filter(visible).forEach(f => {
      const v = cur.d[f.k];
      T.push({ t: 'lab', s: f.p + ':' });
      if (f.t === 'radio' || f.t === 'multi') {
        const sel = o => f.t === 'multi' ? (v || []).includes(o) : v === o;
        f.o.forEach(o => T.push({ t: 'opt', on: sel(o), s: o + (f.x && o === f.x.on && sel(o) && cur.d[f.x.k] ? ' (' + cur.d[f.x.k] + ')' : '') }));
      } else {
        const s = filled(v) ? String(v) : '________';
        s.split(/\s+/).forEach(w => T.push({ t: 'w', s: w }));
      }
      T.push({ t: 'gap' });
    });
    return T;
  };
  // layout a capo automatico; draw=false misura soltanto
  const flow = (T, y0, draw) => {
    let cx = X0, cy = y0 + PAD + 3;
    doc.setFontSize(8.5);
    for (const k of T) {
      if (k.t === 'gap') { cx += 3; continue; }
      doc.setFont('helvetica', k.t === 'lab' ? 'bold' : 'normal');
      const bw = k.t === 'opt' ? 4.6 : 0;
      const w = bw + doc.getTextWidth(k.s) + 1.8;
      if (cx + w > X0 + RW && cx > X0) { cx = X0; cy += LH; }
      if (draw) {
        if (k.t === 'opt') {
          doc.setDrawColor(70); doc.setLineWidth(.25); doc.rect(cx, cy - 2.8, 3, 3);
          if (k.on) { doc.setDrawColor(...NAVY); doc.setLineWidth(.5); doc.line(cx + .5, cy - 2.3, cx + 2.5, cy - .3); doc.line(cx + 2.5, cy - 2.3, cx + .5, cy - .3); }
          doc.setTextColor(k.on ? 20 : 70); doc.setFont('helvetica', k.on ? 'bold' : 'normal'); doc.text(k.s, cx + bw, cy);
        } else { doc.setTextColor(k.t === 'lab' ? 90 : 15); doc.text(k.s, cx, cy); }
      }
      cx += w;
    }
    return cy + PAD + 1 - y0;
  };

  for (const sec of SCHEMA) {
    ensure(18);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NAVY);
    doc.text(sec.t.toUpperCase() + (sec.sub ? '  -  ' + sec.sub : ''), M, y + 3);
    doc.setDrawColor(...NAVY); doc.setLineWidth(.3); doc.line(M, y + 4.6, W - M, y + 4.6);
    y += 6.5;
    for (const row of sec.rows) {
      if (row.media) continue;
      const T = tokensOf(row);
      const hh = Math.max(flow(T, y, false), 8);
      ensure(hh);
      doc.setFillColor(...LAB); doc.rect(M, y, LW, hh, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY);
      doc.text(doc.splitTextToSize(row.l, LW - 3), M + 1.5, y + PAD + 3);
      flow(T, y, true);
      doc.setDrawColor(215, 223, 227); doc.setLineWidth(.15); doc.line(M, y + hh, W - M, y + hh);
      y += hh;
    }
    y += 3;
  }
  // allegati elencati
  ensure(24);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(60);
  doc.text(doc.splitTextToSize(CONFERMA, W - 2 * M), M, y + 2); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(20);
  doc.text('Data: ' + (cur.d.data_firma ? fmtDate(cur.d.data_firma) : '____________'), M, y + 8);
  doc.text('Firma:', 70, y + 8);
  if (cur.d.firma) { try { doc.addImage(cur.d.firma, 'PNG', 84, y - 3, 55, 18); } catch {} }
  doc.setDrawColor(90); doc.setLineWidth(.2); doc.line(84, y + 9, 150, y + 9);
  y += 16;
  const nonImg = media.filter(m => !m.type.startsWith('image/'));
  const imgs = media.filter(m => m.type.startsWith('image/'));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60);
  doc.text('Allegati nel pacchetto: ' + imgs.length + ' foto, ' + nonImg.length + ' video/documenti.', M, y + 2);

  // pagine fotografiche
  if (imgs.length) {
    const cw = (W - 2 * M - 6) / 2, ch = 66;
    let i = 0, col = 0;
    doc.addPage(); y = 14;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY); doc.text('ALLEGATO FOTOGRAFICO', M, y + 3); y += 9;
    for (const cat of Object.keys(CATS)) {
      const items = imgs.filter(m => m.cat === cat);
      for (let j = 0; j < items.length; j++) {
        if (col === 0 && y + ch + 8 > BOTTOM) { doc.addPage(); y = 14; }
        const th = await shrink(items[j].blob, 1100, 0.72);
        const x = M + col * (cw + 6);
        doc.setDrawColor(215, 223, 227); doc.setLineWidth(.2); doc.rect(x, y, cw, ch);
        if (th) {
          const dataUrl = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(th.blob); });
          const sc = Math.min((cw - 2) / th.w, (ch - 2) / th.h);
          try { doc.addImage(dataUrl, 'JPEG', x + (cw - th.w * sc) / 2, y + (ch - th.h * sc) / 2, th.w * sc, th.h * sc); } catch {}
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80);
        doc.text(CATS[cat].n + ' - ' + (j + 1), x, y + ch + 4);
        i++; col++;
        if (col === 2) { col = 0; y += ch + 8; }
      }
    }
  }
  footer();
  return doc.output('blob');
}

/* ───────────── schermata di esportazione ───────────── */
async function openExport() {
  await saveNow();
  const bar = h('i'); const msg = h('p', { class: 'hint' }, 'Preparazione…');
  const actions = h('div', { style: 'display:grid;gap:10px;margin-top:8px' });
  const ov = h('div', { class: 'overlay', onclick: e => { if (e.target === ov) ov.remove(); } },
    h('div', { class: 'sheet' }, h('h3', {}, 'Pacchetto per il certificatore'),
      h('p', { class: 'hint', style: 'margin:0' }, 'Contiene la scheda PDF compilata, i dati (JSON e CSV) e tutti gli allegati in cartelle ordinate.'),
      h('div', { class: 'pbar' }, bar), msg, actions));
  document.body.append(ov);
  try {
    const blob = await buildZip((p, t) => { bar.style.width = p + '%'; msg.textContent = t; });
    const name = baseName() + '.zip';
    bar.style.width = '100%';
    msg.textContent = 'Pronto: ' + name + ' (' + fmtSize(blob.size) + ', ' + media.length + ' allegati).';
    const file = new File([blob], name, { type: 'application/zip' });
    const canShare = !!(navigator.canShare && navigator.canShare({ files: [file] }));
    if (canShare) actions.append(h('button', { class: 'btn pri block', onclick: async () => { try { await navigator.share({ files: [file], title: 'Scheda APE – ' + title(cur) }); } catch (e) { if (e.name !== 'AbortError') toast('Condivisione non riuscita: usa Scarica'); } } }, '📤  Invia / Condividi (mail, WhatsApp, AirDrop, Drive…)'));
    actions.append(h('button', { class: 'btn block' + (canShare ? '' : ' pri'), onclick: () => download(blob, name) }, '⬇️  Scarica ZIP'));
    actions.append(h('button', { class: 'btn block', onclick: async () => { const pdf = await buildPdf(); download(pdf, baseName() + '_scheda.pdf'); } }, '📄  Scarica solo la scheda PDF'));
    actions.append(h('button', { class: 'btn block', onclick: () => ov.remove() }, 'Chiudi'));
  } catch (e) {
    console.error(e);
    msg.textContent = 'Errore durante la creazione del pacchetto: ' + (e && e.message || e) + '. Se ci sono molti video, prova a esportarne meno alla volta.';
    actions.append(h('button', { class: 'btn block', onclick: () => ov.remove() }, 'Chiudi'));
  }
}
function download(blob, name) {
  const u = URL.createObjectURL(blob);
  const a = h('a', { href: u, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 60000);
}

/* ───────────── avvio ───────────── */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
window.addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
renderHome();
