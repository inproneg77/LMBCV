// Carga los archivos de datos del sitio. Equipos, juegos y playoffs viven
// separados por categoría (así el panel /admin solo ofrece equipos de esa
// categoría, y cada bracket de playoffs es independiente).

// RUTA_IMG: prefijo relativo hacia la raíz del sitio. La página principal
// no necesita nada (''), pero las páginas en subcarpetas (standing/,
// playoffs/, valiosos/) necesitan '../' para que las imágenes carguen bien.
const RUTA_IMG = window.RUTA_IMG || '';
const catalogCache = new Map();

// fetch con tiempo límite y reintento. En datos móviles (a diferencia de
// wifi) una petición se puede quedar "colgada" sin fallar ni responder
// nunca — como antes usábamos Promise.all sin límite de tiempo, bastaba con
// que UNA de las ~16 peticiones se trabara para que el sitio completo se
// quedara cargando para siempre. Con esto, cada una tiene máximo 9s por
// intento (2 intentos), y si de plano falla, se informa el error sin mostrar estadísticas incompletas.
async function fetchJSON(url, valorPorDefecto = {}, intentos = 2) {
  const catalog = /^data\/(categorias|sedes|patrocinadores|equipos|roster|temporadas)\.json$/.test(url);
  const cached = catalogCache.get(url);
  if (catalog && cached && Date.now()-cached.at < 30000) return cached.value;
  for (let i = 0; i < intentos; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
      if (res.status === 404 && /data\/(juegos_[^/]+\/|playoffs_)/.test(url)) { clearTimeout(timeoutId); return valorPorDefecto; }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      clearTimeout(timeoutId);
      if (catalog) catalogCache.set(url, {at:Date.now(),value:data});
      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === intentos - 1) {
        console.warn('No se pudo cargar', url, err);
        if(typeof window.dispatchEvent==='function' && typeof CustomEvent==='function')window.dispatchEvent(new CustomEvent('lmbc:data-error'));
        throw new Error('No se pudo cargar '+url+'. Reintenta antes de consultar estadísticas.');
      }
      await new Promise(r => setTimeout(r, 500)); // pequeña pausa antes de reintentar
    }
  }
  return valorPorDefecto;
}

