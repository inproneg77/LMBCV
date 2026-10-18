let ESTADO_J = null;

async function iniciarJugador() {
  const initialParams=new URLSearchParams(window.location.search);
  ESTADO_J = await cargarDatos({publico:'jugador',jugador:initialParams.get('id')||'',temporada:initialParams.get('temporada')||undefined});
  renderPatrocinadores(ESTADO_J.patrocinadores);

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  render(id);
}

// Junta todas las líneas de estadística de este jugador, en TODAS las
// categorías/temporadas/juegos donde haya participado — recorriendo los
// mismos ESTADO_J.juegosOficiales que ya carga datos.js (nada de datos nuevos).
function bitacoraDe(jugadorId, juegos = ESTADO_J.juegosOficiales) {
  const filas = [];
  juegos.forEach(j => {
    if (j.estatus !== 'jugado') return;
    const coincide = e => esAmistoso(j)
      ? mismoRegistroAmistoso(e.jugador, jugadorId, ESTADO_J.jugadoresPorId)
      : e.jugador === jugadorId;
    const esLocal = (j.estadisticas_local ?? j.estadisticas ?? []).some(coincide);
    const esVisita = (j.estadisticas_visita ?? []).some(coincide);
    if (!esLocal && !esVisita) return;

    const lista = esLocal ? (j.estadisticas_local ?? j.estadisticas) : j.estadisticas_visita;
    const linea = lista.find(coincide);
    if (String(linea.asistio) === 'false') return;

    const propioId = esLocal ? j.local : j.visita;
    const rivalId = esLocal ? j.visita : j.local;
    const marcadorPropio = esLocal ? j.marcador_local : j.marcador_visita;
    const marcadorRival = esLocal ? j.marcador_visita : j.marcador_local;

    filas.push({
      juego: j,
      equipoId: propioId,
      rivalId,
      gano: marcadorPropio > marcadorRival,
      marcadorPropio, marcadorRival,
      puntos: Number(linea.puntos ?? 0),
      triples: Number(linea.triples ?? 0),
      faltas: Number(linea.faltas ?? 0),
    });
  });
  return filas.sort((a,b) => b.juego.fecha.localeCompare(a.juego.fecha));
}

function contarMVP(jugadorId) {
  if(ESTADO_J.playerSummary?.player?.id===jugadorId)return ESTADO_J.playerSummary.mvp;
  return ESTADO_J.juegosOficiales.filter(j => j.estatus === 'jugado' && j.mvp_jugador === jugadorId).length;
}

// Agrupa las filas de la bitácora por categoría + temporada + equipo — cada
// combinación es un "capítulo" separado, con sus propios totales/promedios.
function agruparPorTemporada(bitacora) {
  const grupos = {};
  bitacora.forEach(f => {
    const clave = `${f.juego.categoria_id}|${f.juego.temporada}|${f.equipoId}`;
    (grupos[clave] ??= { categoriaId: f.juego.categoria_id, temporadaId: f.juego.temporada, equipoId: f.equipoId, filas: [] }).filas.push(f);
  });

  return Object.values(grupos)
    .map(g => {
      const t = g.filas.reduce((acc, f) => ({
        jj: acc.jj + 1,
        puntos: acc.puntos + f.puntos,
        triples: acc.triples + f.triples,
        faltas: acc.faltas + f.faltas,
      }), { jj: 0, puntos: 0, triples: 0, faltas: 0 });
      return { ...g, totales: t };
    })
    .sort((a, b) => (b.temporadaId ?? '').localeCompare(a.temporadaId ?? ''));
}

