let ESTADO_D = null;

async function iniciarDashboard() {
  ESTADO_D = await cargarDatos();
  renderPatrocinadores(ESTADO_D.patrocinadores);
  render();
}

// Ubica, para una categoría, la temporada con actividad "jugado" más
// reciente. Dashboard no usa selector de temporada: cada categoría avanza a
// su propio ritmo (una puede estar en playoffs de la temporada pasada
// mientras otra ya arrancó la regular de la siguiente), así que forzar una
// sola temporada global para todas rompe la foto del momento.
function temporadaRecienteDe(categoriaId) {
  const fechas = ESTADO_D.juegos
    .filter(j => j.categoria_id === categoriaId && j.estatus === 'jugado' && j.fecha)
    .map(j => j.fecha);
  if (fechas.length === 0) return null;
  const fechaMax = fechas.sort().at(-1);
  return ESTADO_D.juegos.find(j => j.categoria_id === categoriaId && j.fecha === fechaMax)?.temporada ?? null;
}

function juegosVigentes(categoriaId) {
  const temp = temporadaRecienteDe(categoriaId);
  return ESTADO_D.juegos.filter(j =>
    j.categoria_id === categoriaId &&
    (!temp || j.temporada === temp)
  );
}

// ===== Standing top 3 de una categoría (misma regla de puntos que /standing) =====
function standingTop3(categoriaId) {
  const equipos = ESTADO_D.equipos.filter(e => e.categoria_id === categoriaId);
  const tabla = {};
  equipos.forEach(e => { tabla[e.id] = { equipo: e, pts: 0, jj: 0 }; });

  juegosVigentes(categoriaId)
    .filter(j => j.estatus === 'jugado' && (j.fase ?? 'regular') === 'regular')
    .forEach(j => {
      const local = tabla[j.local], visita = tabla[j.visita];
      if (!local || !visita) return;
      local.jj++; visita.jj++;
      const forfeit = j.forfeit ?? 'ninguno';
      if (forfeit === 'local') { visita.pts += 2; }
      else if (forfeit === 'visita') { local.pts += 2; }
      else if (j.marcador_local > j.marcador_visita) { local.pts += 2; visita.pts += 1; }
      else if (j.marcador_visita > j.marcador_local) { visita.pts += 2; local.pts += 1; }
    });

  return Object.values(tabla).filter(f => f.jj > 0).sort((a,b) => b.pts - a.pts).slice(0, 3);
}

// ===== Líder de puntos de una categoría =====
function liderPuntos(categoriaId) {
  const juegos = juegosVigentes(categoriaId).filter(j => j.estatus === 'jugado');
  const acumulado = {};
  const sumar = (lista) => (lista ?? []).forEach(e => {
    if (String(e.asistio) === 'false') return;
    const acc = (acumulado[e.jugador] ??= { id: e.jugador, puntos: 0 });
    acc.puntos += Number(e.puntos ?? 0);
  });
  juegos.forEach(j => { sumar(j.estadisticas_local); sumar(j.estadisticas_visita); });

  const top = Object.values(acumulado).sort((a,b) => b.puntos - a.puntos)[0];
  if (!top) return null;
  return { ...top, nombre: ESTADO_D.jugadoresPorId[top.id]?.nombre ?? '—' };
}

// ===== Playoffs: qué está pasando AHORA en cada categoría, sin importar
// temporada — mismo criterio que juegosVigentes: la temporada con actividad
// más reciente de esa categoría, no una global. =====
function calcularSerie(serie) {
  let victoriasA = 0, victoriasB = 0;
  (serie.juegos ?? []).forEach(j => {
    if (String(j.jugado) !== 'true') return;
    if (j.marcador_a > j.marcador_b) victoriasA++;
    else if (j.marcador_b > j.marcador_a) victoriasB++;
  });
  const ganador = victoriasA >= 2 ? serie.equipoA : victoriasB >= 2 ? serie.equipoB : null;
  return { victoriasA, victoriasB, ganador };
}

function fechaUltimoJuego(serie) {
  const fechas = (serie.juegos ?? []).filter(j => String(j.jugado) === 'true' && j.fecha).map(j => j.fecha);
  return fechas.length ? fechas.sort().at(-1) : null;
}

const ORDEN_RONDAS = ['Cuartos de Final', 'Semifinal', 'Final'];

