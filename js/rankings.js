let ESTADO_R = null;
let categoriaActivaR = null;
let temporadaActivaR = null;

async function iniciarRankings() {
  ESTADO_R = await cargarDatos();
  renderPatrocinadores(ESTADO_R.patrocinadores);

  iniciarSelectorTemporada(ESTADO_R.temporadas, (temp) => {
    temporadaActivaR = temp;
    renderRankings();
  });

  iniciarTabs(ESTADO_R.categorias, (cat) => {
    categoriaActivaR = cat;
    renderRankings();
  });
}

// Acumula, por equipo, todo lo necesario para los 5 rankings a partir de
// los juegos de temporada regular ya jugados (misma base que el Standing).
function calcularEstadisticasEquipos() {
  const equipos = ESTADO_R.equipos.filter(e => e.categoria_id === categoriaActivaR);
  const stats = {};
  equipos.forEach(e => { stats[e.id] = { equipo: e, jj: 0, pf: 0, pc: 0, triples: 0, triplesRival: 0, faltas: 0 }; });

  const juegos = ESTADO_R.juegos.filter(j =>
    j.categoria_id === categoriaActivaR &&
    j.estatus === 'jugado' &&
    (j.fase ?? 'regular') === 'regular' &&
    (!temporadaActivaR || j.temporada === temporadaActivaR)
  );

  const sumaCampo = (estadisticas, equipoId, campo) =>
    (estadisticas ?? [])
      .filter(e => ESTADO_R.jugadoresPorId[e.jugador]?.equipo_id === equipoId)
      .reduce((acc, e) => acc + Number(e[campo] ?? 0), 0);

  juegos.forEach(j => {
    const local = stats[j.local];
    const visita = stats[j.visita];
    if (!local || !visita) return;

    local.jj++; visita.jj++;
    local.pf += j.marcador_local; local.pc += j.marcador_visita;
    visita.pf += j.marcador_visita; visita.pc += j.marcador_local;

    const triplesLocal = sumaCampo(j.estadisticas, j.local, 'triples');
    const triplesVisita = sumaCampo(j.estadisticas, j.visita, 'triples');
    const faltasLocal = sumaCampo(j.estadisticas, j.local, 'faltas');
    const faltasVisita = sumaCampo(j.estadisticas, j.visita, 'faltas');

    local.triples += triplesLocal;       local.triplesRival += triplesVisita;  local.faltas += faltasLocal;
    visita.triples += triplesVisita;     visita.triplesRival += triplesLocal;  visita.faltas += faltasVisita;
  });

  return Object.values(stats)
    .filter(s => s.jj > 0)
    .map(s => ({
      ...s,
      promPF: s.pf / s.jj,
      promPC: s.pc / s.jj,
      promTriples: s.triples / s.jj,
      promTriplesRival: s.triplesRival / s.jj,
      promFaltas: s.faltas / s.jj,
    }));
}

const RANKINGS = [
  { id: 'ofensivo',   icono: '🏀', titulo: 'Equipos Más Ofensivos',        campo: 'promPF',          sufijo: 'pts/juego', orden: 'desc', detalle: (f) => `${f.pf} pts en ${f.jj} juegos` },
  { id: 'defensivo',  icono: '🛡️', titulo: 'Equipos Más Defensivos',       campo: 'promPC',          sufijo: 'pts/juego', orden: 'asc',  detalle: (f) => `${f.pc} pts recibidos en ${f.jj} juegos` },
  { id: 'tripleros',  icono: '🎯', titulo: 'Equipos Más Tripleros',        campo: 'promTriples',     sufijo: '3pt/juego', orden: 'desc', detalle: (f) => `${f.triples} triples en ${f.jj} juegos` },
  { id: 'defensa3',   icono: '🚫', titulo: 'Mejor Defensa contra el Triple', campo: 'promTriplesRival', sufijo: '3pt/juego permitidos', orden: 'asc', detalle: (f) => `${f.triplesRival} triples del rival en ${f.jj} juegos` },
  { id: 'fairplay',   icono: '🤝', titulo: 'Fair Play (menos faltas)',     campo: 'promFaltas',      sufijo: 'faltas/juego', orden: 'asc', detalle: (f) => `${f.faltas} faltas en ${f.jj} juegos` },
];

function renderRankings() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaR) return;

  const filas = calcularEstadisticasEquipos();

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay juegos jugados con estadísticas para calcular rankings en esta categoría/temporada.</div>`;
    return;
  }

  cont.innerHTML = RANKINGS.map(r => renderSeccionRanking(r, filas)).join('');
}

function renderSeccionRanking(r, filas) {
  const ordenadas = [...filas].sort((a, b) =>
    r.orden === 'desc' ? b[r.campo] - a[r.campo] : a[r.campo] - b[r.campo]
  );

  return `
    <section class="ranking-seccion">
      <h3 class="ranking-seccion__titulo display"><span>${r.icono}</span> ${r.titulo}</h3>
      <div class="ranking-grid">
        ${ordenadas.map((f, i) => `
          <div class="ranking-card ${i === 0 ? 'is-lider' : ''}">
            ${i === 0 ? '<div class="ranking-card__corona">👑 Líder</div>' : `<div class="ranking-card__pos">#${i + 1}</div>`}
            <img src="${RUTA_IMG}${f.equipo.logo}" alt="${f.equipo.nombre}" class="ranking-card__logo" loading="lazy">
            <div class="ranking-card__nombre">${f.equipo.nombre}</div>
            <div class="ranking-card__valor">${f[r.campo].toFixed(1)}<span>${r.sufijo}</span></div>
            <div class="ranking-card__detalle mono">${r.detalle(f)}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

iniciarRankings();