function render(id) {
  const cont = document.getElementById('contenido');
  const tituloWrap = document.getElementById('jugador-header');

  if (!id) {
    cont.innerHTML = `<div class="empty">No se especificó ningún jugador. Regresa a Equipos, Líderes o Rankings y da clic en un nombre.</div>`;
    return;
  }

  const jugador = ESTADO_J.jugadoresPorId[id];
  const bitacora = bitacoraDe(id);

  if (!jugador && bitacora.length === 0) {
    cont.innerHTML = `<div class="empty">No se encontró este jugador.</div>`;
    return;
  }

  const totalCarrera = ESTADO_J.playerSummary?.totals || bitacora.reduce((acc, f) => ({
    jj: acc.jj + 1,
    puntos: acc.puntos + f.puntos,
    triples: acc.triples + f.triples,
    faltas: acc.faltas + f.faltas,
  }), { jj: 0, puntos: 0, triples: 0, faltas: 0 });

  const vecesMVP = contarMVP(id);
  const promPts = totalCarrera.jj ? (totalCarrera.puntos / totalCarrera.jj).toFixed(1) : '0.0';
  const promTriples = totalCarrera.jj ? (totalCarrera.triples / totalCarrera.jj).toFixed(1) : '0.0';
  const grupos = agruparPorTemporada(bitacora);

  const membresias = ESTADO_J.jugadores.filter(j => j.id === id);
  const equiposTexto = [...new Map(membresias.map(m => [m.equipo_id, m])).values()]
    .map(m => ESTADO_J.equiposPorId[m.equipo_id]?.nombre)
    .filter(Boolean)
    .join(' · ');

  tituloWrap.innerHTML = `
    <div class="profile-identity"><div class="profile-avatar" aria-hidden="true">${jugador?.foto&&/^img\/jugadores\/(?:optimized\/)?[a-zA-Z0-9_-]+\.(?:png|webp|jpg|jpeg)$/i.test(jugador.foto)?`<img src="../${escaparHTML(jugador.foto)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`:escaparHTML((jugador?.nombre||'Jugador').trim().split(/\s+/).slice(0,2).map(n=>n[0]).join(''))}</div><div><div class="hero__eyebrow">Perfil de jugador</div>
    <h1 class="hero__title">${escaparHTML(jugador?.nombre ?? 'Jugador')}</h1>
    <p class="hero__sub">${equiposTexto || 'Sin equipo asignado'}${jugador?.numero ? ` · #${jugador.numero}` : ''}</p></div></div>
  `;

  if(typeof LMBCPlayerCard!=='undefined'&&tituloWrap.querySelector){
    const host=document.createElement('div');host.className='no-print';tituloWrap.append(host);
    const scopes=opcionesTarjetaJugador(id),params=new URLSearchParams(location.search),season=params.get('temporada')||FanCore.activeSeason(ESTADO_J.temporadas);
    const kind=params.get('vista')==='amistosos'?'amistosos':'oficial';
    const career=params.get('tarjeta')==='trayectoria'||(!params.get('tarjeta')&&!params.get('temporada')&&!params.get('categoria')&&!params.get('equipo'));
    let match=scopes.findIndex(s=>(career?s.model.type==='career':s.model.seasonId===season&&(!params.get('categoria')||s.model.categoryId===params.get('categoria'))&&(!params.get('equipo')||s.model.teamId===params.get('equipo')))&&s.kind===kind);
    if(match<0)match=scopes.findIndex(s=>s.kind===kind);
    LMBCPlayerCard.mount(host,{scopes,selected:Math.max(0,match),view:params.get('lado')==='reverso'?'back-'+Math.max(0,Number(params.get('pagina')||1)-1):'front'});
  }

  cont.innerHTML = `
    ${ESTADO_J.playerSummary?'<section class="profile-history no-print" aria-label="Consultar temporadas anteriores"><p>Los totales oficiales incluyen toda la trayectoria. Las participaciones se cargan por temporada.</p><div class="game-actions">'+Object.keys(ESTADO_J.playerSummary.seasons).sort().reverse().filter(s=>!ESTADO_J.loadedProfileSeasons().includes(s)).map(s=>'<button type="button" data-player-season="'+escaparHTML(s)+'">Cargar '+escaparHTML(ESTADO_J.temporadas.find(t=>t.id===s)?.nombre||s)+'</button>').join('')+'</div><p role="status" id="player-history-status"></p></section>':''}
    <div data-profile-root>${typeof ArenaUI!=='undefined'?ArenaUI.switches():''}<section id="profile-oficial" data-profile-panel="oficial" aria-label="Estadísticas oficiales">
    <h3 class="lideres__titulo display">Total oficial (todas las temporadas y equipos)</h3>
    <div class="dash-metricas">
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.jj}</div><div class="dash-metrica__label">Juegos jugados</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.puntos}</div><div class="dash-metrica__label">Puntos totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.triples}</div><div class="dash-metrica__label">Triples totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${vecesMVP}</div><div class="dash-metrica__label">Veces MVP</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${promPts}</div><div class="dash-metrica__label">Pts / Juego</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${promTriples}</div><div class="dash-metrica__label">3pt / Juego</div></div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:30px;">Desglose por Temporada, Categoría y Equipo</h3>
    ${grupos.length === 0 ? '<div class="empty">No hay estadísticas oficiales en las temporadas cargadas.</div>' : grupos.map(g => renderGrupo(g)).join('')}
    </section><section id="profile-amistosos" data-profile-panel="amistosos" aria-label="Estadísticas de amistosos" ${typeof ArenaUI!=='undefined'?'hidden':''}>
    <h3 class="lideres__titulo display" style="margin-top:30px;">Amistosos — fuera de los totales oficiales</h3>
    ${agruparPorTemporada(bitacoraDe(id, ESTADO_J.juegosAmistosos)).map(g => renderGrupo(g)).join('') || '<div class="empty">Sin participaciones en amistosos en las temporadas cargadas.</div>'}
    </section></div>
  `;
  cont.querySelectorAll?.('[data-player-season]').forEach(button=>button.onclick=async()=>{
    button.disabled=true;const status=document.getElementById('player-history-status');status.textContent='Cargando participaciones…';
    const friendlyVisible=!cont.querySelector('#profile-amistosos').hidden;
    try{await ESTADO_J.ensureSeason(button.dataset.playerSeason);render(id);if(friendlyVisible){cont.querySelectorAll('[data-profile-panel]').forEach(el=>el.hidden=el.dataset.profilePanel!=='amistosos');cont.querySelectorAll('[data-profile-show]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.profileShow==='amistosos')));}}
    catch(error){button.disabled=false;status.textContent='No se pudo cargar esta temporada. Puedes reintentar.';}
  });
  if(typeof LMBCDownloads!=='undefined'){
    for(const kind of ['oficial','amistosos']){
      const groups=agruparPorTemporada(bitacoraDe(id,kind==='oficial'?ESTADO_J.juegosOficiales:ESTADO_J.juegosAmistosos));
      cont.querySelectorAll('#profile-'+kind+' .jugador-grupo').forEach((block,i)=>{
        const model=imagenJugador(groups[i],kind,id),table=block.querySelector('table');
        block.id=decodeURIComponent(new URL(model.page).hash.slice(1));table.id='player-table-'+kind+'-'+i;
        LMBCDownloads.mount({...model,tableSelector:'#'+table.id,prepare:snapshot=>({...snapshot,...model})});
      });
    }
  }
  if(typeof location!=='undefined'&&new URLSearchParams(location.search).get('vista')==='amistosos'){
    cont.querySelectorAll('[data-profile-panel]').forEach(el=>el.hidden=el.dataset.profilePanel!=='amistosos');
    cont.querySelectorAll('[data-profile-show]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.profileShow==='amistosos')));
  }
}

function opcionesTarjetaJugador(id){
  const player=ESTADO_J.jugadoresPorId[id];if(!player)return [];
  const groups=new Map(),key=g=>[g.kind,g.categoriaId,g.temporadaId,g.equipoId].join('|');
  const actual=ESTADO_J.playerSummary?.groups||[
    ...agruparPorTemporada(bitacoraDe(id)).map(g=>({...g,kind:'oficial'})),
    ...agruparPorTemporada(bitacoraDe(id,ESTADO_J.juegosAmistosos)).map(g=>({...g,kind:'amistosos'}))
  ];
  for(const g of actual)groups.set(key(g),g);
  for(const m of ESTADO_J.jugadores.filter(p=>p.id===id)){
    const g={kind:'oficial',categoriaId:m.categoria_id,temporadaId:m.temporada,equipoId:m.equipo_id,totales:{jj:0,puntos:0,triples:0}};
    if(g.categoriaId&&g.temporadaId&&g.equipoId&&!groups.has(key(g)))groups.set(key(g),g);
  }
  const scopes=[...groups.values()].sort((a,b)=>String(b.temporadaId).localeCompare(String(a.temporadaId))).map(g=>{
    const team=ESTADO_J.equiposPorId[g.equipoId],category=ESTADO_J.categorias.find(c=>c.id===g.categoriaId),season=ESTADO_J.temporadas.find(t=>t.id===g.temporadaId);
    const page=new URL(location.href);page.searchParams.set('id',id);page.searchParams.set('categoria',g.categoriaId);page.searchParams.set('equipo',g.equipoId);page.searchParams.set('temporada',g.temporadaId);page.searchParams.set('vista',g.kind);page.searchParams.set('tarjeta','temporada');page.searchParams.delete('lado');page.searchParams.delete('pagina');page.hash='';
    const model=LMBCPlayerCard.profileModel({player,team,category,season,group:g,kind:g.kind,page:page.href});model.sponsors=ESTADO_J.patrocinadores||[];
    return {kind:g.kind,label:[model.season,model.category,model.team,model.kind].filter(Boolean).join(' · '),model};
  });
  const careers=[];
  for(const kind of ['oficial','amistosos']){
    const rows=scopes.filter(s=>s.kind===kind&&s.model.totals.jj>0).map(({model:m})=>({team:m.team,teamLogo:m.teamLogo,teamId:m.teamId,category:m.category,categoryId:m.categoryId,season:m.season,seasonId:m.seasonId,totals:m.totals}));
    if(!rows.length)continue;
    const page=new URL(location.href);for(const key of ['categoria','equipo','temporada','lado','pagina'])page.searchParams.delete(key);page.searchParams.set('id',id);page.searchParams.set('vista',kind);page.searchParams.set('tarjeta','trayectoria');page.hash='';
    const model=LMBCPlayerCard.careerModel({player,rows,kind,totals:kind==='oficial'?ESTADO_J.playerSummary?.totals:undefined,mvp:kind==='oficial'?contarMVP(id):undefined,page:page.href,sponsors:ESTADO_J.patrocinadores||[]});
    careers.push({kind,label:kind==='oficial'?'Trayectoria oficial · Todos sus equipos y categorías':'Historial de amistosos · Todos sus equipos y categorías',model});
  }
  return [...careers,...scopes];
}

function imagenJugador(g,kind,id){
  const player=ESTADO_J.jugadoresPorId[id],team=ESTADO_J.equiposPorId[g.equipoId];
  const page=new URL(location.href);page.searchParams.set('id',id);page.searchParams.set('vista',kind);page.searchParams.set('categoria',g.categoriaId);page.searchParams.set('equipo',g.equipoId);page.searchParams.set('tarjeta','temporada');page.searchParams.delete('lado');page.searchParams.delete('pagina');page.searchParams.set('temporada',g.temporadaId);page.hash='player-'+kind+'-'+encodeURIComponent([g.categoriaId,g.temporadaId,g.equipoId].join('-'));
  return {title:player?.nombre||'Jugador',category:ESTADO_J.categorias.find(c=>c.id===g.categoriaId)?.nombre||g.categoriaId,season:ESTADO_J.temporadas.find(t=>t.id===g.temporadaId)?.nombre||g.temporadaId,subtitle:(kind==='amistosos'?'Amistosos':'Liga · oficiales')+' · '+(team?.nombre||'Equipo'),teamLogo:team?.logo,
    headers:['Fecha','Rival / equipo','Pts','3pt','Faltas'],
    rows:[...g.filas.map(f=>({cells:[formatearFecha(f.juego.fecha).texto,ESTADO_J.equiposPorId[f.rivalId]?.nombre||f.rivalId,String(f.puntos),String(f.triples),String(f.faltas)],logos:['',new URL(RUTA_IMG+(ESTADO_J.equiposPorId[f.rivalId]?.logo||'img/equipos/placeholder.svg'),location.href).href]})),{cells:['Total',g.totales.jj+' juegos',String(g.totales.puntos),String(g.totales.triples),String(g.totales.faltas)],logos:[]}],
    note:'Participaciones capturadas en este equipo, categoría y temporada. '+(kind==='amistosos'?'Independientes de los totales oficiales.':'Estadísticas oficiales de liga.'),sponsors:ESTADO_J.patrocinadores,page:page.href};
}

function renderGrupo(g) {
  const categoria = ESTADO_J.categorias.find(c => c.id === g.categoriaId);
  const temporada = ESTADO_J.temporadas.find(t => t.id === g.temporadaId);
  const equipo = ESTADO_J.equiposPorId[g.equipoId];
  const prom = (v) => g.totales.jj ? (v / g.totales.jj).toFixed(1) : '0.0';

  return `
    <div class="jugador-grupo">
      <div class="jugador-grupo__titulo">
        <img src="${RUTA_IMG}${escaparHTML(equipo?.logo ?? 'img/equipos/placeholder.svg')}" alt="">
        <div>
          <b>${escaparHTML(equipo?.nombre ?? '—')}</b>
          <span>${escaparHTML(categoria?.nombre ?? g.categoriaId)} · ${escaparHTML(temporada?.nombre ?? g.temporadaId ?? 'Sin temporada')}</span>
        </div>
      </div>
      <div class="table-scroll">
        <table class="standing-table">
          <thead><tr><th>JJ</th><th>Pts</th><th>3pt</th><th>Faltas</th><th>Pts/J</th><th>3pt/J</th><th>Faltas/J</th></tr></thead>
          <tbody>
            <tr>
              <td>${g.totales.jj}</td>
              <td class="mono">${g.totales.puntos}</td>
              <td class="mono">${g.totales.triples}</td>
              <td class="mono">${g.totales.faltas}</td>
              <td class="mono" style="font-weight:700;">${prom(g.totales.puntos)}</td>
              <td class="mono" style="font-weight:700;">${prom(g.totales.triples)}</td>
              <td class="mono" style="font-weight:700;">${prom(g.totales.faltas)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="jugador-grupo__bitacora">
        ${[...g.filas].sort((a,b) => b.juego.fecha.localeCompare(a.juego.fecha)).map(f => renderFilaBitacora(f, false)).join('')}
      </div>
    </div>
  `;
}

function renderFilaBitacora(f, mostrarTemporada = true) {
  const equipo = ESTADO_J.equiposPorId[f.equipoId];
  const rival = ESTADO_J.equiposPorId[f.rivalId];
  const { texto } = formatearFecha(f.juego.fecha);
  const temporada = ESTADO_J.temporadas.find(t => t.id === f.juego.temporada)?.nombre ?? f.juego.temporada ?? '';

  return `
    <div class="historial-item" style="grid-template-columns: auto 1fr auto auto auto auto;">
      <span class="historial-item__resultado ${f.gano ? 'gano' : 'perdio'}">${f.gano ? 'G' : 'P'}</span>
      <span class="historial-item__rival">${escaparHTML(equipo?.nombre ?? '—')} vs ${escaparHTML(rival?.nombre ?? '—')}</span>
      <span class="mono">${f.marcadorPropio}-${f.marcadorRival}</span>
      <span class="mono" title="Puntos / Triples / Faltas">${f.puntos}p · ${f.triples}t · ${f.faltas}f</span>
      <span class="historial-item__fecha mono">${texto}</span>
      ${mostrarTemporada ? `<span class="historial-item__fecha mono">${temporada}</span>` : ''}
    </div>
  `;
}

iniciarJugador();