// Por categoría, ubica la temporada de playoffs con actividad más reciente
// (por fecha del último juego jugado) y regresa: campeón ya coronado, o
// las series todavía sin decidir de esa llave.
function estadoPlayoffsCategoria(catId) {
  const series = ESTADO_D.playoffs.filter(s => s.categoria_id === catId);
  if (series.length === 0) return null;

  let temporadaReciente = null, mejorFecha = null;
  series.forEach(s => {
    const f = fechaUltimoJuego(s);
    if (f && (!mejorFecha || f > mejorFecha)) { mejorFecha = f; temporadaReciente = s.temporada; }
  });
  if (!temporadaReciente) temporadaReciente = series[series.length - 1].temporada;

  const activas = series.filter(s => s.temporada === temporadaReciente);
  const finalSerie = activas.find(s => s.ronda === 'Final');
  if (finalSerie) {
    const { ganador } = calcularSerie(finalSerie);
    if (ganador) return { tipo: 'campeon', serie: finalSerie, ganadorId: ganador, fecha: fechaUltimoJuego(finalSerie) };
  }

  const enCurso = activas
    .map(s => ({ serie: s, ...calcularSerie(s) }))
    .filter(x => !x.ganador)
    .sort((a,b) => ORDEN_RONDAS.indexOf(a.serie.ronda) - ORDEN_RONDAS.indexOf(b.serie.ronda));

  return enCurso.length > 0 ? { tipo: 'en_curso', items: enCurso } : null;
}

// Encuentra la serie de playoffs a la que pertenece un juego programado
// (mismos dos equipos + misma categoría + misma temporada), para mostrar el
// marcador de la serie junto al juego en "Próximos Juegos".
function serieDeJuego(j) {
  return ESTADO_D.playoffs.find(s =>
    s.categoria_id === j.categoria_id &&
    s.temporada === j.temporada &&
    ((s.equipoA === j.local && s.equipoB === j.visita) || (s.equipoA === j.visita && s.equipoB === j.local))
  );
}

function renderCampeon(cat, estado) {
  const equipo = ESTADO_D.equiposPorId[estado.ganadorId];
  const temporada = ESTADO_D.temporadas.find(t => t.id === estado.serie.temporada)?.nombre ?? estado.serie.temporada;
  return `
    <div class="campeon-card">
      <div class="campeon-card__trofeo">🏆</div>
      <img src="${RUTA_IMG}${equipo?.logo ?? 'img/equipos/placeholder.svg'}" alt="" class="campeon-card__logo">
      <div class="campeon-card__nombre">${equipo?.nombre ?? 'Equipo'}</div>
      <div class="campeon-card__cat">Campeón · ${cat.nombre}</div>
      <div class="campeon-card__temp mono">${temporada}</div>
      ${estado.fecha ? `<div class="campeon-card__fecha mono">${formatearFecha(estado.fecha).texto}</div>` : ''}
      ${estado.serie.mvp_serie ? `<div class="campeon-card__mvp">★ ${cat.etiqueta_mvp ?? 'MVP'} de la Final: <b>${estado.serie.mvp_serie}</b></div>` : ''}
    </div>
  `;
}

function renderSerieEnCurso(cat, item) {
  const { serie, victoriasA, victoriasB } = item;
  const equipoA = ESTADO_D.equiposPorId[serie.equipoA];
  const equipoB = ESTADO_D.equiposPorId[serie.equipoB];
  return `
    <div class="juego serie">
      <div class="equipo equipo--local">
        <img src="${RUTA_IMG}${equipoA?.logo ?? 'img/equipos/placeholder.svg'}" alt="" loading="lazy">
        <span class="equipo__nombre">${equipoA?.nombre ?? 'Por definir'}</span>
      </div>
      <div class="marcador">
        <div class="marcador__score">
          <span class="${victoriasA > victoriasB ? 'gano' : 'perdio'}">${victoriasA}</span>
          <span class="mono" style="color:var(--text-dim); font-size:16px;">–</span>
          <span class="${victoriasB > victoriasA ? 'gano' : 'perdio'}">${victoriasB}</span>
        </div>
        <div class="marcador__info mono" style="margin-top:6px;">${cat.nombre} · ${serie.ronda}</div>
      </div>
      <div class="equipo equipo--visita">
        <img src="${RUTA_IMG}${equipoB?.logo ?? 'img/equipos/placeholder.svg'}" alt="" loading="lazy">
        <span class="equipo__nombre">${equipoB?.nombre ?? 'Por definir'}</span>
      </div>
    </div>
  `;
}