async function cargarDatos(opciones = {}) {

  // Los juegos ya no viven en UN archivo por categoría que crece para
  // siempre (eso era lo que hacía lenta la captura en /admin — Decap CMS
  // re-renderiza la lista completa en cada tecla, y entre más juegos
  // acumulados, más lento). Ahora es un archivo chico por categoría +
  // temporada. Para saber qué archivos pedir necesitamos la lista de
  // temporadas primero — por eso esta petición va aparte, antes del resto.
  // Independent catalogs start immediately, alongside the season index.
  const catalogRequests = [
    fetchJSON('data/categorias.json', []),
    fetchJSON('data/sedes.json', { sedes: [] }),
    fetchJSON('data/patrocinadores.json', { patrocinadores: [] }),
    fetchJSON('data/equipos.json', { equipos: [] }),
    opciones.roster === false ? Promise.resolve({jugadores:[]}) : fetchJSON('data/roster.json', { jugadores: [] }),
    opciones.amistosos === false ? Promise.resolve({equipos:[],jugadores:[],juegos:[]}) : fetchJSON('data/amistosos.json', { equipos: [], jugadores: [], juegos: [] }),
  ];
  Promise.allSettled(catalogRequests); // Attach rejection handlers while the season index is loading.
  const temporadasData = await fetchJSON('data/temporadas.json', { temporadas: [] });
  const temporadas = temporadasData.temporadas ?? [];
  const categoriasData = await catalogRequests[0];
  const CATS = (Array.isArray(categoriasData) ? categoriasData : []).map(c=>c.id);
  const activa = temporadas.find(t=>String(t.activa)==='true')?.id ?? [...temporadas].sort((a,b)=>b.id.localeCompare(a.id))[0]?.id;
  const seleccion = opciones.temporada === 'activa' || (opciones.temporada && !temporadas.some(t=>t.id===opciones.temporada)) ? activa : opciones.temporada;
  const idsTemporadas = temporadas.filter(t=>!seleccion||t.id===seleccion).map(t => t.id);

  const [categoriasRaw, sedesData, patrociniosData, equiposData, rosterData, amistososData, ...resto] = await Promise.all([
    ...catalogRequests,
    // Un archivo por cada combinación categoría × temporada. Si una
    // combinación no tiene archivo todavía (temporada nueva sin juegos
    // capturados en esa categoría), fetchJSON regresa vacío sin tronar.
    ...CATS.flatMap(cat => idsTemporadas.map(temp => fetchJSON(`data/juegos_${cat}/${temp}.json`, { juegos: [] }))),
    ...CATS.map(c => fetchJSON(`data/playoffs_${c}.json`, { series: [] })),
  ]);

  const categorias = Array.isArray(categoriasRaw) ? categoriasRaw : [];

  const nCombos = CATS.length * idsTemporadas.length;
  const juegosPorCombo = resto.slice(0, nCombos);
  const playoffsPorCat = resto.slice(nCombos);

  const sedes = sedesData.sedes ?? sedesData;
  const patrocinadores = patrociniosData.patrocinadores ?? patrociniosData ?? [];

  // Equipos: cada equipo vive en UN solo registro y puede pertenecer a
  // varias categorías a la vez (campo "categorias"). Para que el resto del
  // sitio (que sigue filtrando por una sola categoria_id, página por
  // página) no tenga que cambiar ni una línea, aquí "desplegamos" cada
  // equipo en una fila por cada categoría a la que pertenece.
  const equipos = (equiposData.equipos ?? []).flatMap(e =>
    (e.categorias ?? []).map(catId => ({ ...e, categoria_id: catId }))
  );

  // Jugadores: cada jugador vive en UN solo registro (su nombre no se
  // repite) y puede tener varias "membresías" — una por cada combinación de
  // categoría + equipo + temporada en la que haya jugado. Igual que con
  // equipos, se despliega una fila por membresía para mantener la misma
  // forma que usaba el resto del sitio.
  const jugadores = (rosterData.jugadores ?? []).flatMap(j =>
    (j.membresias ?? []).map(m => ({
      id: j.id,
      nombre: j.nombre,
      numero: j.numero,
      categoria_id: m.categoria_id,
      equipo_id: m.equipo_id,
      temporada: m.temporada,
    }))
  );

  // Reensamblar juegos: mismo resultado final que antes (un solo arreglo
  // plano con categoria_id agregado a cada juego), solo que ahora viene de
  // varios archivos chicos en vez de uno grande por categoría.
  const juegos = [];
  let idx = 0;
  for (const cat of CATS) {
    for (const temp of idsTemporadas) {
      const datos = juegosPorCombo[idx++];
      (datos.juegos ?? []).forEach(j => juegos.push({ ...j, categoria_id: cat }));
    }
  }

  juegos.push(...(amistososData.juegos ?? []).map(j => ({...j, fase: 'amistoso'})));

  const playoffs = CATS.flatMap((cat, i) =>
    (playoffsPorCat[i].series ?? []).map(s => ({ ...s, categoria_id: cat }))
  );

  const equiposPorId = Object.fromEntries([...(amistososData.equipos ?? []), ...equipos].map(e => [e.id, e]));
  const sedesPorId = Object.fromEntries(sedes.map(s => [s.id, s]));
  const jugadoresPorId = Object.fromEntries([...(amistososData.jugadores ?? []), ...(rosterData.jugadores ?? [])].map(j => [j.id, {...j,foto:window.LMBCImages?.source(j.foto)||j.foto}]));
  const juegosOficiales = juegos.filter(esJuegoOficial);
  const juegosAmistosos = juegos.filter(esAmistoso);

  const state = { categorias, sedes, equipos, juegos, juegosOficiales, juegosAmistosos, playoffs, jugadores, temporadas, patrocinadores, equiposPorId, sedesPorId, jugadoresPorId };
  const loaded = new Set(idsTemporadas), pending = new Map();
  state.ensureSeason = async season => {
    const ids = season ? [season] : temporadas.map(t=>t.id);
    await Promise.all(ids.filter(id=>temporadas.some(t=>t.id===id)).map(id=>{
      if(loaded.has(id))return;
      if(!pending.has(id))pending.set(id,(async()=>{
        const files=await Promise.all(CATS.map(cat=>fetchJSON(`data/juegos_${cat}/${id}.json`,{juegos:[]})));
        const rows=CATS.flatMap((cat,i)=>(files[i].juegos??[]).map(g=>({...g,categoria_id:cat})));
        state.juegos.push(...rows);state.juegosOficiales.push(...rows.filter(esJuegoOficial));state.juegosAmistosos.push(...rows.filter(esAmistoso));loaded.add(id);
      })().finally(()=>pending.delete(id)));
      return pending.get(id);
    }));
    return state;
  };
  state.ensureHistory = () => state.ensureSeason('');
  return state;
}

