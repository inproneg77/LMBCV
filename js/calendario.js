let ESTADO = null;
let categoriaActiva = null;

async function iniciar() {
  ESTADO = await cargarDatos();
  const cats = [...ESTADO.categorias].sort((a,b) => a.orden - b.orden);
  categoriaActiva = cats[0]?.id;
  renderPatrocinadores(ESTADO.patrocinadores);

  const tabs = document.getElementById('tabs');
  tabs.innerHTML = cats.map(c => `
    <button class="tab ${c.id === categoriaActiva ? 'is-active' : ''}" data-cat="${c.id}">
      ${c.nombre}
      <span class="tab-meta">Juega ${c.dia_regular}</span>
    </button>
  `).join('');

  tabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      categoriaActiva = btn.dataset.cat;
      tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      render();
    });
  });

  render();
}

function render() {
  const cont = document.getElementById('contenido');
  const juegos = ESTADO.juegos.filter(j => j.categoria_id === categoriaActiva);

  if (juegos.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay juegos capturados para esta categoría.</div>`;
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
    const fechas = Object.keys(porMes[mesKey]).sort();
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

function renderJuego(j) {
  const local = ESTADO.equiposPorId[j.local];
  const visita = ESTADO.equiposPorId[j.visita];
  const sede = ESTADO.sedesPorId[j.sede_id]?.nombre ?? '';
  const jugado = j.estatus === 'jugado';

  const marcadorHTML = jugado
    ? `<div class="marcador__score">
         <span class="${j.marcador_local >= j.marcador_visita ? 'gano' : 'perdio'}">${j.marcador_local}</span>
         <span class="mono" style="color:var(--text-dim); font-size:16px;">–</span>
         <span class="${j.marcador_visita >= j.marcador_local ? 'gano' : 'perdio'}">${j.marcador_visita}</span>
       </div>
       <div class="marcador__badge">Terminado</div>`
    : `<div class="marcador__vs">VS</div>
       <div class="marcador__info mono">${j.hora} hrs</div>`;

  const fase = j.fase ?? 'regular';
  const faseHTML = fase !== 'regular'
    ? `<div class="fase-tag">${fase === 'final' ? '🏆 Gran Final' : 'Playoffs'}</div>`
    : '';

  const mvpHTML = jugado && j.mvp_nombre
    ? `<div class="mvp"><span class="mvp__icon">★</span> Jugador destacado: <b>${j.mvp_nombre}</b></div>`
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
      ${observacionHTML}
    </div>
  `;
}

iniciar();
