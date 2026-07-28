let ESTADO_C = null;

async function iniciarCampeones() {
  ESTADO_C = await cargarDatos();
  renderPatrocinadores(ESTADO_C.patrocinadores);
  renderCampeones();
}

// Fecha del último juego jugado dentro de la serie (la que definió al campeón)
function fechaDeCoronacion(serie) {
  const jugados = (serie.juegos ?? []).filter(j => String(j.jugado) === 'true' && j.fecha);
  if (jugados.length === 0) return null;
  return jugados.map(j => j.fecha).sort().at(-1);
}

function renderCampeones() {
  const cont = document.getElementById('contenido');

  const finales = ESTADO_C.playoffs.filter(s => s.ronda === 'Final');

  const campeones = finales.map(serie => {
    let victoriasA = 0, victoriasB = 0;
    (serie.juegos ?? []).forEach(j => {
      if (String(j.jugado) !== 'true') return;
      if (j.marcador_a > j.marcador_b) victoriasA++;
      else if (j.marcador_b > j.marcador_a) victoriasB++;
    });
    const ganadorId = victoriasA >= 2 ? serie.equipoA : victoriasB >= 2 ? serie.equipoB : null;
    if (!ganadorId) return null;

    return {
      equipo: ESTADO_C.equiposPorId[ganadorId],
      categoria: ESTADO_C.categorias.find(c => c.id === serie.categoria_id),
      temporada: ESTADO_C.temporadas.find(t => t.id === serie.temporada)?.nombre ?? serie.temporada ?? '—',
      fecha: fechaDeCoronacion(serie),
      mvp: serie.mvp_serie || null,
    };
  }).filter(Boolean);

  if (campeones.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay campeones registrados. En cuanto una serie de Final se defina 2 juegos a 1 (o 2-0), aparece aquí automáticamente.</div>`;
    return;
  }

  campeones.sort((a,b) => (b.temporada || '').localeCompare(a.temporada || ''));

  cont.innerHTML = `
    <div class="campeones-grid">
      ${campeones.map(c => `
        <div class="campeon-card">
          <div class="campeon-card__trofeo">🏆</div>
          <img src="${RUTA_IMG}${c.equipo?.logo ?? 'img/equipos/placeholder.svg'}" alt="${c.equipo?.nombre ?? ''}" class="campeon-card__logo">
          <div class="campeon-card__nombre">${c.equipo?.nombre ?? 'Equipo'}</div>
          <div class="campeon-card__cat">${c.categoria?.nombre ?? ''}</div>
          <div class="campeon-card__temp mono">${c.temporada}</div>
          ${c.fecha ? `<div class="campeon-card__fecha mono">${formatearFecha(c.fecha).texto}</div>` : ''}
          ${c.mvp ? `<div class="campeon-card__mvp">★ ${c.categoria?.etiqueta_mvp ?? 'MVP'} de la Final: <b>${c.mvp}</b></div>` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

iniciarCampeones();
