'use strict';
/* Esportazioni per Termolog:
   1) Info_APE.txt  - scheda di testo nel formato di lavoro (da trascrivere / copiare in Termolog)
   2) XML con la struttura dei dati di input del CENED (SPERIMENTALE: da provare con l'importazione di Termolog) */
(function (root) {
  const esc = v => String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const f = v => (v == null || String(v).trim() === '' ? '' : String(v).trim());
  const arr = v => Array.isArray(v) ? v.join(', ') : f(v);
  const gis = d => (d.geo_lat && d.geo_lon) ? String(d.geo_lat).replace('.', ',') + ' ' + String(d.geo_lon).replace('.', ',') : '';
  const isoDay = s => { const t = f(s); return t ? t.slice(0, 10) : ''; };
  const itDay = s => { const t = isoDay(s); return t ? t.slice(8, 10) + '/' + t.slice(5, 7) + '/' + t.slice(0, 4) : ''; };
  function splitVia(ind) { const m = f(ind).match(/^(.*?)(?:,?\s+(?:n\.?\s*)?(\d+[A-Za-z]?(?:\/\w+)?))?$/); return { via: f(m && m[1]), civ: f(m && m[2]) }; }

  function buildInfoApe(d) {
    const cat = [d.sez && 'SEZ. ' + d.sez, d.fg && 'F. ' + d.fg, d.mapp && 'PART. ' + d.mapp, d.sub && 'SUB. ' + d.sub, d.categoria && 'CAT. ' + d.categoria].filter(Boolean).join(' ');
    const ind = [f(d.indirizzo), f(d.comune)].filter(Boolean).join(', ');
    const nome = [f(d.cognome), f(d.nome)].filter(Boolean).join(' ');
    const motivo = d.finalita === 'Altro' && d.finalita_altro ? d.finalita_altro : f(d.finalita);
    const gen = [d.gen === 'Altro' && d.gen_altro ? d.gen_altro : d.gen, d.gen_cond === 'Sì' && 'a condensazione', f(d.gen_marca), f(d.gen_kw) && f(d.gen_kw) + ' kW', f(d.gen_comb), d.curit && 'CURIT ' + d.curit, d.gen_anno].filter(Boolean).join(' / ');
    const split = d.clima === 'Presenti' ? [f(d.split), (d.clima_int || d.clima_est) && 'unità ' + (d.clima_int || '?') + ' int / ' + (d.clima_est || '?') + ' est', d.clima_anno].filter(Boolean).join(' / ') : (d.clima === 'Assenti' ? 'assenti' : f(d.split));
    const acs = d.acs === 'Altro' && d.acs_altro ? d.acs_altro : f(d.acs);
    const lavori = [d.interventi, d.cappotto && d.cappotto !== 'Assente' && 'isolamento: ' + (d.cappotto === 'Altro isolamento' && d.cappotto_altro ? d.cappotto_altro : d.cappotto) + (d.cappotto_anno ? ' ' + d.cappotto_anno : ''), d.vetro && 'vetro ' + d.vetro, d.telaio && 'telaio ' + d.telaio].filter(Boolean).join('; ');
    const L = [
      'Dati catastali:\t\t- ' + cat,
      'Indirizzo immobile:\t- ' + ind,
      'Coordinate GIS\t\t- ' + gis(d),
      '',
      'Proprietà:\t\t- ' + nome,
      'C.F.:\t\t\t- ' + f(d.cf),
      'Residenza:\t\t- ',
      'Tel.:\t\t\t- ' + f(d.tel),
      'E-mail:\t\t\t- ' + f(d.email),
      '',
      'Motivo:\t\t\t' + motivo,
      'Piano:\t\t\t' + [f(d.piano), d.posizione].filter(Boolean).join(' - '),
      'N. piani edificio:\t' + f(d.num_piani),
      'Anno:\t\t\t' + f(d.anno_costr),
      'Num. UIU:\t\t' + f(d.num_uiu),
      'Data commessa:\t\t' + itDay(d.data_commessa),
      'Caldaia/Curit/Anno:\t' + gen,
      'Split,num,Anno:\t\t' + split,
      'Acs (se disp)/tipo/anno:\t' + acs,
      'lavori(serr/isol/ecc):\t' + lavori,
      '',
      'Data sopralluogo:\t' + itDay(d.data_sopralluogo),
      'Note:\t\t\t' + [d.particolarita, d.interventi && '', d.referente && 'referente ' + d.referente + (d.tel_ref ? ' ' + d.tel_ref : ''), d.disponibilita && 'disponibilità ' + d.disponibilita].filter(Boolean).join(' | ')
    ];
    return L.join('\r\n') + '\r\n';
  }

  /* Impianto di riscaldamento a caldaia a gas (valori dedotti da pratiche Termolog gia chiuse).
     Emesso solo se sono noti potenza e condensazione: i valori di default (80/65 °C, tubazioni, ecc.) vanno verificati in Termolog. */
  function buildImpianti(d, A) {
    const kw = parseFloat(f(d.gen_kw).replace(',', '.'));
    const cond = d.gen_cond === 'Sì', noncond = d.gen_cond === 'No';
    if (d.gen !== 'Caldaia' || !(kw > 0) || !(cond || noncond)) return '';
    const n = x => { const v = String(Math.round(x * 100) / 100); return v.indexOf('.') < 0 ? v + '.0' : v; };
    const anno = f(d.gen_anno).replace(/\D/g, '').slice(0, 4);
    const annoMan = isoDay(d.data_sopralluogo).slice(0, 4) || String(new Date().getFullYear());
    return '<d:impianti><d:sistemiImpiantistici>' +
      '<d:sistemiAcs><d:sistema' + A('id', '1') + A('ricircolo', 'false') + A('accumulo', 'false') + A('tipoIsolamento', '3') + A('circolazioneAcquaFredda', 'false') + A('produzioneSeparata', 'false') + A('rifCentraleTermica', '1') + A('nome', 'impianto acs 1') + '/></d:sistemiAcs>' +
      '<d:sistemiRisc priorita="false" prioritaNormativa="false"><d:sistema' + A('id', '1') + A('priorita', '1') + A('tipoSistemaRisc', '1') + A('prioritaTerminali', 'false') + A('tabellare', 'true') + A('tipologiaImpiantoDistribuzione', '1') + A('livelloIsolamentoTubazioni', '1') + A('posizioneImmobiliareAutonoma', '1') + A('temperaturaMandataProgettoTabellare', '80.0') + A('temperaturaRitornoProgettoTabellare', '65.0') + A('modalitaFunzionamentoPompe', '1') + A('potenzaNominaleTotale', n(kw)) + A('potenzaElettricaAssorbitaTabellare', '0.0') + A('rifCentraleTermica', '1') + A('regolazioneMandata', '1') + A('temperaturaMandataPrimaria', '80.0') + A('nome', 'riscaldamento ad acqua 1') + A('edificioPrevalenzaResidenziale', 'true') + '/></d:sistemiRisc>' +
      '</d:sistemiImpiantistici>' +
      '<d:centraliTermiche><d:centraleTermica' + A('id', '1') + A('prioritaNormativa', 'false') + A('collegamentoPrimarioCentrale', '1') + A('temperaturaMandataCentrale', '80.0') + A('proporzionamentoGeneratore', 'true') + '><d:generatori>' +
      '<d:gruppoGeneratoriCombustione' + A('funzionaInCombinato', 'true') + A('tipoGeneratoreCombustione', cond ? '6' : '5') + A('potenza12831', 'false') + A('annoInstallazione', '1') + A('ubicazioneGeneratore', '2') + A('altezzaCamino', '1') + (cond ? A('theta_gn_fumi_des', '30.0') : '') + A('funzionamentoStagionaleAcs', '1') + A('id', '1') + A('tipoVettoreEnergetico', '1') + A('modalitaFiamma', '3') + A('modalitaCascata', '1') + A('priorita', '1') + '>' +
      '<d:generatoreCombustione' + A('id', '1') + A('prioritaGeneratore', '1') + A('fc_gn_lim_min', '0.0') + A('fc_gn_lim_max', '1.0') + A('phi_h_gn_out_n', n(kw)) + A('phi_w_gn_out_n', n(kw)) + A('phi_h_gn_out_min', n(kw * 0.3)) + A('phi_w_gn_out_min', n(kw * 0.3)) + (anno ? A('annoInstallazioneImpianto', anno) : '') + A('annoManutenzioneImpianto', annoMan) + A('codiceImpianto', f(d.curit)) + '/>' +
      '</d:gruppoGeneratoriCombustione></d:generatori></d:centraleTermica></d:centraliTermiche></d:impianti>';
  }

  function buildCenedXml(d, info) {
    const A = (k, v) => ' ' + k + '="' + esc(v) + '"';
    const { via, civ } = splitVia(d.indirizzo);
    const prov = info ? info.provIstat : '', com = info ? info.istat : '';
    const nsub = f(d.num_uiu).replace(/\D/g, '') || '1';
    const anno = f(d.anno_costr).replace(/\D/g, '').slice(0, 4);
    const day = isoDay(d.data_sopralluogo);
    const mot = d.finalita === 'Vendita' ? A('motivazionePassaggioProprieta', 'true')
      : d.finalita === 'Locazione' ? A('motivazioneLocazione', 'true')
      : d.finalita === 'Fine lavori' ? A('motivazioneNuovaCostruzione', 'true')
      : A('motivazioneAltro', 'true') + A('motivazioneDescrizioneAltro', (d.finalita === 'Altro' && d.finalita_altro) || 'Ape volontario');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<c:calcolo xmlns:d="http://www.cened.it/cenedplus2/datiCalcolo" xmlns:s="http://www.cened.it/cenedplus2/servizi" xmlns:sd="http://www.cened.it/cenedplus2/struttureDati" xmlns:c="http://www.cened.it/cenedplus2/calcolo" xmlns:ns5="http://www.cened.it/cenedplus2/licenza">' +
      '<c:datiInput><d:certificazione>' +
      '<d:datiAnagrafici noteInvolucro="" noteImpianto="" noteFer="" noteApe="" proprietaPubblica="false" usoPubblico="false">' +
      '<d:motivazioni' + mot + '/>' +
      '<d:amministratore esisteAmministratore="false"/></d:datiAnagrafici>' +
      '<d:datiEdificio' + A('numeroPiani', f(d.num_piani).replace(/\D/g, '') || '1') + A('tipoEdificio', '1') + A('tipoPermeabilitaEdificio', '1') +
      A('provincia', prov) + A('comune', com) + A('provinciaCatastale', prov) + A('comuneCatastale', com) + A('sezioneAmministrativa', '') + A('sezioneUrbana', f(d.sez)) +
      A('foglio', f(d.fg)) + A('particella', f(d.mapp)) + A('numeroSopralluoghi', '1') + A('usoDatiProgetto', 'false') + A('piano', f(d.piano)) + A('coordinateGis', gis(d)) +
      A('internoEdificio', '') + A('indirizzo', via) + A('civico', civ) + A('f_p_ren_th', '0.0') + A('f_p_nren_th', '1.5') + '>' +
      '<d:subalterni' + A('numeroSubalterni', nsub) + '><d:subalterno' + A('id', '1') + A('periodoCostruzione', '2') + (anno ? A('anno', anno) : '') + A('interventiEseguiti', 'false') + A('numeroProprietari', '1') + A('subalternoNumero', f(d.sub)) + A('nomeSubalterno', f(d.sub)) + '/></d:subalterni>' +
      buildImpianti(d, A) +
      '<d:sopralluoghi><d:sopralluogo' + A('idSopralluogo', '1') + A('dataSopralluogo', day) + A('descrizioneSopralluogo', 'Sopralluogo') + '/></d:sopralluoghi>' +
      '</d:datiEdificio>' +
      '<d:campiApe oggettoAttestato="3" edificioNzeb="false" tipologiaEdilizia="1" tipologiaCostruttiva="1"/>' +
      '</d:certificazione></c:datiInput></c:calcolo>';
  }
  root.Termolog = { buildInfoApe, buildCenedXml };
  if (typeof module !== 'undefined') module.exports = { buildInfoApe, buildCenedXml };
})(typeof window !== 'undefined' ? window : globalThis);
