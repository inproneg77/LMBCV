// Captura independiente: equipos, jugadores y encuentros se guardan juntos.
const ARCHIVO_AMISTOSOS = 'data/amistosos.json';
let ambienteAmistosos = null;
let borradorAmistoso = null;
let amistosoGuardando = false;
const amEl = id => document.getElementById('am-' + id);
const amId = tipo => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return 'am-' + tipo + '-' + Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
};
const amClonar = valor => JSON.parse(JSON.stringify(valor));
const amLogosPendientes = new Map();
const amVacio = () => ({ equipos: [], jugadores: [], juegos: [] });
async function abrirAmistosoDesdeCaptura(id) {
  document.getElementById('modo-captura').value='amistoso';
  document.getElementById('captura-liga').hidden=true;
  document.getElementById('captura-amistosos').hidden=false;
  ambienteAmistosos=null;
  await abrirAmbienteAmistosos();
  if (!ambienteAmistosos) return;
  const juego=ambienteAmistosos.datos.juegos.find(j=>j.id===id);
  if (!juego) return amMensaje('El partido ya no está disponible. Actualiza la lista.',true);
  amEl('categoria').value=juego.categoria_id;
  amEl('temporada').value=juego.temporada;
  amListaJuegos();amEl('juego').value=id;amAbrirJuego();
  amEl('guardar').textContent='Guardar estadísticas y resultado';
}
function amNormalizar(datos) {
  if (!datos || !['equipos', 'jugadores', 'juegos'].every(k => Array.isArray(datos[k]))) throw new Error('El archivo de amistosos tiene un formato inválido.');
  return datos;
}
function amMensaje(texto, error = false) {
  amEl('mensaje').textContent = texto;
  amEl('mensaje').className = 'cap-msg ' + (error ? 'error' : 'ok');
}
function amAccion(accion) {
  return async (...args) => {
    try { await accion(...args); }
    catch (err) { amMensaje('No se pudo completar: ' + err.message, true); }
  };
}
function amOpciones(items, seleccionado = '') {
  return items.map(x => `<option value="${escaparHTML(x.id)}" ${x.id === seleccionado ? 'selected' : ''}>${escaparHTML(x.nombre)}</option>`).join('');
}
async function amLeer() {
  try { return await ghFetch(ARCHIVO_AMISTOSOS); }
  catch (err) { if (err.status === 404) return { sha: null, contenido: amVacio() }; throw err; }
}
async function abrirAmbienteAmistosos() {
  if (ambienteAmistosos) return;
  if (!token()) { amMensaje('Pega tu token arriba para abrir el ambiente de amistosos.', true); return; }
  amEl('cargar').disabled = true;
  try {
    const [archivo, cats, temps, equipos, roster, sedes] = await Promise.all([
      amLeer(), ghFetch('data/categorias.json'), ghFetch('data/temporadas.json'),
      ghFetch('data/equipos.json'), ghFetch('data/roster.json'), ghFetch('data/sedes.json')
    ]);
    ambienteAmistosos = { sha: archivo.sha, datos: amNormalizar(archivo.contenido), cats: cats.contenido,
      temps: temps.contenido.temporadas, equiposLiga: equipos.contenido.equipos,
      jugadoresLiga: roster.contenido.jugadores, sedes: sedes.contenido.sedes ?? sedes.contenido };
    amEl('categoria').innerHTML = amOpciones(ambienteAmistosos.cats);
    const activa = ambienteAmistosos.temps.find(t => String(t.activa) === 'true')?.id;
    amEl('temporada').innerHTML = amOpciones(ambienteAmistosos.temps, activa);
    amEl('sede').innerHTML = '<option value="">Sin sede definida</option>' + amOpciones(ambienteAmistosos.sedes);
    amNuevo();
    amEl('contenido').hidden = false;
    amEl('cargar').hidden = true;
    amMensaje('Crea el partido aquí: los equipos y jugadores quedan solo en amistosos.');
  } catch (err) { ambienteAmistosos=null; amMensaje(err.message, true); }
  finally { amEl('cargar').disabled = false; }
}
function amListaJuegos() {
  const cat = amEl('categoria').value, temp = amEl('temporada').value;
  const equipos = Object.fromEntries(ambienteAmistosos.datos.equipos.map(e => [e.id, e.nombre]));
  const juegos = ambienteAmistosos.datos.juegos.filter(j => j.categoria_id === cat && j.temporada === temp)
    .sort((a,b) => b.fecha.localeCompare(a.fecha));
  amEl('juego').innerHTML = '<option value="">Nuevo amistoso</option>' + amOpciones(juegos.map(j => ({ id: j.id, nombre: `${j.fecha} — ${equipos[j.local]} vs ${equipos[j.visita]}` })), borradorAmistoso?.juego.id);
}
function amNuevo() {
  const ahora = new Date();
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
  borradorAmistoso = { juego: { id: amId('j'), categoria_id: amEl('categoria').value, temporada: amEl('temporada').value,
    fase: 'amistoso', fecha, hora: `${String(ahora.getHours()).padStart(2,'0')}:${String(ahora.getMinutes()).padStart(2,'0')}`,
    estatus: 'programado', forfeit: 'ninguno', local: '', visita: '', marcador_local: 0, marcador_visita: 0 },
    equipos: [], filas: { local: [], visita: [] } };
  amListaJuegos(); amPintar();
}
function amAbrirJuego() {
  const id = amEl('juego').value;
  if (!id) return amNuevo();
  const juego = ambienteAmistosos.datos.juegos.find(j => j.id === id);
  if (!juego) return;
  borradorAmistoso = { juego: amClonar(juego), equipos: [], filas: { local: [], visita: [] } };
  for (const lado of ['local','visita']) {
    const estadisticas = juego['estadisticas_' + lado] ?? [];
    const ids = new Set([...(juego['convocados_' + lado] ?? []), ...estadisticas.map(e => e.jugador)]);
    borradorAmistoso.filas[lado] = [...ids].map(id => {
      const persona = ambienteAmistosos.datos.jugadores.find(p => p.id === id);
      if (!persona) throw new Error('No se encontró al jugador ' + id);
      const stats = estadisticas.find(e => e.jugador === id);
      return { ...amClonar(persona), asistio: !!stats && String(stats.asistio) !== 'false', puntos: stats?.puntos ?? 0, triples: stats?.triples ?? 0, faltas: stats?.faltas ?? 0 };
    });
  }
  amPintar(); amMensaje('Amistoso abierto. Puedes agregar jugadores y actualizar el resultado.');
}
function amPintar() {
  const j = borradorAmistoso.juego;
  for (const campo of ['fecha','hora','estatus','forfeit','sede_id','marcador_local','marcador_visita']) {
    const id = {sede_id:'sede',marcador_local:'marcador-local',marcador_visita:'marcador-visita'}[campo] ?? campo;
    amEl(id).value = j[campo] ?? '';
  }
  amEl('detalle').value = j.mvp_nombre ?? '';
  for (const lado of ['local','visita']) {
    const liga = ambienteAmistosos.equiposLiga.filter(e => (e.categorias ?? []).includes(j.categoria_id));
    amEl('liga-' + lado).innerHTML = '<option value="">Copiar un equipo de liga…</option>' + amOpciones(liga);
    amPintarFilas(lado);
  }
  amActualizarSelectoresEquipos();
  amActualizarMVP(j.mvp_jugador ?? '');
}
function amSeleccionarEquipo(lado) {
  const id = amEl('equipo-' + lado).value;
  if (id.startsWith('liga:')) return amCopiarLiga(lado, id.slice(5));
  const otro = lado === 'local' ? 'visita' : 'local';
  if (id && id === borradorAmistoso.juego[otro]) { amEl('equipo-' + lado).value = borradorAmistoso.juego[lado]; return amMensaje('Elige dos equipos diferentes.', true); }
  borradorAmistoso.juego[lado] = id;
  borradorAmistoso.filas[lado] = ambienteAmistosos.datos.jugadores.filter(p => p.equipo_id === id).map(p => ({...amClonar(p),asistio:false,puntos:0,triples:0,faltas:0}));
  amPintarFilas(lado); amActualizarMVP();
}
async function amCrearEquipo(lado) {
  const nombre = amEl('nombre-' + lado).value.trim();
  if (!nombre) return amMensaje('Escribe el nombre del equipo invitado.', true);
  const existente = [...ambienteAmistosos.datos.equipos,...borradorAmistoso.equipos].find(e => e.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase());
  if (existente) { amEl('equipo-' + lado).value = existente.id; amSeleccionarEquipo(lado); return amMensaje('Se seleccionó el equipo que ya existía.'); }
  const equipo = { id: amId('e'), nombre, logo: 'img/equipos/placeholder.svg' };
  const archivo = amEl('logo-' + lado).files?.[0];
  if (archivo) {
    amEl('crear-' + lado).disabled = true;
    try {
      const imagen = await amPrepararLogo(archivo);
      equipo.logo = 'img/amistosos/' + equipo.id + '.png';
      amLogosPendientes.set(equipo.logo, imagen);
    } finally { amEl('crear-' + lado).disabled = false; }
  }
  borradorAmistoso.equipos.push(equipo);
  borradorAmistoso.juego[lado] = equipo.id;
  borradorAmistoso.filas[lado] = [];
  amEl('nombre-' + lado).value = '';
  amEl('logo-' + lado).value = '';
  amActualizarSelectoresEquipos(); amPintarFilas(lado); amActualizarMVP();
  amMensaje('Equipo «' + nombre + '» creado en este partido. Agrega sus jugadores y pulsa Guardar amistoso para publicarlo.');
}
async function amPrepararLogo(archivo) {
  if (!['image/png','image/jpeg','image/webp'].includes(archivo.type)) throw new Error('El logo debe ser PNG, JPG o WebP.');
  if (archivo.size > 10 * 1024 * 1024) throw new Error('El logo debe pesar menos de 10 MB.');
  const url = URL.createObjectURL(archivo);
  try {
    const img = new Image();
    await new Promise((resolve,reject) => {img.onload=resolve;img.onerror=()=>reject(new Error('No se pudo abrir la imagen.'));img.src=url;});
    const escala = Math.min(1,512/Math.max(img.naturalWidth,img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*escala));canvas.height=Math.max(1,Math.round(img.naturalHeight*escala));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/png').split(',')[1];
  } finally { URL.revokeObjectURL(url); }
}
function amActualizarSelectoresEquipos() {
  const equipos = [...ambienteAmistosos.datos.equipos,...borradorAmistoso.equipos];
  const liga = ambienteAmistosos.equiposLiga
    .filter(e => (e.categorias ?? []).includes(borradorAmistoso.juego.categoria_id))
    .map(e => ({id:'liga:'+e.id,nombre:e.nombre}));
  for (const lado of ['local','visita']) amEl('equipo-' + lado).innerHTML =
    '<option value="">Elige un equipo o crea uno nuevo</option>' +
    '<optgroup label="Equipos de la liga">' + amOpciones(liga) + '</optgroup>' +
    '<optgroup label="Equipos de amistosos">' + amOpciones(equipos,borradorAmistoso.juego[lado]) + '</optgroup>';
  for (const lado of ['local','visita']) {
    const guardado=ambienteAmistosos.datos.juegos.some(j=>j.id===borradorAmistoso.juego.id);
    for(const campo of ['equipo-','liga-','crear-','nombre-','logo-'])amEl(campo+lado).disabled=guardado;
    const equipo = equipos.find(e=>e.id===borradorAmistoso.juego[lado]);
    const img = amEl('vista-logo-' + lado);
    img.hidden = !equipo;
    if (equipo) { img.src = amLogosPendientes.has(equipo.logo) ? 'data:image/png;base64,' + amLogosPendientes.get(equipo.logo) : '../' + (equipo.logo || 'img/equipos/placeholder.svg'); img.alt = 'Logo de ' + equipo.nombre; }
  }
}
function amCopiarLiga(lado, equipoId = amEl('liga-' + lado).value) {
  const original = ambienteAmistosos.equiposLiga.find(e => e.id === equipoId);
  if (!original) return;
  const otro = lado === 'local' ? 'visita' : 'local';
  let equipo = [...ambienteAmistosos.datos.equipos,...borradorAmistoso.equipos].find(e => e.origen_liga_id === original.id);
  if (!equipo) { equipo = { id: amId('e'), nombre: original.nombre, logo: original.logo, origen_liga_id: original.id }; borradorAmistoso.equipos.push(equipo); }
  if (equipo.id === borradorAmistoso.juego[otro]) { amActualizarSelectoresEquipos(); return amMensaje('Ese equipo ya está en el otro lado.',true); }
  borradorAmistoso.juego[lado] = equipo.id;
  const juego = borradorAmistoso.juego;
  borradorAmistoso.filas[lado] = ambienteAmistosos.jugadoresLiga.filter(p => (p.membresias ?? []).some(m => m.equipo_id === original.id && m.categoria_id === juego.categoria_id && m.temporada === juego.temporada)).map(p => {
    const copia = ambienteAmistosos.datos.jugadores.find(x => x.origen_liga_id === p.id && x.equipo_id === equipo.id);
    return {...(copia ?? {id:amId('p'),nombre:p.nombre,numero:p.numero??'',equipo_id:equipo.id,origen_liga_id:p.id}),asistio:false,puntos:0,triples:0,faltas:0};
  });
  amActualizarSelectoresEquipos(); amPintarFilas(lado); amActualizarMVP();
}
function amAgregarJugador(lado) {
  const equipo = borradorAmistoso.juego[lado];
  if (!equipo) return amMensaje('Primero crea o selecciona el equipo de ese lado.',true);
  borradorAmistoso.filas[lado].push({id:amId('p'),equipo_id:equipo,nombre:'',numero:'',asistio:true,puntos:0,triples:0,faltas:0});
  amPintarFilas(lado); amActualizarMVP();
}
function amPintarFilas(lado) {
  const cont = amEl('jugadores-' + lado);
  cont.innerHTML = borradorAmistoso.filas[lado].map((p,i) => `<div class="am-jugador" data-fila="${i}">
    <label><input type="checkbox" data-campo="asistio" ${p.asistio?'checked':''}> Jugó</label>
    <label>Nombre<input data-campo="nombre" value="${escaparHTML(p.nombre)}" maxlength="100"></label>
    <label>Número<input data-campo="numero" value="${escaparHTML(p.numero)}" maxlength="10"></label>
    ${['puntos','triples','faltas'].map(k=>`<label>${k}<input type="number" min="0" step="1" data-campo="${k}" value="${escaparHTML(p[k])}"></label>`).join('')}
    <button type="button" data-quitar="${i}" aria-label="Quitar jugador ${i+1} de ${lado}">Quitar</button>
  </div>`).join('');
  cont.querySelectorAll('[data-campo]').forEach(input => input.addEventListener('input', () => {
    const p = borradorAmistoso.filas[lado][Number(input.closest('[data-fila]').dataset.fila)];
    p[input.dataset.campo] = input.type === 'checkbox' ? input.checked : input.value;
    amActualizarMVP();
  }));
  cont.querySelectorAll('[data-quitar]').forEach(btn => btn.addEventListener('click', () => {borradorAmistoso.filas[lado].splice(Number(btn.dataset.quitar),1);amPintarFilas(lado);amActualizarMVP();}));
}
function amActualizarMVP(elegido = amEl('mvp').value) {
  const participantes = Object.values(borradorAmistoso.filas).flat().filter(p => p.asistio && p.nombre.trim());
  amEl('mvp').innerHTML = '<option value="">Sin MVP</option>' + amOpciones(participantes,elegido);
}
function amEntero(valor, campo) {
  const n = Number(valor);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(campo + ': usa un número entero mayor o igual a cero.');
  return n;
}
function amPrepararGuardado() {
  const datos = amClonar(ambienteAmistosos.datos);
  const juego = amClonar(borradorAmistoso.juego);
  if (!juego.local || !juego.visita || juego.local === juego.visita) throw new Error('Crea o selecciona dos equipos diferentes.');
  if (!juego.categoria_id || !juego.temporada) throw new Error('Selecciona categoría y temporada.');
  juego.fecha = amEl('fecha').value; juego.hora = amEl('hora').value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(juego.fecha) || !/^\d{2}:\d{2}$/.test(juego.hora)) throw new Error('Indica fecha y hora del amistoso.');
  juego.sede_id = amEl('sede').value;
  juego.estatus = amEl('estatus').value;
  juego.forfeit = amEl('forfeit').value;
  juego.fase = 'amistoso';
  juego.marcador_local = amEntero(amEl('marcador-local').value,'Marcador local');
  juego.marcador_visita = amEntero(amEl('marcador-visita').value,'Marcador visitante');
  const usados = new Set();
  for (const equipo of borradorAmistoso.equipos.filter(e => [juego.local,juego.visita].includes(e.id))) if (!datos.equipos.some(e=>e.id===equipo.id)) datos.equipos.push(equipo);
  for (const lado of ['local','visita']) {
    const filas = borradorAmistoso.filas[lado];
    juego['convocados_' + lado] = [];
    juego['estadisticas_' + lado] = [];
    for (const p of filas) {
      if (!p.nombre.trim()) throw new Error('Completa el nombre de todos los jugadores o quita la fila vacía.');
      if (usados.has(p.id)) throw new Error('Un jugador no puede aparecer dos veces.');
      usados.add(p.id);
      const persona = {id:p.id,nombre:p.nombre.trim(),numero:String(p.numero ?? "").trim(),equipo_id:juego[lado]};
      if(p.origen_liga_id) persona.origen_liga_id=p.origen_liga_id;
      const index=datos.jugadores.findIndex(x=>x.id===p.id);
      if(index<0)datos.jugadores.push(persona);else datos.jugadores[index]=persona;
      juego['convocados_' + lado].push(p.id);
      if(p.asistio && juego.forfeit==='ninguno') juego['estadisticas_' + lado].push({jugador:p.id,asistio:'true',puntos:amEntero(p.puntos,'Puntos'),triples:amEntero(p.triples,'Triples'),faltas:amEntero(p.faltas,'Faltas')});
    }
  }
  juego.mvp_jugador = juego.forfeit==='ninguno' ? amEl('mvp').value : '';
  juego.mvp_nombre = juego.forfeit==='ninguno' ? amEl('detalle').value.trim() : '';
  if(juego.mvp_jugador && ![...juego.estadisticas_local,...juego.estadisticas_visita].some(p=>p.jugador===juego.mvp_jugador)) throw new Error('El MVP debe haber jugado.');
  const index=datos.juegos.findIndex(j=>j.id===juego.id);
  if(index<0)datos.juegos.push(juego);else datos.juegos[index]=juego;
  return datos;
}
async function amGuardar() {
  if(amistosoGuardando)return;
  amistosoGuardando=true;amEl('contenido').disabled=true;
  try {
    const datos=amPrepararGuardado();
    for (const equipo of datos.equipos.filter(e=>[borradorAmistoso.juego.local,borradorAmistoso.juego.visita].includes(e.id))) {
      if (!amLogosPendientes.has(equipo.logo)) continue;
      await ghGuardar(equipo.logo,undefined,null,'Logo de equipo de amistosos',amLogosPendientes.get(equipo.logo));
      amLogosPendientes.delete(equipo.logo);
    }
    // Conservamos el SHA de apertura: un conflicto nunca pisa otro guardado.
    const resultado=await ghGuardar(ARCHIVO_AMISTOSOS,ambienteAmistosos.sha,datos,'Captura de amistoso: equipos, jugadores y resultado');
    ambienteAmistosos.datos=datos;
    ambienteAmistosos.sha=resultado.content.sha;
    borradorAmistoso.equipos=[];
    borradorAmistoso.juego=amClonar(datos.juegos.find(j=>j.id===borradorAmistoso.juego.id));
    amListaJuegos();
    amActualizarSelectoresEquipos();
    amMensaje('Amistoso guardado. Sus equipos y jugadores permanecen fuera de la liga; aparecerá en el calendario al publicarse.');
  } catch(err){amMensaje(err.status===409?'Otra captura cambió los amistosos. Tu formulario sigue aquí; copia lo pendiente y vuelve a abrir el ambiente antes de guardar.':err.message,true);}
  finally{amistosoGuardando=false;amEl('contenido').disabled=false;}
}
function iniciarCapturaAmistosos() {
  document.getElementById('modo-captura').addEventListener('change',async e=>{
    const amistoso=e.target.value==='amistoso';
    document.getElementById('captura-liga').hidden=amistoso;
    document.getElementById('captura-amistosos').hidden=!amistoso;
    if(amistoso)await abrirAmbienteAmistosos();
  });
  amEl('cargar').addEventListener('click',abrirAmbienteAmistosos);
  amEl('nuevo').addEventListener('click',amAccion(amNuevo));
  amEl('juego').addEventListener('change',()=>{try{amAbrirJuego();}catch(e){amMensaje(e.message,true);}});
  for(const id of ['categoria','temporada'])amEl(id).addEventListener('change',amAccion(amNuevo));
  for(const lado of ['local','visita']){
    amEl('equipo-'+lado).addEventListener('change',amAccion(()=>amSeleccionarEquipo(lado)));
    amEl('crear-'+lado).addEventListener('click',amAccion(()=>amCrearEquipo(lado)));
    amEl('liga-'+lado).addEventListener('change',amAccion(()=>amCopiarLiga(lado)));
    amEl('agregar-'+lado).addEventListener('click',amAccion(()=>amAgregarJugador(lado)));
  }
  amEl('guardar').addEventListener('click',amGuardar);
  if (new URLSearchParams(window.location.search).get('modo') === 'amistoso') {
    document.getElementById('modo-captura').value = 'amistoso';
    document.getElementById('captura-liga').hidden = true;
    document.getElementById('captura-amistosos').hidden = false;
    abrirAmbienteAmistosos();
  }
}
iniciarCapturaAmistosos();

