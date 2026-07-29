let ESTADO_CMP = null;
let categoriaActivaCmp = null;
let temporadaActivaCmp = null;
let equipoACmp = null;
let equipoBCmp = null;

async function iniciarComparar() {
  ESTADO_CMP = await cargarDatos();
  renderPatrocinadores(ESTADO_CMP.patrocinadores);

  iniciarSelectorTemporada(ESTADO_CMP.temporadas, (temp) => {
    temporadaActivaCmp = temp;
    equipoACmp = null; equipoBCmp = null;
    render();
  });

  iniciarTabs(ESTADO_CMP.categorias, (cat) => {
    categoriaActivaCmp = cat;
    equipoACmp = null; equipoBCmp = null;
    render();
  });
}

function render() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaCmp) return;

  const equipos = ESTADO_CMP.equipos.filter(e => e.categoria_id === categoriaActivaCmp);
  const opciones = equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  cont.innerHTML = `
    <div class="comparar-selectores">
      <select id="cmp-a" class="temporada-select">
        <option value="">Elige el primer equipo…</option>
        ${opciones}
      </select>
      <div class="comparar-vs display">VS</div>
      <select id="cmp-b" class="temporada-select">
        <option value="">Elige el segundo equipo…</option>
        ${opciones}
      </select>
    </div>
    <div id="cmp-resultado"></div>
  `;

  document.getElementById('cmp-a').value = equipoACmp ?? '';
  document.getElementById('cmp-b').value = equipoBCmp ?? '';

  document.getElementById('cmp-a').addEventListener('change', (e) => { equipoACmp = e.target.value || null; renderResultado(); });
  document.getElementById('cmp-b').addEventListener('change', (e) => { equipoBCmp = e.target.value || null; renderResultado(); });

  renderResultado();
}

function renderResultado() {
  const cont = document.getElementById('cmp-resultado');
  if (!cont) return;

  if (!equipoACmp || !equipoBCmp) {
    cont.innerHTML = `<div class="empty" style="margin-top:20px;">Elige dos equipos para ver su historial de enfrentamientos.</div>`;
    return;
  }
  if (equipoACmp === equipoBCmp) {
    cont.innerHTML = `<div class="empty" style="margin-top:20px;">Elige dos equipos distintos.</div>`;
    return;
  }

  const equipoA = ESTADO_CMP.equiposPorId[equipoACmp];
  const equipoB = ESTADO_CMP.equiposPorId[equipoBCmp];

  const juegos = ESTADO_CMP.juegos.filter(j =>
    j.categoria_id === categoriaActivaCmp &&
    j.estatus === 'jugado' &&
    (!temporadaActivaCmp || j.temporada === temporadaActivaCmp) &&
    ((j.local === equipoACmp && j.visita === equipoBCmp) || (j.local === equipoBCmp && j.visita === equipoACmp))
  ).sort((a,b) => b.fecha.localeCompare(a.fecha));

  if (juegos.length === 0) {
    cont.innerHTML = `<div class="empty" style="margin-top:20px;">${equipoA.nombre} y ${equipoB.nombre} no se han enfrentado en esta categoría/temporada todavía.</div>`;
    return;
  }

  let victoriasA = 0, victoriasB = 0, ptsA = 0, ptsB = 0;
  juegos.forEach(j => {
    const esAlocal = j.local === equipoACmp;
    const marcadorA = esAlocal ? j.marcador_local : j.marcador_visita;
    const marcadorB = esAlocal ? j.marcador_visita : j.marcador_local;
    ptsA += marcadorA; ptsB += marcadorB;
    if (marcadorA > marcadorB) victoriasA++; else if (marcadorB > marcadorA) victoriasB++;
  });

  cont.innerHTML = `
    <div class="cmp-resumen">
      <div class="cmp-resumen__equipo">
        <img src="${RUTA_IMG}${equipoA.logo}" alt="${equipoA.nombre}">
        <span>${equipoA.nombre}</span>
        <div class="cmp-resumen__victorias">${victoriasA}</div>
      </div>
      <div class="cmp-resumen__centro">
        <div class="mono" style="font-size:11px; color:var(--text-dim);">ENFRENTAMIENTOS</div>
        <div class="display" style="font-size:26px; color:var(--navy);">${juegos.length}</div>
        <div class="mono" style="font-size:11px; color:var(--text-dim);">${ptsA} – ${ptsB} pts totales</div>
      </div>
      <div class="cmp-resumen__equipo">
        <img src="${RUTA_IMG}${equipoB.logo}" alt="${equipoB.nombre}">
        <span>${equipoB.nombre}</span>
        <div class="cmp-resumen__victorias">${victoriasB}</div>
      </div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:26px;">Historial de enfrentamientos</h3>
    ${juegos.map(j => {
      const esAlocal = j.local === equipoACmp;
      const marcadorA = esAlocal ? j.marcador_local : j.marcador_visita;
      const marcadorB = esAlocal ? j.marcador_visita : j.marcador_local;
      const { texto } = formatearFecha(j.fecha);
      const sede = ESTADO_CMP.sedesPorId[j.sede_id]?.nombre ?? '';
      return `
        <div class="historial-item">
          <span class="historial-item__resultado ${marcadorA > marcadorB ? 'gano' : 'perdio'}">${marcadorA > marcadorB ? equipoA.nombre[0] : equipoB.nombre[0]}</span>
          <span class="historial-item__rival">${equipoA.nombre} vs ${equipoB.nombre}</span>
          <span class="mono">${marcadorA}-${marcadorB}</span>
          <span class="historial-item__fecha mono">${texto} · ${sede}</span>
        </div>
      `;
    }).join('')}
  `;
}

iniciarComparar();
