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

  const totalCarrera = bitacora.reduce((acc, f) => ({
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
    <div class="hero__eyebrow">Perfil de jugador</div>
    <h1 class="hero__title">${jugador?.nombre ?? 'Jugador'}</h1>
    <p class="hero__sub">${equiposTexto || 'Sin equipo asignado'}${jugador?.numero ? ` · #${jugador.numero}` : ''}</p>
  `;

  cont.innerHTML = `
    <h3 class="lideres__titulo display">Total Acumulado (todas las temporadas y equipos)</h3>
    <div class="dash-metricas">
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.jj}</div><div class="dash-metrica__label">Juegos jugados</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.puntos}</div><div class="dash-metrica__label">Puntos totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalCarrera.triples}</div><div class="dash-metrica__label">Triples totales</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${vecesMVP}</div><div class="dash-metrica__label">Veces MVP</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${promPts}</div><div class="dash-metrica__label">Pts / Juego</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${promTriples}</div><div class="dash-metrica__label">3pt / Juego</div></div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:30px;">Desglose por Temporada, Categoría y Equipo</h3>
    ${grupos.length === 0 ? '<div class="empty">Todavía no tiene estadísticas capturadas.</div>' : grupos.map(g => renderGrupo(g)).join('')}
  `;
}

function renderGrupo(g) {
  const categoria = ESTADO_J.categorias.find(c => c.id === g.categoriaId);
  const temporada = ESTADO_J.temporadas.find(t => t.id === g.temporadaId);
  const equipo = ESTADO_J.equiposPorId[g.equipoId];
  const prom = (v) => g.totales.jj ? (v / g.totales.jj).toFixed(1) : '0.0';

  return `
    <div class="jugador-grupo">
      <div class="jugador-grupo__titulo">
        <img src="${RUTA_IMG}${equipo?.logo ?? 'img/equipos/placeholder.svg'}" alt="">
        <div>
          <b>${equipo?.nombre ?? '—'}</b>
          <span>${categoria?.nombre ?? g.categoriaId} · ${temporada?.nombre ?? g.temporadaId ?? 'Sin temporada'}</span>
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
      <span class="historial-item__rival">${equipo?.nombre ?? '—'} vs ${rival?.nombre ?? '—'}</span>
      <span class="mono">${f.marcadorPropio}-${f.marcadorRival}</span>
      <span class="mono" title="Puntos / Triples / Faltas">${f.puntos}p · ${f.triples}t · ${f.faltas}f</span>
      <span class="historial-item__fecha mono">${texto}</span>
      ${mostrarTemporada ? `<span class="historial-item__fecha mono">${temporada}</span>` : ''}
    </div>
  `;
}

iniciarJugador();