function render() {
  const cont = document.getElementById('contenido');
  const categorias = [...ESTADO_D.categorias].sort((a,b) => a.orden - b.orden);

  const totalEquipos = new Set(ESTADO_D.equipos.map(e => e.id)).size;
  const totalJugadores = new Set(ESTADO_D.jugadores.map(j => j.id)).size;

  // "Jugados" = suma de juegos jugados en la temporada vigente de cada
  // categoría (una por una, no una temporada global). "Programados" y
  // "Próximos" son operativos: reflejan la agenda vigente ahora mismo, sin
  // importar a qué temporada quedó etiquetado el juego.
  const totalJugados = categorias.reduce((acc, cat) =>
    acc + juegosVigentes(cat.id).filter(j => j.estatus === 'jugado').length, 0);
  const programados = ESTADO_D.juegos.filter(j => j.estatus === 'programado');
  const totalProgramados = programados.length;

  const hoyISO = new Date().toISOString().slice(0, 10);
  // Playoffs/Final primero (es lo más relevante para quien entra al
  // Dashboard), luego regular, luego amistosos — dentro de cada grupo,
  // por fecha más próxima.
  const pesoFase = { playoffs: 0, final: 0, regular: 1, amistoso: 2 };
  const proximos = programados
    .filter(j => j.fecha >= hoyISO)
    .sort((a,b) => {
      const pa = pesoFase[a.fase ?? 'regular'] ?? 1;
      const pb = pesoFase[b.fase ?? 'regular'] ?? 1;
      if (pa !== pb) return pa - pb;
      return a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : a.fecha.localeCompare(b.fecha);
    })
    .slice(0, 5);

  const playoffsPorCat = categorias
    .map(cat => ({ cat, estado: estadoPlayoffsCategoria(cat.id) }))
    .filter(x => x.estado !== null);

  cont.innerHTML = `
    <div class="dash-metricas">
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalEquipos}</div><div class="dash-metrica__label">Equipos</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalJugadores}</div><div class="dash-metrica__label">Jugadores</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalJugados}</div><div class="dash-metrica__label">Juegos jugados</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalProgramados}</div><div class="dash-metrica__label">Juegos programados</div></div>
    </div>

    ${playoffsPorCat.length > 0 ? `
      <h3 class="lideres__titulo display" style="margin-top:30px;">Playoffs en Vivo</h3>
      ${playoffsPorCat.filter(x => x.estado.tipo === 'campeon').length > 0 ? `
        <div class="campeones-grid">
          ${playoffsPorCat.filter(x => x.estado.tipo === 'campeon').map(x => renderCampeon(x.cat, x.estado)).join('')}
        </div>
      ` : ''}
      ${playoffsPorCat.filter(x => x.estado.tipo === 'en_curso').map(x =>
        x.estado.items.map(item => renderSerieEnCurso(x.cat, item)).join('')
      ).join('')}
    ` : ''}

    <h3 class="lideres__titulo display" style="margin-top:30px;">Próximos Juegos</h3>
    ${proximos.length === 0 ? '<div class="empty">No hay juegos programados próximamente.</div>' : `
      <div class="dash-proximos">
        ${proximos.map(j => {
          const local = ESTADO_D.equiposPorId[j.local];
          const visita = ESTADO_D.equiposPorId[j.visita];
          const { texto } = formatearFecha(j.fecha);
          const cat = ESTADO_D.categorias.find(c => c.id === j.categoria_id);
          const fase = j.fase ?? 'regular';
          const esImportante = fase === 'playoffs' || fase === 'final';
          const faseNombre = fase === 'playoffs' ? 'Playoffs' : fase === 'final' ? 'Final' : 'Amistoso';

          // Si es playoffs y encontramos la serie a la que pertenece, mostramos
          // el marcador de la serie (ej. "Semifinal · 1-0") en vez de solo el nombre de la fase.
          const serie = esImportante ? serieDeJuego(j) : null;
          const textoFase = serie
            ? (() => {
                const { victoriasA, victoriasB } = calcularSerie(serie);
                const [vLocal, vVisita] = serie.equipoA === j.local ? [victoriasA, victoriasB] : [victoriasB, victoriasA];
                return `${serie.ronda} · ${vLocal}-${vVisita}`;
              })()
            : faseNombre;

          const etiquetaFase = esImportante
            ? `<span style="display:inline-block; margin-left:6px; padding:1px 8px; border-radius:999px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--navy); background:linear-gradient(135deg, var(--gold-bright), var(--gold));">${textoFase}</span>`
            : (fase === 'amistoso' ? ` · ${faseNombre}` : '');
          return `<div class="historial-item">
            <span class="historial-item__resultado" style="background:var(--gold);">${texto.split(' ')[0]}</span>
            <span class="historial-item__rival">${local?.nombre ?? '—'} vs ${visita?.nombre ?? '—'}
              <span class="mono" style="font-size:11px; color:var(--text-dim); font-weight:400;">${cat?.nombre ?? j.categoria_id}${fase === 'amistoso' ? etiquetaFase : ''}</span>${esImportante ? etiquetaFase : ''}
            </span>
            <span class="mono">${j.hora} hrs</span>
            <span class="historial-item__fecha mono">${texto}</span>
          </div>`;
        }).join('')}
      </div>
    `}

    <h3 class="lideres__titulo display" style="margin-top:30px;">Resumen por Categoría</h3>
    <div class="dash-categorias">
      ${categorias.map(cat => {
        const top3 = standingTop3(cat.id);
        const lider = liderPuntos(cat.id);
        return `
          <div class="dash-cat-card">
            <h4>${cat.nombre}</h4>
            ${top3.length === 0 ? '<div class="empty" style="padding:12px; font-size:12px;">Sin standing todavía.</div>' : `
              <ol class="dash-top3">
                ${top3.map(f => `<li><img src="${RUTA_IMG}${f.equipo.logo}" alt=""> ${f.equipo.nombre} <span class="mono">${f.pts} pts</span></li>`).join('')}
              </ol>
            `}
            ${lider ? `<div class="dash-lider">🏀 Líder de puntos: <b>${linkJugador(lider.id, lider.nombre)}</b> (${lider.puntos})</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

iniciarDashboard();
