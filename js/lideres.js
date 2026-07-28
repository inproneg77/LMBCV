let ESTADO_L = null;
let categoriaActivaL = null;
let temporadaActivaL = null;

async function iniciarLideres() {
  ESTADO_L = await cargarDatos();
  renderPatrocinadores(ESTADO_L.patrocinadores);

  iniciarSelectorTemporada(ESTADO_L.temporadas, (temp) => {
    temporadaActivaL = temp;
    renderLideres();
  });

  iniciarTabs(ESTADO_L.categorias, (cat) => {
    categoriaActivaL = cat;
    renderLideres();
  });
}

// Suma las estadísticas de todos los juegos jugados de la categoría/temporada
// activa, agrupadas por jugador.
function acumularEstadisticas() {
  const juegos = ESTADO_L.juegos.filter(j =>
    j.categoria_id === categoriaActivaL &&
    j.estatus === 'jugado' &&
    (!temporadaActivaL || j.temporada === temporadaActivaL)
  );

  const acumulado = {};
  juegos.forEach(j => {
    (j.estadisticas ?? []).forEach(e => {
      if (String(e.asistio) === 'false') return; // no jugó, no cuenta
      const jugador = ESTADO_L.jugadoresPorId[e.jugador];
      if (!jugador) return;
      const equipo = ESTADO_L.equiposPorId[jugador.equipo_id];

      const acc = (acumulado[e.jugador] ??= {
        jugador, equipo, juegos: 0, puntos: 0, triples: 0, faltas: 0
      });
      acc.juegos++;
      acc.puntos += Number(e.puntos ?? 0);
      acc.triples += Number(e.triples ?? 0);
      acc.faltas += Number(e.faltas ?? 0);
    });
  });

  return Object.values(acumulado);
}

function tablaTop10(filas, campo, titulo) {
  const top = [...filas].sort((a,b) => b[campo] - a[campo]).slice(0, 10);
  if (top.length === 0) {
    return `<div class="empty" style="margin-bottom:24px;">Sin datos de ${titulo.toLowerCase()} todavía.</div>`;
  }
  return `
    <h3 class="lideres__titulo display">${titulo}</h3>
    <div class="table-scroll">
      <table class="standing-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>JJ</th><th>${titulo}</th></tr></thead>
        <tbody>
          ${top.map((f,i) => `
            <tr>
              <td class="rank">${i+1}</td>
              <td style="text-align:left; font-weight:600; color:var(--navy);">${f.jugador.nombre}</td>
              <td style="text-align:left; font-size:12px; color:var(--text-dim);">${f.equipo?.nombre ?? '—'}</td>
              <td>${f.juegos}</td>
              <td class="mono" style="font-weight:700;">${f[campo]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLideres() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaL) return;

  const filas = acumularEstadisticas();

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay estadísticas individuales capturadas para esta categoría/temporada.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="lideres-grid">
      <div>${tablaTop10(filas, 'puntos', 'Puntos')}</div>
      <div>${tablaTop10(filas, 'triples', 'Triples')}</div>
      <div>${tablaTop10(filas, 'faltas', 'Faltas')}</div>
    </div>
  `;
}

iniciarLideres();
