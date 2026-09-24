const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
test('agenda preserves played results and updates existing team logo; capture only writes results',async()=>{
 const agenda=ambiente();run(agenda,"ghGuardar=async()=>({content:{sha:'one'}})");await run(agenda,'amGuardar()');
 const scheduled=clone(run(agenda,'ambienteAmistosos.datos'));
 const cap=context();cap.crypto=require('node:crypto').webcrypto;load(cap,'js/amistosos.js');load(cap,'js/captura-amistosos.js');cap.data=scheduled;
 run(cap,"ambienteAmistosos={sha:'one',datos:data,equiposLiga:[],jugadoresLiga:[]}");value(cap,'am-juego',scheduled.juegos[0].id);run(cap,'amAbrirJuego()');assert.equal(cap.document.getElementById('am-fecha').disabled,true);assert.equal(cap.document.getElementById('am-eliminar').hidden,true);
 value(cap,'am-estatus','jugado');value(cap,'am-marcador-local','25');value(cap,'am-marcador-visita','20');run(cap,'borradorAmistoso.filas.local[0].asistio=true;borradorAmistoso.filas.local[0].puntos=25');value(cap,'am-fecha','2027-01-01');
 const played=clone(run(cap,'amPrepararGuardado()'));assert.equal(played.juegos[0].fecha,scheduled.juegos[0].fecha);assert.equal(played.juegos[0].estadisticas_local[0].puntos,25);
 agenda.played=played;run(agenda,'ambienteAmistosos.datos=played');value(agenda,'am-juego',played.juegos[0].id);run(agenda,'amAbrirJuego()');value(agenda,'am-fecha','2026-10-10');value(agenda,'am-editar-nombre-local','Nombre corregido');agenda.document.getElementById('am-editar-logo-local').files=[{type:'image/png',size:10}];run(agenda,"amPrepararLogo=async()=> 'image'");await run(agenda,"amActualizarEquipo('local')");
 const edited=clone(run(agenda,'amPrepararGuardado()'));assert.equal(edited.juegos[0].fecha,'2026-10-10');assert.deepEqual(edited.juegos[0].estadisticas_local,played.juegos[0].estadisticas_local);assert.equal(edited.juegos[0].marcador_local,25);assert.equal(edited.equipos[0].nombre,'Nombre corregido');assert.match(edited.equipos[0].logo,/img\/amistosos\/am-logo-/);assert.equal(edited.equipos.length,2);
 run(cap,'amNuevo()');assert.throws(()=>run(cap,'amPrepararGuardado()'),/Programa primero/);
});
test('original capture lists isolated friendlies and opens them for results',async()=>{
 const c=context();load(c,'js/amistosos.js');form(c,'captura/index.html');c.data={equipos:[{id:'guest',nombre:'Visitantes'}],juegos:[{id:'isolated',fase:'amistoso',categoria_id:'var40',temporada:'2026-2',fecha:'2026-09-24',local:'A',visita:'guest'}]};
 run(c,"token=()=> 'test';TEMPORADAS=[{id:'2026-2'}];EQUIPOS=[{id:'A',nombre:'Liga'}];ghFetch=async p=>({sha:'test',contenido:p==='data/amistosos.json'?data:{juegos:[]}})");value(c,'sel-cat','var40');await run(c,'cargarJuegosDeCategoria()');assert.match(c.document.getElementById('sel-juego').innerHTML,/Visitantes/);assert.match(c.document.getElementById('sel-juego').innerHTML,/\[Amistoso\]/);
 c.opened=[];run(c,'abrirAmistosoDesdeCaptura=async id=>opened.push(id)');value(c,'sel-juego','isolated');await run(c,'mostrarJuegoElegido()');assert.deepEqual(c.opened,['isolated']);
});
test('saved friendly can change its schedule without losing stats and exposes delete',async()=>{
 const c=ambiente();run(c,"ghGuardar=async()=>({content:{sha:'next'}})");await run(c,'amGuardar()');assert.equal(c.document.getElementById('am-equipo-local').disabled,false);assert.equal(c.document.getElementById('am-eliminar').hidden,false);
 value(c,'am-fecha','2026-10-03');value(c,'am-hora','19:30');value(c,'am-sede','otra');await run(c,'amGuardar()');const game=clone(run(c,'ambienteAmistosos.datos.juegos[0]'));assert.equal(game.fecha,'2026-10-03');assert.equal(game.hora,'19:30');assert.equal(game.sede_id,'otra');assert.equal(game.estadisticas_local.length,0);assert.equal(run(c,'ambienteAmistosos.datos.juegos.length'),1);
 run(c,'amNuevo()');assert.equal(c.document.getElementById('am-eliminar').hidden,true);
});
test('delete removes only the selected game and cancellation leaves it intact',async()=>{
 const c=ambiente();run(c,"ghGuardar=async()=>({content:{sha:'next'}})");await run(c,'amGuardar()');run(c,"ambienteAmistosos.datos.juegos.push({...ambienteAmistosos.datos.juegos[0],id:'otro'})");c.confirm=()=>false;await run(c,'amEliminar()');assert.equal(run(c,'ambienteAmistosos.datos.juegos.length'),2);
 c.confirm=()=>true;await run(c,'amEliminar()');assert.equal(run(c,'ambienteAmistosos.datos.juegos.length'),1);assert.equal(run(c,'ambienteAmistosos.datos.juegos[0].id'),'otro');assert.equal(run(c,'ambienteAmistosos.datos.equipos.length'),2);assert.equal(run(c,'ambienteAmistosos.datos.jugadores.length'),2);
});
function ambiente() {
 const c=context();c.document.body={dataset:{amistosos:'agenda'}};c.structuredClone=structuredClone;c.crypto=require('node:crypto').webcrypto;load(c,'js/amistosos.js');load(c,'js/captura-amistosos.js');
 run(c,"ambienteAmistosos={sha:'initial',datos:amVacio(),equiposLiga:[],jugadoresLiga:[]}");
 value(c,'am-categoria','var40');value(c,'am-temporada','2026-2');run(c,'amNuevo()');
 for(const side of ['local','visita']){value(c,'am-nombre-'+side,'Invitado '+side);run(c,`amCrearEquipo('${side}');amAgregarJugador('${side}');borradorAmistoso.filas.${side}[0].nombre='Jugador ${side}';borradorAmistoso.filas.${side}[0].puntos=25;`);}
 value(c,'am-estatus','jugado');value(c,'am-forfeit','ninguno');value(c,'am-marcador-local','25');value(c,'am-marcador-visita','20');
 return c;
}
test('main team selector lists league teams and selection loads independent players',()=>{
 const c=ambiente();run(c,"ambienteAmistosos.equiposLiga=[{id:'A',nombre:'Equipo Liga',categorias:['var40']},{id:'B',nombre:'Otra rama',categorias:['fem40']}];ambienteAmistosos.jugadoresLiga=[{id:'P',nombre:'Jugador Liga',numero:8,membresias:[{equipo_id:'A',categoria_id:'var40',temporada:'2026-2'}]}];amActualizarSelectoresEquipos()");
 const html=c.document.getElementById('am-equipo-local').innerHTML;assert.match(html,/liga:A/);assert.doesNotMatch(html,/Otra rama/);
 value(c,'am-equipo-local','liga:A');run(c,"amSeleccionarEquipo('local')");assert.equal(run(c,'borradorAmistoso.filas.local[0].nombre'),'Jugador Liga');assert.notEqual(run(c,'borradorAmistoso.juego.local'),'A');assert.equal(run(c,'amPrepararGuardado().equipos.find(e=>e.origen_liga_id==="A").nombre'),'Equipo Liga');
});
test('team creation works without randomUUID or structuredClone and uploads logo before data',async()=>{
 const c=ambiente();c.crypto={getRandomValues:require('node:crypto').webcrypto.getRandomValues.bind(require('node:crypto').webcrypto)};c.structuredClone=undefined;
 value(c,'am-nombre-visita','Invitado con logo');c.document.getElementById('am-logo-visita').files=[{type:'image/png',size:10}];
 run(c,"amPrepararLogo=async()=> 'aW1hZ2Vu'");await run(c,"amCrearEquipo('visita')");assert.match(c.document.getElementById('am-mensaje').textContent,/creado/);
 c.saved=[];run(c,"ghGuardar=async(path,sha,obj,msg,image)=>{saved.push({path,sha,obj,image});return {content:{sha:'saved'}}}");await run(c,'amGuardar()');assert.equal(c.saved.length,2);assert.match(c.saved[0].path,/^img\/amistosos\//);assert.equal(c.saved[0].image,'aW1hZ2Vu');assert.equal(c.saved[1].path,'data/amistosos.json');assert.equal(c.saved[1].obj.equipos.find(e=>e.nombre==='Invitado con logo').logo,c.saved[0].path);
});
test('failed logo upload retains draft and does not publish broken game',async()=>{
 const c=ambiente();run(c,"borradorAmistoso.equipos[0].logo='img/amistosos/test.png';amLogosPendientes.set('img/amistosos/test.png','image');ghGuardar=async()=>{throw new Error('Error al subir logo')}");await run(c,'amGuardar()');assert.equal(run(c,'ambienteAmistosos.datos.juegos.length'),0);assert.equal(run(c,'amLogosPendientes.size'),1);assert.match(c.document.getElementById('am-mensaje').textContent,/Error al subir logo/);
});
test('spontaneous friendly creates independent teams and players, saves atomically and reopens',async()=>{
 const c=ambiente();c.saved=[];run(c,"ghGuardar=async(path,sha,obj)=>{saved.push({path,sha,obj});return {content:{sha:'next'}}}");
 await run(c,'amGuardar()');assert.equal(c.saved.length,1);const write=c.saved[0];assert.equal(write.path,'data/amistosos.json');assert.equal(write.sha,'initial');assert.equal(write.obj.equipos.length,2);assert.equal(write.obj.jugadores.length,2);assert.equal(write.obj.juegos[0].fase,'amistoso');assert.equal(write.obj.juegos[0].estadisticas_local.length,0);assert.equal(write.obj.juegos[0].estatus,'programado');
 value(c,'am-juego',write.obj.juegos[0].id);run(c,'amAbrirJuego()');assert.equal(run(c,'borradorAmistoso.filas.local[0].puntos'),0);
 await run(c,'amGuardar()');assert.equal(c.saved[1].sha,'next');assert.equal(c.saved[1].obj.juegos.length,1);assert.equal(c.saved[1].obj.jugadores.length,2);
});
test('invalid scores and concurrent writes preserve draft without corrupting stored state',async()=>{
 const c=ambiente();value(c,'am-marcador-local','-1');assert.throws(()=>run(c,'amPrepararGuardado()'),/entero/);value(c,'am-marcador-local','25');
 run(c,"ghGuardar=async()=>{throw Object.assign(new Error('conflict'),{status:409})}");await run(c,'amGuardar()');assert.equal(run(c,'ambienteAmistosos.datos.juegos.length'),0);assert.equal(run(c,'borradorAmistoso.filas.local[0].nombre'),'Jugador local');assert.match(c.document.getElementById('am-mensaje').textContent,/Otra captura/);assert.equal(c.document.getElementById('am-contenido').disabled,false);
});
test('copying a league team clones identities and handles numeric jersey numbers',()=>{
 const c=ambiente();run(c,"ambienteAmistosos.equiposLiga=[{id:'A',nombre:'Liga'}];ambienteAmistosos.jugadoresLiga=[{id:'P',nombre:'Oficial',numero:7,membresias:[{equipo_id:'A',categoria_id:'var40',temporada:'2026-2'}]}]");value(c,'am-liga-local','A');run(c,"amCopiarLiga('local')");const data=clone(run(c,'amPrepararGuardado()'));const p=data.jugadores.find(p=>p.origen_liga_id==='P');assert.notEqual(p.id,'P');assert.equal(p.numero,'7');assert.equal(p.membresias,undefined);assert.notEqual(data.juegos[0].local,'A');
});
test('independent friendly dataset appears in calendar and leaves all official collections unchanged',async()=>{
 const c=ambiente(),data=fixture(false);data['data/amistosos.json']=clone(run(c,'amPrepararGuardado()'));const before=await state(fixture(false)),after=await state(data);
 for(const k of ['equipos','jugadores','juegosOficiales','playoffs'])assert.deepEqual(after[k],before[k],k);
 assert.equal(after.juegosAmistosos.length,1);const view=context();load(view,'js/amistosos.js');load(view,'js/datos.js');load(view,'js/calendario.js');view.state=after;view.game=after.juegosAmistosos[0];run(view,'ESTADO=state');assert.match(run(view,'renderJuego(game)'),/Invitado visita/);assert.equal(after.jugadoresPorId[after.juegosAmistosos[0].convocados_local[0]].nombre,'Jugador local');
});
function context() {
  const elements = {};
  const element = id => elements[id] ??= {value:'',innerHTML:'',textContent:'',disabled:false,hidden:false,dataset:{},style:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},querySelectorAll(){return []}};
  return vm.createContext({console, setTimeout,clearTimeout,AbortController,URLSearchParams,window:{},document:{getElementById:element,querySelectorAll:()=>[]},localStorage:{getItem:()=>'',setItem(){}},atob,btoa,escape,unescape});
}
function run(c,s){return vm.runInContext(s,c);}
function load(c,p){run(c,read(p).replace(/^iniciar\w*\(\);\s*$/m,''));}
function form(c,p){const script=[...read(p).matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];run(c,script.replace(/^iniciar\(\);\s*$/m,'').replace(/^actualizarEstadoToken\(\);$/m,'').replace(/^cargarBase\(\)\.catch.*$/m,''));}
function value(c,id,v){c.document.getElementById(id).value=v;}
const membership={categoria_id:'var40',temporada:'2026-1',equipo_id:'A'};
const official={id:'P',nombre:'Oficial',membresias:[membership]};
const guest={id:'G',nombre:'Invitado',membresias:[],participaciones_amistosos:[{...membership,juego_id:'F'}]};
const regular={id:'R',categoria_id:'var40',temporada:'2026-1',fecha:'2026-01-01',hora:'12:00',local:'A',visita:'B',estatus:'jugado',fase:'regular',marcador_local:10,marcador_visita:5,mvp_jugador:'P',estadisticas_local:[{jugador:'P',puntos:10,triples:1,faltas:1}],estadisticas_visita:[]};
const friendly={...regular,id:'F',fase:'amistoso',fecha:'2026-03-01',marcador_local:999,mvp_jugador:'G',estadisticas_local:[{jugador:'G',puntos:999,triples:99,faltas:9},{jugador:'P',puntos:500,triples:50,faltas:5}]};
function fixture(includeFriendly=true){return {
 'data/temporadas.json':{temporadas:[{id:'2026-1'},{id:'2026-2'}]},
 'data/categorias.json':[{id:'var40',nombre:'Varonil 40',orden:1},{id:'fem40',orden:2},{id:'var49',orden:3}],
 'data/equipos.json':{equipos:[{id:'A',nombre:'A',categorias:['var40']},{id:'B',nombre:'B',categorias:['var40']}]},
 'data/roster.json':{jugadores:[official,...(includeFriendly?[guest]:[])]},
 'data/sedes.json':{sedes:[]},'data/patrocinadores.json':{patrocinadores:[]},
 'data/juegos_var40/2026-1.json':{juegos:[regular,...(includeFriendly?[friendly]:[])]},
 'data/juegos_var40/2026-2.json':{juegos:includeFriendly?[{...friendly,id:'F2',temporada:'2026-2',fecha:'2026-09-01'}]:[]}
};}
async function state(data){const c=context();load(c,'js/amistosos.js');load(c,'js/datos.js');c.fetch=async url=>({ok:true,json:async()=>clone(data[url]??{})});return clone(await run(c,'cargarDatos()'));}
test('JavaScript and inline scripts compile; helper loads before consumers',()=>{
 function walk(d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);}
 for(const f of walk(root)){if(f.endsWith('.js')) new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});if(f.endsWith('.html')){const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1],{filename:f});if(s.includes('js/datos.js'))assert.ok(s.indexOf('js/amistosos.js')<s.indexOf('js/datos.js'));}}
});
test('eligibility is restricted by game, team, category, season and phase',()=>{
 const c=context();load(c,'js/amistosos.js');c.guest=clone(guest);c.game=clone(friendly);c.official=clone(official);
 assert.equal(run(c,"jugadorElegible(guest,game,'A','var40')"),true);
 for(const changes of [{id:'other'},{temporada:'2026-2'},{fase:'regular'},{fase:'playoffs'},{fase:'final'}]) {c.game={...friendly,...changes};assert.equal(run(c,"jugadorElegible(guest,game,'A','var40')"),false);}
 c.game=clone(friendly);assert.equal(run(c,"jugadorElegible(guest,game,'B','var40')"),false);assert.equal(run(c,"jugadorElegible(guest,game,'A','fem40')"),false);
 c.game=clone(regular);assert.equal(run(c,"jugadorElegible(official,game,'A','var40')"),true);
 c.game={...regular,fase:undefined};assert.equal(run(c,'esJuegoOficial(game)'),true);
});
test('loader retains guest names, calendar games and isolated official datasets',async()=>{
 const s=await state(fixture());assert.equal(s.juegos.length,3);assert.equal(s.juegosOficiales.length,1);assert.equal(s.juegosAmistosos.length,2);assert.equal(s.jugadores.length,1);assert.equal(s.jugadoresPorId.G.nombre,'Invitado');
 const c=context();load(c,'js/amistosos.js');load(c,'js/datos.js');c.state=s;c.game=friendly;
 const html=run(c,'renderHojaEstadistica(game,state)');assert.match(html,/Invitado/);assert.match(html,/999/);
});
test('all official calculations and rendered summaries stay unchanged after adding friendlies',async()=>{
 const before=await state(fixture(false)),after=await state(fixture(true));
 const cases=[
 ['standing','S','categoriaActivaS="var40";temporadaActivaS="2026-1";','calcularStanding()'],
 ['lideres','L','categoriaActivaL="var40";temporadaActivaL="2026-1";','acumularEstadisticas()'],
 ['rankings','R','categoriaActivaR="var40";temporadaActivaR="2026-1";','[calcularEstadisticasEquipos(),renderSeccionMVP()]'],
 ['equipos','E','categoriaActivaE="var40";temporadaActivaE="2026-1";','[resumenEquipo("A"),totalesJugadores("A")]'],
 ['jugador','J','','[bitacoraDe("P"),contarMVP("P")]'],
 ['dashboard','D','','[temporadaRecienteDe("var40"),standingTop3("var40"),liderPuntos("var40"),render(),document.getElementById("contenido").innerHTML]'],
 ['comparar','CMP','categoriaActivaCmp="var40";temporadaActivaCmp="2026-1";equipoACmp="A";equipoBCmp="B";','[estadisticasTemporada("A"),render(),document.getElementById("contenido").innerHTML]']
 ];
 for(const [page,key,setup,expression] of cases){const evaluate=s=>{const c=context();load(c,'js/amistosos.js');load(c,'js/datos.js');load(c,'js/'+page+'.js');c.state=s;run(c,'ESTADO_'+key+'=state;'+setup);return JSON.stringify(run(c,expression));};assert.equal(evaluate(after),evaluate(before),page);}
});
test('player profile displays friendly totals separately, including guest-only profiles',async()=>{
 const c=context();load(c,'js/amistosos.js');load(c,'js/datos.js');load(c,'js/jugador.js');c.state=await state(fixture());run(c,'ESTADO_J=state;render("G")');const html=c.document.getElementById('contenido').innerHTML;assert.match(html,/Total oficial/);assert.match(html,/Amistosos — fuera/);assert.match(html,/999/);assert.equal(run(c,'bitacoraDe("G").length'),0);assert.equal(run(c,'contarMVP("G")'),0);
});
test('friendly isolation applies to every category and season',async()=>{
 const data=fixture();for(const cat of ['var40','fem40','var49'])for(const temp of ['2026-1','2026-2'])data['data/juegos_'+cat+'/'+temp+'.json']={juegos:[{...regular,id:cat+temp,temporada:temp},{...friendly,id:'F'+cat+temp,temporada:temp}]};
 const s=await state(data);assert.equal(s.juegosOficiales.length,6);assert.equal(s.juegosAmistosos.length,6);for(const cat of ['var40','fem40','var49'])for(const temp of ['2026-1','2026-2'])assert.equal(s.juegosOficiales.filter(j=>j.categoria_id===cat&&j.temporada===temp).length,1);
});
function setupAlta(existing=false){const c=context();load(c,'js/amistosos.js');form(c,'nuevo-jugador/index.html');c.roster={jugadores:existing?[clone(official)]:[]};c.game=clone(friendly);c.saved=[];run(c,"ghFetch=async p=>({sha:'test-sha',contenido:p==='data/roster.json'?structuredClone(roster):{juegos:[game]}});ghGuardar=async (p,sha,obj)=>saved.push({p,sha,obj});");c.structuredClone=structuredClone;
 for(const [id,v] of Object.entries({'sel-alcance':'amistoso','sel-modo':existing?'existente':'nuevo','sel-categoria':'var40','sel-temporada':'2026-1','sel-equipo':'A','sel-amistoso':'F','in-nombre':'Invitado','in-id':'G'}))value(c,id,v);
 if(existing)run(c,'jugadorExistenteElegido=roster.jugadores[0]');return c;}
