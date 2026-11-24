'use strict';
/* Lettura dei dati catastali da visura / planimetria (PDF con testo).
   parseCatasto(testo) restituisce solo i campi trovati: fg, mapp, sub, categoria, classe,
   consistenza, sup_cat, rendita, zona_cens, piano, indirizzo, comune. */
(function (root) {
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const num = s => clean(s).replace(/\.(?=\d{3}(\D|$))/g, '');   // 1.234,50 -> 1234,50

  function parseCatasto(raw) {
    const t = clean(raw), out = {};
    const get = (re, i = 1) => { const m = t.match(re); return m ? clean(m[i]) : ''; };
    const set = (k, v) => { if (v) out[k] = v; };

    set('fg', get(/\bFoglio\s*:?\s*(\d{1,4})\b/i));
    set('mapp', get(/\b(?:Particella|Mappale|Num\.?)\s*:?\s*(\d{1,5}(?:\/?[A-Za-z0-9]{1,3})?)\b/i));
    set('sub', get(/\b(?:Sub\.?|Subalterno)\s*:?\s*(\d{1,4})\b/i));
    set('zona_cens', get(/\bZona\s*Cens(?:uaria|\.)?\s*:?\s*(\w{1,3})\b/i));
    set('categoria', (get(/\bCategoria\s*:?\s*([A-F]\s*\/\s*\d{1,2})\b/i) || get(/\b([A-F]\/\d{1,2})\b/)).replace(/\s+/g, ''));
    set('classe', get(/\bClasse\s*:?\s*(\d{1,2}|U)\b(?!\s*\/)/i) || get(/\b[A-F]\/\d{1,2}\s+(\d{1,2}|U)\s+[\d.,]+\s*(?:vani|m\s?[2²]|mq|m\s?3|mc)/));
    set('consistenza', get(/\bConsistenza\s*:?\s*([\d.,]+\s*(?:vani|m\s?[2²]|mq|m\s?3|mc))/i) || get(/\b([\d]+(?:,\d+)?\s*vani)\b/i));
    set('rendita', num(get(/\bRendita\s*:?\s*(?:Euro|EUR|€)\s*([\d.]+,\d{2})/i) || get(/(?:Euro|EUR|€)\s*([\d.]+,\d{2})/)));
    // superficie catastale: primo "Totale: N m2" (comprende le aree scoperte); in assenza, "escluse aree scoperte"
    set('sup_cat', num(get(/\bTotale\s*:?\s*([\d.,]+)\s*(?:m\s?[2²]|mq)/i) || get(/escluse\s+aree\s+scoperte\s*\**\s*:?\s*([\d.,]+)\s*(?:m\s?[2²]|mq)/i)));

    set('piano', get(/\bPiano\s*:?\s*([A-Za-z0-9][A-Za-z0-9\- ,]{0,18}?)(?=\s+(?:Superficie|Dati|Partita|Annotazioni|Mod\.|INTESTATI|Intestati|Scala|Interno|Int\.|Indirizzo|Visura)|$)/));
    const ind = get(/\bIndirizzo\s*:?\s*((?:VIA|V\.LE|VIALE|PIAZZA|P\.ZZA|P\.ZA|CORSO|C\.SO|LARGO|STRADA|VICOLO|LOC\.|LOCALITA|VIA\w*)\b.+?)(?=\s+(?:Piano|Scala|Interno|Int\.|Superficie|Dati|Partita|Annotazioni|Mod\.|$))/i);
    set('indirizzo', ind);

    const com = get(/\bComune\s+di\s+([A-ZÀ-Ý][A-ZÀ-Ý' \-]{1,40}?)\s*[\(\[]?\s*(?:Codice|Cod\.)/);
    set('comune', com ? com.toLowerCase().replace(/(^|[\s'\-])([a-zà-ý])/g, (_, a, b) => a + b.toUpperCase()) : '');
    return out;
  }


  // Righe di tabella: N. [Sez] Foglio Numero Sub [Zona] Categoria Classe Consistenza ... Rendita
  function rows(raw) {
    const t = clean(raw), out = [];
    const re = /\b\d{1,3}\s+(?:[A-Z]{1,2}\s+)?(\d{1,4})\s+(\d{1,5})\s+(?:(\d{1,4})\s+)?(?:\d{1,2}\s+){0,2}([A-F]\/\d{1,2})\s+(\d{1,2}|U)\s+([\d.,]+\s*(?:vani|m\s?[2²]|mq|m\s?3|mc))([^]*?)(?=\b\d{1,3}\s+(?:[A-Z]{1,2}\s+)?\d{1,4}\s+\d{1,5}\s+(?:\d{1,4}\s+)?(?:\d{1,2}\s+){0,2}[A-F]\/\d{1,2}\s+(?:\d{1,2}|U)\s+[\d.,]+\s*(?:vani|m\s?[2²]|mq|m\s?3|mc)|Intestazione degli immobili|$)/g;
    let m;
    while ((m = re.exec(t))) {
      const tail = m[7] || '', r = { fg: m[1], mapp: m[2], categoria: m[4], classe: m[5], consistenza: clean(m[6]) };
      if (m[3]) r.sub = m[3];
      const sup = tail.match(/Totale\s*:?\s*([\d.,]+)\s*(?:m\s?[2²]|mq)/i); if (sup) r.sup_cat = num(sup[1]);
      const ren = tail.match(/(?:Euro|EUR|€)\s*([\d.]+,\d{2})/); if (ren) r.rendita = num(ren[1]);
      const pi = tail.match(/\bPiano\s*:?\s*([A-Za-z0-9][A-Za-z0-9\- ,]{0,14}?)(?=\s+(?:Totale|Dati|VARIAZIONE|Pratica|Annotazioni|Euro|\d+\s|$)|$)/); if (pi) r.piano = clean(pi[1]);
      const ind = tail.match(/\b((?:VIA|V\.LE|VIALE|PIAZZA|CORSO|LARGO|STRADA|VICOLO|LOC\.?)\b.+?)\s+n\.\s*\d+[A-Za-z]?/i);
      if (ind) r.indirizzo = clean(ind[0]).replace(/\s+Piano.*$/i, '');
      out.push(r);
    }
    return out;
  }

  async function pdfText(file, maxPages = 4) {
    const base = typeof document !== 'undefined' ? document.baseURI : location.href;
    const pdfjs = await import(new URL('lib/pdf.min.mjs', base).href);
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('lib/pdf.worker.min.mjs', base).href;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    let text = '';
    for (let p = 1; p <= Math.min(doc.numPages, maxPages); p++) {
      const c = await (await doc.getPage(p)).getTextContent();
      text += c.items.map(i => i.str).join(' ') + ' ';
    }
    return text;
  }

  root.Catasto = { parseCatasto, pdfText, rows };
  if (typeof module !== 'undefined') module.exports = { parseCatasto, rows };
})(typeof window !== 'undefined' ? window : globalThis);
