let ESTADO_L = null;
let categoriaActivaL = null;
let temporadaActivaL = null;
let tipoActivoL = null;

const TIPOS_LIDERES = [
  { id: 'puntos',  icono: '🏀', titulo: 'Puntos' },
  { id: 'triples', icono: '🎯', titulo: 'Triples' },
  { id: 'faltas',  icono: '🟨', titulo: 'Faltas' },
];

async function iniciarLideres() {
  ESTADO_L = await cargarDatos({publico:'resumen',temporada:new URLSearchParams(window.location?.search||'').get('temporada')||'activa',amistosos:false});
  renderPatrocinadores(ESTADO_L.patrocinadores);
  tipoActivoL = TIPOS_LIDERES[0].id;

  iniciarSelectorTemporada(ESTADO_L.temporadas, (temp) => {
    temporadaActivaL = temp;
    renderLideres();
  }, ESTADO_L);

  iniciarTabs(ESTADO_L.categorias, (cat) => {
    categoriaActivaL = cat;
    renderLideres();
  });
}

// Suma las estadísticas de todos los juegos jugados de la categoría/temporada
// activa, agrupadas por jugador.
function acumularEstadisticas() {
  const summary=ESTADO_L.summary?.(categoriaActivaL,temporadaActivaL,'leaders');
  if(summary)return summary.map(({jugadorId,equipoId,...r})=>({...r,jugador:ESTADO_L.jugadoresPorId[jugadorId],equipo:ESTADO_L.equiposPorId[equipoId]}));
  const juegos = ESTADO_L.juegosOficiales.filter(j =>
    j.categoria_id === categoriaActivaL &&
    j.estatus === 'jugado' &&
    (!temporadaActivaL || j.temporada === temporadaActivaL)
  );

  const acumulado = {};
  const procesar = (lista, equipoId) => {
    (lista ?? []).forEach(e => {
      if (String(e.asistio) === 'false') return; // no jugó, no cuenta
      const jugador = ESTADO_L.jugadoresPorId[e.jugador];
      if (!jugador) return;
      const equipo = ESTADO_L.equiposPorId[equipoId];

      const acc = (acumulado[e.jugador] ??= {
        jugador, equipo, juegos: 0, puntos: 0, triples: 0, faltas: 0
      });
      acc.equipo = equipo; // se queda con el equipo del juego más reciente procesado
      acc.juegos++;
      acc.puntos += Number(e.puntos ?? 0);
      acc.triples += Number(e.triples ?? 0);
      acc.faltas += Number(e.faltas ?? 0);
    });
  };

  juegos.forEach(j => {
    procesar(j.estadisticas_local ?? j.estadisticas, j.local);
    procesar(j.estadisticas_visita, j.visita);
  });

  return Object.values(acumulado);
}

function tablaTop10(filas, campo, titulo) {
  const top = [...filas].sort((a,b) => b[campo] - a[campo]).slice(0, 10);
  if (top.length === 0) {
    return `<div class="empty">Sin datos de ${titulo.toLowerCase()} todavía.</div>`;
  }
  return `
    <div class="table-scroll">
      <table class="standing-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>JJ</th><th>${titulo}</th></tr></thead>
        <tbody>
          ${top.map((f,i) => `
            <tr>
              <td class="rank">${i+1}</td>
              <td style="text-align:left; font-weight:600; color:var(--navy);">${linkJugador(f.jugador.id, f.jugador.nombre)}</td>
              <td style="text-align:left; font-size:12px; color:var(--text-dim);">${escaparHTML(f.equipo?.nombre ?? '—')}</td>
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

  const subtabsHTML = `
    <div class="tabs ranking-subtabs">
      ${TIPOS_LIDERES.map(t => `
        <button class="tab ${t.id === tipoActivoL ? 'is-active' : ''}" data-tipo="${t.id}">${t.icono} ${escaparHTML(t.titulo)}</button>
      `).join('')}
    </div>
  `;

  if (filas.length === 0) {
    cont.innerHTML = subtabsHTML + `<div class="empty">Todavía no hay estadísticas individuales capturadas para esta categoría/temporada.</div>`;
  } else {
    const seleccionado = TIPOS_LIDERES.find(t => t.id === tipoActivoL) ?? TIPOS_LIDERES[0];
    cont.innerHTML = subtabsHTML + tablaTop10(filas, seleccionado.id, seleccionado.titulo);
  }

  cont.querySelectorAll('.ranking-subtabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActivoL = btn.dataset.tipo;
      renderLideres();
    });
  });
  if(typeof LMBCDownloads!=='undefined')LMBCDownloads.mount({title:'Líderes · '+(TIPOS_LIDERES.find(t=>t.id===tipoActivoL)?.titulo||'Puntos'),category:ESTADO_L.categorias.find(c=>c.id===categoriaActivaL)?.nombre||categoriaActivaL,season:ESTADO_L.temporadas.find(t=>t.id===temporadaActivaL)?.nombre||temporadaActivaL||'Todas las temporadas',note:'Líderes acumulados de la liga: los diez jugadores de la tabla seleccionada. Son estadísticas acumuladas; no representan el MVP de un partido. Amistosos y torneos independientes se consultan por separado.',sponsors:ESTADO_L.patrocinadores});
}

iniciarLideres();
