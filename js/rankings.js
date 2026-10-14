let ESTADO_R = null;
let categoriaActivaR = null;
let temporadaActivaR = null;
let tipoActivoR = null;

async function iniciarRankings() {
  ESTADO_R = await cargarDatos({publico:'resumen',temporada:new URLSearchParams(window.location?.search||'').get('temporada')||'activa',amistosos:false});
  renderPatrocinadores(ESTADO_R.patrocinadores);
  tipoActivoR = TIPOS[0].id;

  iniciarSelectorTemporada(ESTADO_R.temporadas, (temp) => {
    temporadaActivaR = temp;
    renderRankings();
  }, ESTADO_R);

  iniciarTabs(ESTADO_R.categorias, (cat) => {
    categoriaActivaR = cat;
    renderRankings();
  });
}

// Acumula, por equipo, todo lo necesario para los 5 rankings ofensivos/
// defensivos a partir de los juegos de temporada regular ya jugados
// Los forfeits conservan su resultado oficial, pero no cuentan como desempeño en cancha.
function calcularEstadisticasEquipos() {
  const summary=ESTADO_R.summary?.(categoriaActivaR,temporadaActivaR,'performance');
  if(summary)return summary.map(({equipoId,...r})=>({...r,equipo:ESTADO_R.equipos.find(e=>e.id===equipoId&&e.categoria_id===categoriaActivaR)}));
  return ESTADO_R.equipos.filter(e=>e.categoria_id===categoriaActivaR)
    .map(e=>{const {officialGames,jg,jp,...performance}=FanCore.performanceStats(ESTADO_R.juegosOficiales,categoriaActivaR,temporadaActivaR,e.id);return {equipo:e,...performance};})
    .filter(s=>s.jj>0);
}

const RANKINGS_EQUIPO = [
  { id: 'ofensivo',   icono: '🏀', titulo: 'Más Ofensivos',        campo: 'promPF',          sufijo: 'pts/juego', orden: 'desc', detalle: (f) => `${f.pf} pts en ${f.jj} juegos` },
  { id: 'defensivo',  icono: '🛡️', titulo: 'Más Defensivos',       campo: 'promPC',          sufijo: 'pts/juego', orden: 'asc',  detalle: (f) => `${f.pc} pts recibidos en ${f.jj} juegos` },
  { id: 'tripleros',  icono: '🎯', titulo: 'Más Tripleros',        campo: 'promTriples',     sufijo: '3pt/juego', orden: 'desc', detalle: (f) => `${f.triples} triples en ${f.jj} juegos` },
  { id: 'defensa3',   icono: '🚫', titulo: 'Mejor Defensa 3pt',    campo: 'promTriplesRival', sufijo: '3pt/juego permitidos', orden: 'asc', detalle: (f) => `${f.triplesRival} triples del rival en ${f.jj} juegos` },
  { id: 'fairplay',   icono: '🤝', titulo: 'Fair Play',            campo: 'promFaltas',      sufijo: 'faltas/juego', orden: 'asc', detalle: (f) => `${f.faltas} faltas en ${f.jj} juegos` },
];

// Todas las "pestañas" de esta sección: los 5 rankings de equipo + MVP +
// Campeón, todas filtradas igual (temporada + categoría activas).
const TIPOS = [
  ...RANKINGS_EQUIPO.map(r => ({ id: r.id, icono: r.icono, titulo: r.titulo, modo: 'ranking' })),
  { id: 'mvp',      icono: '⭐', titulo: 'Más Valioso(a)', modo: 'mvp' },
  { id: 'campeon',  icono: '🏆', titulo: 'Campeón',        modo: 'campeon' },
];

