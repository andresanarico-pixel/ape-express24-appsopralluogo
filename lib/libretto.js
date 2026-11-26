'use strict';
/* Lettura del libretto di impianto / scheda impianto (PDF con testo): targa CURIT, generatore, potenza, anno.
   Se il PDF e una scansione (nessun testo) la lettura non e possibile: i campi restano da compilare a mano.
   La condensazione e una casella da spuntare nel libretto: il testo del PDF non la distingue, quindi non viene dedotta. */
(function (root) {
  const clean = s => String(s || '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const title = s => clean(s).toLowerCase().replace(/(^|[\s\-\/])([a-zà-ú])/g, (m, a, b) => a + b.toUpperCase());

  function parseLibretto(text) {
    const t = String(text || '');
    const out = {};
    // Targa impianto: 16 caratteri (lettere e cifre)
    let m = t.match(/TARGA\s+IMPIANTO[:\s]*([A-Z0-9]{16})\b/i) || t.match(/Targa[:\s]+([A-Z0-9]{16})\b/i) || t.match(/\bCodice\s+impianto[:\s]*([A-Z0-9]{16})\b/i);
    if (m) out.curit = m[1].toUpperCase();
    else { const c = (t.match(/\b[A-Z0-9]{16}\b/g) || []).find(x => /[A-Z]/.test(x) && /\d/.test(x) && /^[A-Z]{1,3}\d/.test(x)); if (c) out.curit = c; }

    // Scheda generatore del libretto digitale: Fabbricante / Modello / Potenza / Combustibile
    const lines = t.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const fm = lines[i].match(/Fabbricante\s+(.+?)\s{2,}Modello\s+(.+?)\s*$/i);
      if (!fm) continue;
      const marca = clean(fm[1]), modello = clean(fm[2]);
      if (!marca || !modello) continue;
      const blk = lines.slice(i, i + 8).join('\n');
      const pw = blk.match(/Pn\s*max\s+([\d]+(?:[.,]\d+)?)/i);
      const cb = blk.match(/Combustibile\s+([A-Za-zÀ-ú ]+?)(?:\s{2,}|,|\s*$)/im);
      out.gen_marca = title(marca) + ' ' + modello;
      if (pw) out.gen_kw = pw[1].replace(',', '.');
      if (cb && clean(cb[1])) out.gen_comb = /gas\s+naturale|metano/i.test(cb[1]) ? 'Metano' : title(cb[1]);
      break;
    }
    // Foglio impianto del gestionale: "0 VAILLANT - VM 356/3-5 - matricola   27/10/2010 Si"
    if (!out.gen_marca) {
      m = t.match(/^\s*\d+\s+([A-Za-z][A-Za-z0-9 .&]+?)\s+-\s+(.+?)\s+-\s+.*?(\d{2}\/\d{2}\/\d{4})/m);
      if (m) { out.gen_marca = title(m[1]) + ' ' + clean(m[2]); out.gen_anno = m[3].slice(6); }
    }
    if (!out.gen_anno) {
      m = t.match(/Data\s+(?:di\s+)?installazione[:\s]+(\d{2}\/\d{2}\/(\d{4}))/i) || t.match(/Anno\s+(?:di\s+)?installazione[:\s]+(\d{4})/i);
      if (m) out.gen_anno = m[2] || m[1];
    }
    if (!out.gen_kw) { m = t.match(/Potenza\s+(?:termica\s+)?(?:utile\s+)?nominale[^\d]{0,20}([\d]+(?:[.,]\d+)?)\s*\(?kW/i); if (m) out.gen_kw = m[1].replace(',', '.'); }
    // Condensazione solo se il testo la afferma in modo esplicito (es. "caldaia a condensazione" nel modello)
    if (out.gen_marca && /condens/i.test(out.gen_marca)) out.gen_cond = 'Sì';
    return out;
  }

  root.Libretto = { parseLibretto };
  if (typeof module !== 'undefined') module.exports = { parseLibretto };
})(typeof window !== 'undefined' ? window : globalThis);
