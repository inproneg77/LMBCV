let ESTADO_J = null;

async function iniciarJugador() {
  ESTADO_J = await cargarDatos();
  renderPatrocinadores(ESTADO_J.patrocinadores);

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  render(id);
}

// Junta todas las líneas de estadística de este jugador, en TODAS las
// categorías/temporadas/juegos donde haya participado — recorriendo los
// mismos ESTADO_J.juegos que ya carga datos.js (nada de datos nuevos).
function bitacoraDe(jugadorId) {
  const filas = [];
  ESTADO_J.juegos.forEach(j => {
    if (j.estatus !== 'jugado') return;
    const esLocal = (j.estadisticas_local ?? j.estadisticas ?? []).some(e => e.jugador === jugadorId);
    const esVisita = (j.estadisticas_visita ?? []).some(e => e.jugador === jugadorId);
    if (!esLocal && !esVisita) return;

    const lista = esLocal ? (j.estadisticas_local ?? j.estadisticas) : j.estadisticas_visita;
    const linea = lista.find(e => e.jugador === jugadorId);
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
  return ESTADO_J.juegos.filter(j => j.estatus === 'jugado' && j.mvp_jugador === jugadorId).length;
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

  const totales = bitacora.reduce((acc, f) => ({
    jj: acc.jj + 1,
    puntos: acc.puntos + f.puntos,
    triples: acc.triples + f.triples,
    faltas: acc.faltas + f.faltas,
  }), { jj: 0, puntos: 0, triples: 0, faltas: 0 });

  const prom = (v) => totales.jj ? (v / totales.jj).toFixed(1) : '0.0';
  const vecesMVP = contarMVP(id);

  // Membresías (categoría/equipo) para mostrar arriba
  const membresias = ESTADO_J.jugadores.filter(j => j.id === id);
  const equiposTexto = [...new Map(membresias.map(m => [m.equipo_id, m])).values()]
    .map(m => ESTADO_J.equiposPorId[m.equipo_id]?.nombre)
    .filter(Boolean)
    .join(' · ');

  tituloWrap.innerHTML = `
    <div class="hero__eyebrow">Perfil de jugador</div>
    <h1 class="hero__title">${jugador?.nombre ?? 'Jugador'}</h1>
    <p class="hero__sub">${equiposTexto || 'Sin equipo asignado'}${jugador?.numero ? ` · #${jugador.numero}` : ''}</p>
  `;

  cont.innerHTML = `
    <div class="dash-metricas">
      <div class="dash-metrica"><div class="dash-metrica__valor">${totales.jj}</div><div class="dash-metrica__label">Juegos jugados</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totales.puntos}</div><div class="dash-metrica__label">Puntos totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totales.triples}</div><div class="dash-metrica__label">Triples totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${vecesMVP}</div><div class="dash-metrica__label">Veces MVP</div></div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:28px;">Promedios por Juego</h3>
    <div class="table-scroll">
      <table class="standing-table">
        <thead><tr><th>Pts/Juego</th><th>3pt/Juego</th><th>Faltas/Juego</th></tr></thead>
        <tbody><tr><td class="mono" style="font-weight:700;">${prom(totales.puntos)}</td><td class="mono" style="font-weight:700;">${prom(totales.triples)}</td><td class="mono" style="font-weight:700;">${prom(totales.faltas)}</td></tr></tbody>
      </table>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:28px;">Bitácora Juego por Juego</h3>
    ${bitacora.length === 0 ? '<div class="empty">Todavía no tiene estadísticas capturadas.</div>' : bitacora.map(f => renderFilaBitacora(f)).join('')}
  `;
}

function renderFilaBitacora(f) {
  const equipo = ESTADO_J.equiposPorId[f.equipoId];
  const rival = ESTADO_J.equiposPorId[f.rivalId];
  const { texto } = formatearFecha(f.juego.fecha);
  const temporada = ESTADO_J.temporadas.find(t => t.id === f.juego.temporada)?.nombre ?? f.juego.temporada ?? '';

  return `
    <div class="historial-item" style="grid-template-columns: auto 1fr auto auto auto auto;">
      <span class="historial-item__resultado ${f.gano ? 'gano' : 'perdio'}">${f.gano ? 'G' : 'P'}</span>
      <span class="historial-item__rival">${equipo?.nombre ?? '—'} vs ${rival?.nombre ?? '—'}</span>
      <span class="mono">${f.marcadorPropio}-${f.marcadorRival}</span>
      <span class="mono" title="Puntos / Triples / Faltas">${f.puntos}p · ${f.triples}t · ${f.faltas}f</span>
      <span class="historial-item__fecha mono">${texto}</span>
      <span class="historial-item__fecha mono">${temporada}</span>
    </div>
  `;
}

iniciarJugador();