test('new guest save writes only friendly participation and preserves SHA',async()=>{
 const c=setupAlta();await run(c,'guardar()');assert.equal(c.saved.length,1);const j=c.saved[0].obj.jugadores[0];assert.equal(j.membresias.length,0);assert.deepEqual(clone(j.participaciones_amistosos),[{...membership,juego_id:'F'}]);assert.equal(c.saved[0].sha,'test-sha');assert.equal(c.document.getElementById('btn-guardar').disabled,true);
});
test('existing person keeps official memberships when invited',async()=>{const c=setupAlta(true);await run(c,'guardar()');assert.equal(c.saved.length,1);const j=c.saved[0].obj.jugadores[0];assert.deepEqual(clone(j.membresias),[membership]);assert.equal(j.participaciones_amistosos[0].juego_id,'F');});
test('stale or duplicate invitations are rejected without saving',async()=>{
 for(const change of [{fase:'regular'},{local:'C'},{temporada:'2026-2'}]){const c=setupAlta();Object.assign(c.game,change);await run(c,'guardar()');assert.equal(c.saved.length,0);assert.match(c.document.getElementById('msg').textContent,/cambió/);}
 const c=setupAlta(true);c.roster.jugadores[0].participaciones_amistosos=[{...membership,juego_id:'F'}];await run(c,'guardar()');assert.equal(c.saved.length,0);
});
test('capture rejects guests in official games and duplicate players on both sides',()=>{
 const c=context();load(c,'js/amistosos.js');c.players=[clone(official),clone(guest)];c.game=clone(friendly);assert.doesNotThrow(()=>run(c,"validarParticipaciones(game,players,'var40')"));c.game.fase='regular';assert.throws(()=>run(c,"validarParticipaciones(game,players,'var40')"),/no autorizado/);
 c.game=clone(friendly);c.players[1].participaciones_amistosos.push({...membership,equipo_id:'B',juego_id:'F'});c.game.estadisticas_visita=[{jugador:'G'}];assert.throws(()=>run(c,"validarParticipaciones(game,players,'var40')"),/ambos equipos/);
});
test('calendar renders friendly label, score and guest statistics',async()=>{
 const c=context();load(c,'js/amistosos.js');load(c,'js/datos.js');load(c,'js/calendario.js');c.state=await state(fixture());c.game=friendly;run(c,'ESTADO=state;');const html=run(c,'renderJuego(game)');assert.match(html,/Amistoso/);assert.match(html,/999/);assert.match(html,/Invitado/);
});
test('normal league registration still creates a membership',async()=>{
 const c=setupAlta();value(c,'sel-alcance','liga');await run(c,'guardar()');assert.equal(c.saved.length,1);const j=c.saved[0].obj.jugadores[0];assert.deepEqual(clone(j.membresias),[membership]);assert.equal(j.participaciones_amistosos,undefined);
});
test('capture saves a friendly to its original file and refuses a guest after phase changes',async()=>{
 for(const phase of ['amistoso','regular']) {
  const c=context();load(c,'js/amistosos.js');form(c,'captura/index.html');c.game={...clone(friendly),fase:phase};c.players=[clone(official),clone(guest)];c.saved=[];c.structuredClone=structuredClone;
  run(c,"categoriaActual='var40';archivosJuegos=[{path:'data/juegos_var40/2026-1.json'}];origenPorJuegoId={F:0};ghFetch=async p=>({sha:'fresh-sha',contenido:p==='data/roster.json'?{jugadores:players}:{juegos:[structuredClone(game)]}});ghGuardar=async (p,sha,obj)=>saved.push({p,sha,obj});armarLista=lado=>lado==='local'?[{jugador:'G',puntos:999}]:[];");
  for(const [id,v] of Object.entries({'sel-juego':'F','sel-forfeit':'ninguno','sel-estatus':'jugado','marcador-local':'999','marcador-visita':'5','sel-mvp':'G'}))value(c,id,v);
  await run(c,'guardar()');assert.equal(c.saved.length,phase==='amistoso'?1:0);if(c.saved.length){assert.equal(c.saved[0].p,'data/juegos_var40/2026-1.json');assert.equal(c.saved[0].obj.juegos[0].fase,'amistoso');assert.equal(c.saved[0].sha,'fresh-sha');}else assert.match(c.document.getElementById('msg').textContent,/no autorizado/);
 }
});

