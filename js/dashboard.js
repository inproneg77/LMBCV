let ESTADO_D = null;
let temporadaActivaD = null;

async function iniciarDashboard() {
  ESTADO_D = await cargarDatos();
  renderPatrocinadores(ESTADO_D.patrocinadores);

  iniciarSelectorTemporada(ESTADO_D.temporadas, (temp) => {
    temporadaActivaD = temp;
    render();
  });
}

function juegosVigentes(categoriaId) {
  return ESTADO_D.juegos.filter(j =>
    j.categoria_id === categoriaId &&
    (!temporadaActivaD || j.temporada === temporadaActivaD)
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
  juegos.forEach(j => { sumar(j.estadisticas_local ?? j.estadisticas); sumar(j.estadisticas_visita); });

  const top = Object.values(acumulado).sort((a,b) => b.puntos - a.puntos)[0];
  if (!top) return null;
  return { ...top, nombre: ESTADO_D.jugadoresPorId[top.id]?.nombre ?? '—' };
}

function render() {
  const cont = document.getElementById('contenido');
  const categorias = [...ESTADO_D.categorias].sort((a,b) => a.orden - b.orden);

  const totalEquipos = new Set(ESTADO_D.equipos.map(e => e.id)).size;
  const totalJugadores = new Set(ESTADO_D.jugadores.map(j => j.id)).size;
  const juegosDeTemporada = ESTADO_D.juegos.filter(j => !temporadaActivaD || j.temporada === temporadaActivaD);
  const totalJugados = juegosDeTemporada.filter(j => j.estatus === 'jugado').length;
  const totalProgramados = juegosDeTemporada.filter(j => j.estatus === 'programado').length;

  const hoyISO = new Date().toISOString().slice(0, 10);
  const proximos = juegosDeTemporada
    .filter(j => j.estatus === 'programado' && j.fecha >= hoyISO)
    .sort((a,b) => a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : a.fecha.localeCompare(b.fecha))
    .slice(0, 5);

  cont.innerHTML = `
    <div class="dash-metricas">
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalEquipos}</div><div class="dash-metrica__label">Equipos</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalJugadores}</div><div class="dash-metrica__label">Jugadores</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalJugados}</div><div class="dash-metrica__label">Juegos jugados</div></div>
      <div class="dash-metrica"><div class="dash-metrica__valor">${totalProgramados}</div><div class="dash-metrica__label">Juegos programados</div></div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:30px;">Próximos Juegos</h3>
    ${proximos.length === 0 ? '<div class="empty">No hay juegos programados próximamente.</div>' : `
      <div class="dash-proximos">
        ${proximos.map(j => {
          const local = ESTADO_D.equiposPorId[j.local];
          const visita = ESTADO_D.equiposPorId[j.visita];
          const { texto } = formatearFecha(j.fecha);
          return `<div class="historial-item">
            <span class="historial-item__resultado" style="background:var(--gold);">${texto.split(' ')[0]}</span>
            <span class="historial-item__rival">${local?.nombre ?? '—'} vs ${visita?.nombre ?? '—'}</span>
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