// Genera un selector de temporada (<select>) dentro de #temporada-selector.
// callback(temporadaId) se llama al iniciar (con la temporada marcada como
// activa, o la más reciente si ninguna lo está) y cada vez que cambie.
// Envuelve el nombre de un jugador en un link a su perfil (/jugador/?id=...).
// Se usa en Equipos, Líderes, Rankings, Dashboard y la hoja de estadísticas
// — un solo lugar para que el link sea consistente en todo el sitio.
function linkJugador(id, nombre) {
  if (!id) return escaparHTML(nombre ?? '—');
  return `<a href="${RUTA_IMG}jugador/?id=${encodeURIComponent(id)}" class="jugador-link">${escaparHTML(nombre ?? '—')}</a>`;
}

// Resuelve el nombre a mostrar como MVP: prioriza el jugador seleccionado por
// relación (mvp_jugador); si el juego es viejo y solo tiene texto libre
// (mvp_nombre), usa eso como respaldo.
function nombreMVP(juego, jugadoresPorId) {
  if (juego.mvp_jugador && jugadoresPorId[juego.mvp_jugador]) {
    return jugadoresPorId[juego.mvp_jugador].nombre;
  }
  return juego.mvp_nombre || null;
}

// Hoja de estadísticas completa de un juego: marcador, colectivos por
// equipo, individuales de cada jugador, y líderes del encuentro.
// Se usa tanto en Calendario (al expandir un juego) como en Equipos.
function renderHojaEstadistica(juego, ESTADO) {
  const local = ESTADO.equiposPorId[juego.local];
  const visita = ESTADO.equiposPorId[juego.visita];

  // Cada línea de estadística ya viene guardada bajo el equipo correcto
  // desde la captura (no se infiere del roster actual del jugador), así que
  // el historial no se rompe si un jugador cambia de equipo más adelante.
  const statsLocal = juego.estadisticas_local ?? juego.estadisticas ?? [];
  const statsVisita = juego.estadisticas_visita ?? [];

  const totales = (lista) => lista.reduce((acc, e) => ({
    puntos: acc.puntos + Number(e.puntos ?? 0),
    triples: acc.triples + Number(e.triples ?? 0),
    faltas: acc.faltas + Number(e.faltas ?? 0),
  }), { puntos: 0, triples: 0, faltas: 0 });

  const totLocal = totales(statsLocal);
  const totVisita = totales(statsVisita);

  const tablaEquipo = (nombreEquipo, lista, totales) => `
    <div class="hoja__equipo">
      <h4 class="hoja__equipo-nombre">${escaparHTML(nombreEquipo)}</h4>
      ${lista.length === 0 ? '<div class="empty" style="padding:16px;">Sin estadísticas capturadas.</div>' : `
        <div class="table-scroll">
          <table class="standing-table">
            <thead><tr><th style="text-align:left;">Jugador</th><th>Pts</th><th>3pt</th><th>Faltas</th></tr></thead>
            <tbody>
              ${lista.map(e => `
                <tr>
                  <td style="text-align:left;">${linkJugador(e.jugador, ESTADO.jugadoresPorId[e.jugador]?.nombre)}</td>
                  <td class="mono">${e.puntos ?? 0}</td>
                  <td class="mono">${e.triples ?? 0}</td>
                  <td class="mono">${e.faltas ?? 0}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:700; background:var(--baby-soft);">
                <td style="text-align:left;">Total</td>
                <td class="mono">${totales.puntos}</td>
                <td class="mono">${totales.triples}</td>
                <td class="mono">${totales.faltas}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Líderes del encuentro (entre ambos equipos)
  const todos = [...statsLocal, ...statsVisita].map(e => ({ ...e, nombre: ESTADO.jugadoresPorId[e.jugador]?.nombre ?? '—' }));
  const lider = (campo) => todos.length ? [...todos].sort((a,b) => (b[campo]??0) - (a[campo]??0))[0] : null;
  const liderPts = lider('puntos');
  const liderTrip = lider('triples');
  const liderFaltas = lider('faltas');

  return `
    <div class="hoja">
      <div class="hoja__marcador">
        <span>${escaparHTML(local?.nombre ?? '')}</span>
        <span class="mono" style="font-family:'Teko',sans-serif; font-size:26px;">${juego.marcador_local} – ${juego.marcador_visita}</span>
        <span>${escaparHTML(visita?.nombre ?? '')}</span>
      </div>
      <div class="hoja__equipos">
        ${tablaEquipo(local?.nombre ?? 'Local', statsLocal, totLocal)}
        ${tablaEquipo(visita?.nombre ?? 'Visita', statsVisita, totVisita)}
      </div>
      ${todos.length > 0 ? `
        <div class="hoja__lideres">
          ${liderPts ? `<div>🏀 Más puntos: <b>${escaparHTML(liderPts.nombre)}</b> (${liderPts.puntos ?? 0})</div>` : ''}
          ${liderTrip && liderTrip.triples > 0 ? `<div>🎯 Más triples: <b>${escaparHTML(liderTrip.nombre)}</b> (${liderTrip.triples})</div>` : ''}
          ${liderFaltas && liderFaltas.faltas > 0 ? `<div>🟨 Más faltas: <b>${escaparHTML(liderFaltas.nombre)}</b> (${liderFaltas.faltas})</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Genera un selector de temporada (<select>) dentro de #temporada-selector.
// callback(temporadaId) se llama al iniciar (con la temporada marcada como
// activa, o la más reciente si ninguna lo está) y cada vez que cambie.
function iniciarSelectorTemporada(temporadas, callback, estado) {
  const cont = document.getElementById('temporada-selector');
  if (!cont) return () => null;

  if (!temporadas || temporadas.length === 0) {
    cont.innerHTML = '';
    callback(null);
    return () => null;
  }

  const ordenadas = [...temporadas].sort((a,b) => b.id.localeCompare(a.id));
  const pedida = new URLSearchParams(window.location?.search||'').get('temporada');
  const porDefecto = ordenadas.find(t=>t.id===pedida)?.id ?? ordenadas.find(t => String(t.activa) === 'true')?.id ?? ordenadas[0].id;

  cont.innerHTML = `
    <select id="temporada-select" class="temporada-select" aria-label="Temporada de liga">
      ${ordenadas.map(t => `<option value="${t.id}" ${t.id === porDefecto ? 'selected' : ''}>${escaparHTML(t.nombre)}</option>`).join('')}
    </select>
  `;

  const select = document.getElementById('temporada-select');
  let version=0;
  select.addEventListener('change', async () => {
    const current=++version,value=select.value;
    window.LMBC?.write('lmbc_season',value);
    try{if(estado?.ensureSeason)await estado.ensureSeason(value);if(current!==version)return;callback(value);window.dispatchEvent?.(new CustomEvent('lmbc:context'));}
    catch(err){console.warn(err);}
  });
  callback(porDefecto);
  return () => select.value;
}

function renderPatrocinadores(patrocinadores) {
  const cont=document.getElementById('patrocinadores');if(!cont)return;
  const cards=(patrocinadores??[]).map(p=>{const image='<img src="'+escaparHTML(RUTA_IMG+p.logo)+'" alt="'+escaparHTML(p.nombre)+'" loading="lazy">';
    return /^https?:\/\//i.test(p.url??'')?'<a href="'+escaparHTML(p.url)+'" target="_blank" rel="noopener">'+image+'</a>':'<span class="sponsor-static">'+image+'</span>';});
  cont.innerHTML=cards.length?'<div class="patrocinadores__label">Con el apoyo de</div><div class="patrocinadores__grid">'+cards.join('')+'</div>':'';
}

// Genera las pestañas de categoría y engancha el cambio de pestaña activa.
// callback(categoriaId) se llama al iniciar y cada vez que cambian de pestaña.
// opciones.incluirTodos: si es true, agrega una pestaña "Todos" al inicio
// (callback recibe null) y esa queda seleccionada por default. Si se omite
// (como en el resto del sitio), el comportamiento es exactamente el de antes:
// arranca en la primera categoría.
function iniciarTabs(categorias, callback, opciones = {}) {
  const cats = [...categorias].sort((a,b) => a.orden - b.orden);
  const parametros = new URLSearchParams(window.location?.search||'');
  const pedida = parametros.has('categoria') ? parametros.get('categoria') : window.LMBC?.read('lmbc_category');
  let activa = cats.find(c=>c.id===pedida)?.id ?? (opciones.incluirTodos ? null : cats[0]?.id);

  const tabs = document.getElementById('tabs');
  const botonTodos = opciones.incluirTodos
    ? `<button class="tab ${activa === null ? 'is-active' : ''}" data-cat="">Todos</button>`
    : '';

  tabs.innerHTML = botonTodos + cats.map(c => `
    <button class="tab ${c.id === activa ? 'is-active' : ''}" data-cat="${c.id}">${escaparHTML(c.nombre)}</button>
  `).join('');

  tabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activa = btn.dataset.cat || null;
      window.LMBC?.write('lmbc_category',activa||'');
      tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      window.dispatchEvent?.(new CustomEvent('lmbc:context'));
      callback(activa);
    });
  });

  callback(activa);
  return () => activa;
}

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatearFecha(fechaISO) {
  const [y,m,d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return {
    diaSemana: DIAS[fecha.getDay()],
    texto: `${d} de ${MESES[m - 1]}`,
    fecha
  };
}