function renderRankings() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaR) return;

  const subtabsHTML = `
    <div class="tabs ranking-subtabs">
      ${TIPOS.map(t => `
        <button class="tab ${t.id === tipoActivoR ? 'is-active' : ''}" data-tipo="${t.id}">${t.icono} ${escaparHTML(t.titulo)}</button>
      `).join('')}
    </div>
  `;

  const seleccionado = TIPOS.find(t => t.id === tipoActivoR) ?? TIPOS[0];
  let contenidoHTML;

  if (seleccionado.modo === 'ranking') {
    const filas = calcularEstadisticasEquipos();
    contenidoHTML = filas.length === 0
      ? `<div class="empty">Sin juegos disputados para calcular rankings en esta categoría/temporada.</div>`
      : renderSeccionRanking(RANKINGS_EQUIPO.find(r => r.id === seleccionado.id), filas);
    const clasificados = new Set(filas.map(f => f.equipo.id));
    const sinJuegos = ESTADO_R.equipos.filter(e => e.categoria_id === categoriaActivaR && !clasificados.has(e.id));
    contenidoHTML = '<p class="ranking-nota">Promedios calculados únicamente con partidos disputados de temporada regular; se excluyen forfeits de ambos equipos.</p>' + contenidoHTML;
    if (sinJuegos.length) contenidoHTML += '<p class="ranking-nota"><strong>Sin juegos disputados (fuera del ranking):</strong> ' + sinJuegos.map(e => escaparHTML(e.nombre)).join(' · ') + '</p>';
  } else if (seleccionado.modo === 'mvp') {
    contenidoHTML = renderSeccionMVP();
  } else {
    contenidoHTML = renderSeccionCampeon();
  }

  cont.innerHTML = subtabsHTML + contenidoHTML;

  cont.querySelectorAll('.ranking-subtabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActivoR = btn.dataset.tipo;
      renderRankings();
    });
  });
  if(typeof LMBCDownloads!=='undefined')LMBCDownloads.mount({title:seleccionado.modo==='mvp'?'Reconocimientos MVP':'Rankings · '+seleccionado.titulo,category:ESTADO_R.categorias.find(c=>c.id===categoriaActivaR)?.nombre||categoriaActivaR,season:ESTADO_R.temporadas.find(t=>t.id===temporadaActivaR)?.nombre||temporadaActivaR||'Todas las temporadas',note:seleccionado.modo==='mvp'?'Cantidad de reconocimientos MVP registrados en los partidos de liga de esta categoría y temporada; no es un liderazgo de puntos acumulados.':'Promedios de temporada regular: se excluyen forfeits de ambos equipos. Amistosos y torneos independientes no se incluyen.',sponsors:ESTADO_R.patrocinadores});
}

