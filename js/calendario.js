let ESTADO = null;
let categoriaActiva = null;
let temporadaActiva = null;

async function iniciar() {
  ESTADO = await cargarDatos();
  renderPatrocinadores(ESTADO.patrocinadores);

  iniciarSelectorTemporada(ESTADO.temporadas, (temp) => {
    temporadaActiva = temp;
    render();
  });

  iniciarTabs(ESTADO.categorias, (cat) => {
    categoriaActiva = cat;
    render();
  });
}

function render() {
  const cont = document.getElementById('contenido');
  if (!categoriaActiva) return;

  const juegos = ESTADO.juegos.filter(j =>
    j.categoria_id === categoriaActiva &&
    (!temporadaActiva || j.temporada === temporadaActiva)
  );

  if (juegos.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay juegos capturados para esta categoría/temporada.</div>`;
    return;
  }

  // Agrupar primero por mes, luego por fecha exacta dentro de cada mes
  const porMes = {};
  juegos.forEach(j => {
    const mesKey = j.fecha.slice(0, 7); // "2026-08"
    (porMes[mesKey] ??= {})[j.fecha] ??= [];
    porMes[mesKey][j.fecha].push(j);
  });

  const mesesOrdenados = Object.keys(porMes).sort().reverse();
  const hoyMesKey = new Date().toISOString().slice(0, 7);

  cont.innerHTML = mesesOrdenados.map(mesKey => {
    const fechas = Object.keys(porMes[mesKey]).sort().reverse();
    const nombreMes = nombreDeMes(mesKey);
    const abierto = mesKey >= hoyMesKey ? 'open' : ''; // meses pasados quedan colapsados

    const jornadasHTML = fechas.map(fecha => {
      const { diaSemana, texto } = formatearFecha(fecha);
      const filas = porMes[mesKey][fecha]
        .sort((a,b) => a.hora.localeCompare(b.hora))
        .map(renderJuego).join('');

      return `
        <div class="jornada">
          <div class="jornada__head">
            <div class="jornada__fecha display">${texto}</div>
            <div class="jornada__dia">${diaSemana}</div>
          </div>
          ${filas}
        </div>
      `;
    }).join('');

    return `
      <details class="mes" ${abierto}>
        <summary class="mes__titulo display">${nombreMes}</summary>
        <div class="mes__contenido">${jornadasHTML}</div>
      </details>
    `;
  }).join('');
}

function nombreDeMes(mesKey) {
  const [y, m] = mesKey.split('-').map(Number);
  return `${MESES[m - 1].charAt(0).toUpperCase() + MESES[m - 1].slice(1)} ${y}`;
}

const ETIQUETAS_FASE = {
  playoffs: 'Playoffs',
  final: '🏆 Gran Final',
  amistoso: 'Amistoso',
};

function renderJuego(j) {
  const local = ESTADO.equiposPorId[j.local];
  const visita = ESTADO.equiposPorId[j.visita];
  const sede = ESTADO.sedesPorId[j.sede_id]?.nombre ?? '';
  const jugado = j.estatus === 'jugado';
  const forfeit = j.forfeit ?? 'ninguno';

  const marcadorHTML = jugado
    ? `<div class="marcador__score">
         <span class="${j.marcador_local >= j.marcador_visita ? 'gano' : 'perdio'}">${j.marcador_local}</span>
         <span class="mono" style="color:var(--text-dim); font-size:16px;">–</span>
         <span class="${j.marcador_visita >= j.marcador_local ? 'gano' : 'perdio'}">${j.marcador_visita}</span>
       </div>
       <div class="marcador__badge">${forfeit !== 'ninguno' ? 'Forfeit' : 'Terminado'}</div>`
    : `<div class="marcador__vs">VS</div>
       <div class="marcador__info mono">${j.hora} hrs</div>`;

  const fase = j.fase ?? 'regular';
  const faseHTML = fase !== 'regular'
    ? `<div class="fase-tag">${ETIQUETAS_FASE[fase] ?? fase}</div>`
    : '';

  const mvpHTML = jugado && j.mvp_nombre
    ? `<div class="mvp"><span class="mvp__icon">★</span> ${ESTADO.categorias.find(c=>c.id===j.categoria_id)?.etiqueta_mvp ?? 'Jugador destacado'}: <b>${j.mvp_nombre}</b></div>`
    : '';

  const forfeitHTML = jugado && forfeit !== 'ninguno'
    ? `<div class="observacion">⚠ Forfeit: ${forfeit === 'local' ? (local?.nombre ?? 'Local') : (visita?.nombre ?? 'Visita')} no se presentó.</div>`
    : '';

  const observacionHTML = jugado && j.observaciones
    ? `<div class="observacion">${j.observaciones}</div>`
    : '';

  return `
    <div class="juego ${jugado ? 'is-jugado' : ''}">
      ${faseHTML}
      <div class="equipo equipo--local">
        <img src="${RUTA_IMG}${local?.logo ?? 'img/equipos/placeholder.svg'}" alt="${local?.nombre ?? ''}" loading="lazy">
        <span class="equipo__nombre">${local?.nombre ?? 'Por definir'}</span>
      </div>
      <div class="marcador">
        ${marcadorHTML}
        <div class="marcador__info mono" style="margin-top:6px;">${sede}</div>
      </div>
      <div class="equipo equipo--visita">
        <img src="${RUTA_IMG}${visita?.logo ?? 'img/equipos/placeholder.svg'}" alt="${visita?.nombre ?? ''}" loading="lazy">
        <span class="equipo__nombre">${visita?.nombre ?? 'Por definir'}</span>
      </div>
      ${mvpHTML}
      ${forfeitHTML}
      ${observacionHTML}
    </div>
  `;
}

iniciar();