function renderSeccionRanking(r, filas) {
  const ordenadas = [...filas].sort((a, b) =>
    r.orden === 'desc' ? b[r.campo] - a[r.campo] : a[r.campo] - b[r.campo]
  );

  return `
    <section class="ranking-seccion">
      <div class="ranking-podium" aria-label="Primeros tres equipos">${ordenadas.slice(0,3).map((f,i)=>`<article class="podium-card"><span class="podium-place">#${i+1}</span><img width="68" height="68" src="${RUTA_IMG}${escaparHTML(f.equipo.logo)}" alt="" loading="lazy"><strong>${escaparHTML(f.equipo.nombre)}</strong><span class="podium-number">${f[r.campo].toFixed(1)}</span><small>${r.sufijo} · ${f.jj} juegos disputados</small></article>`).join('')}</div>
      <div class="table-scroll">
        <table class="standing-table">
          <thead>
            <tr><th>#</th><th>Equipo</th><th>${r.sufijo}</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            ${ordenadas.map((f, i) => `
              <tr>
                <td class="rank">${i + 1}</td>
                <td>
                  <div class="equipo-cell">
                    <img src="${RUTA_IMG}${escaparHTML(f.equipo.logo)}" alt="${escaparHTML(f.equipo.nombre)}" loading="lazy">
                    <span>${escaparHTML(f.equipo.nombre)}</span>
                  </div>
                </td>
                <td class="mono" style="font-weight:700;">${f[r.campo].toFixed(1)}</td>
                <td class="mono" style="font-size:11px; color:var(--text-dim);">${r.detalle(f)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ===== MVP (antes /valiosos) =====
function renderSeccionMVP() {
  const juegos = ESTADO_R.juegosOficiales.filter(j =>
    j.categoria_id === categoriaActivaR &&
    j.estatus === 'jugado' &&
    (!temporadaActivaR || j.temporada === temporadaActivaR)
  );

  const conteo = {};
  juegos.forEach(j => {
    const nombre = nombreMVP(j, ESTADO_R.jugadoresPorId);
    if (!nombre) return;
    const id = j.mvp_jugador || null; // null si es un juego viejo con solo texto libre
    const key = id || nombre;
    const acc = (conteo[key] ??= { nombre, id, veces: 0 });
    acc.veces++;
  });

  const filas = Object.values(conteo)
    .sort((a,b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));

  const etiqueta = ESTADO_R.categorias.find(c => c.id === categoriaActivaR)?.etiqueta_mvp ?? 'Jugador Más Valioso';

  if (filas.length === 0) {
    return `<div class="empty">Todavía no hay jugadores destacados capturados para esta categoría/temporada.</div>`;
  }

  return `
    <section class="ranking-seccion">
      <div class="table-scroll">
        <table class="standing-table">
          <thead><tr><th>#</th><th>${etiqueta}</th><th>Veces reconocido</th></tr></thead>
          <tbody>
            ${filas.map((f,i) => `
              <tr>
                <td class="rank">${i+1}</td>
                <td style="text-align:left; font-weight:600; color:var(--navy);">${linkJugador(f.id, f.nombre)}</td>
                <td class="mono" style="font-weight:700;">${f.veces}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="color:var(--text-dim); font-size:12px; margin-top:14px;">
        Se cuenta cada vez que un jugador fue reconocido como ${etiqueta.toLowerCase()} en un juego capturado.
      </p>
    </section>
  `;
}

// ===== Campeón (antes /campeones), acotado a la categoría/temporada activas =====
function fechaDeCoronacion(serie) {
  const jugados = (serie.juegos ?? []).filter(j => String(j.jugado) === 'true' && j.fecha);
  if (jugados.length === 0) return null;
  return jugados.map(j => j.fecha).sort().at(-1);
}

function renderSeccionCampeon() {
  const serie = ESTADO_R.playoffs.find(s =>
    s.categoria_id === categoriaActivaR &&
    s.ronda === 'Final' &&
    (!temporadaActivaR || s.temporada === temporadaActivaR)
  );

  if (!serie) {
    return `<div class="empty">Todavía no se ha definido (o capturado) la serie de Final para esta categoría/temporada.</div>`;
  }

  let victoriasA = 0, victoriasB = 0;
  (serie.juegos ?? []).forEach(j => {
    if (String(j.jugado) !== 'true') return;
    if (j.marcador_a > j.marcador_b) victoriasA++;
    else if (j.marcador_b > j.marcador_a) victoriasB++;
  });
  const ganadorId = victoriasA >= 2 ? serie.equipoA : victoriasB >= 2 ? serie.equipoB : null;

  if (!ganadorId) {
    return `<div class="empty">La Final de esta categoría/temporada todavía está en curso — todavía no hay campeón definido.</div>`;
  }

  const equipo = ESTADO_R.equiposPorId[ganadorId];
  const categoria = ESTADO_R.categorias.find(c => c.id === categoriaActivaR);
  const temporada = ESTADO_R.temporadas.find(t => t.id === serie.temporada)?.nombre ?? serie.temporada ?? '—';
  const fecha = fechaDeCoronacion(serie);

  return `
    <div class="campeones-grid" style="max-width:280px;">
      <div class="campeon-card">
        <div class="campeon-card__trofeo">🏆</div>
        <img src="${RUTA_IMG}${escaparHTML(equipo?.logo ?? 'img/equipos/placeholder.svg')}" alt="${escaparHTML(equipo?.nombre ?? '')}" class="campeon-card__logo">
        <div class="campeon-card__nombre">${escaparHTML(equipo?.nombre ?? 'Equipo')}</div>
        <div class="campeon-card__cat">${escaparHTML(categoria?.nombre ?? '')}</div>
        <div class="campeon-card__temp mono">${temporada}</div>
        ${fecha ? `<div class="campeon-card__fecha mono">${formatearFecha(fecha).texto}</div>` : ''}
        ${serie.mvp_serie ? `<div class="campeon-card__mvp">★ ${categoria?.etiqueta_mvp ?? 'MVP'} de la Final: <b>${escaparHTML(serie.mvp_serie)}</b></div>` : ''}
      </div>
    </div>
  `;
}

iniciarRankings();
