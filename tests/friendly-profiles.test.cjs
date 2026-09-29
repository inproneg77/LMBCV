const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const friendly=JSON.parse(read('tests/fixtures/amistosos.json'));
const copy=x=>JSON.parse(JSON.stringify(x));
async function setup(){
 const nodes={};
 const c=vm.createContext({console,URLSearchParams,AbortController,setTimeout,clearTimeout,window:{location:{search:''}},document:{getElementById:id=>nodes[id]??=( {innerHTML:'',addEventListener(){}} )}});
 const players=friendly.jugadores.filter(p=>p.origen_liga_id).map(p=>({id:p.origen_liga_id,nombre:p.nombre,membresias:[{equipo_id:'OSV40',categoria_id:'var40',temporada:'2026-2'}]}));
 const teams=friendly.equipos.filter(e=>e.origen_liga_id).map(e=>({id:e.origen_liga_id,nombre:e.nombre,categorias:['var40']}));
 const data={'data/amistosos.json':copy(friendly),'data/roster.json':{jugadores:players},'data/equipos.json':{equipos:teams},'data/temporadas.json':{temporadas:[{id:'2026-2'}]},'data/categorias.json':[{id:'var40'}],'data/sedes.json':{sedes:[]},'data/patrocinadores.json':{patrocinadores:[]},'data/juegos_var40/2026-2.json':{juegos:[{id:'official',fecha:'2026-09-01',temporada:'2026-2',local:'OSV40',visita:'CUERVOSV40',estatus:'jugado',fase:'regular',marcador_local:12,marcador_visita:5,estadisticas_local:[{jugador:players[0].id,puntos:12,triples:1,faltas:2}]}]}};
 c.fetch=async url=>({ok:true,json:async()=>copy(data[url]??{})});
 const run=s=>vm.runInContext(s,c);
 for(const file of ['amistosos','datos','jugador','equipos'])run(read('js/'+file+'.js').replace(/^iniciar(?:Jugador|Equipos)\(\);\s*$/gm,''));
 c.state=await run('cargarDatos()');run('ESTADO_J=state;ESTADO_E=state;categoriaActivaE="var40";temporadaActivaE="2026-2"');
 return {c,run,nodes};
}
test('existing captured copies populate league player profiles without changing official totals',async()=>{
 const {c,run,nodes}=await setup();const before=JSON.stringify(c.state);
 for(const p of friendly.jugadores.filter(p=>p.origen_liga_id)){
  c.pid=p.origen_liga_id;
  const expected=friendly.juegos.flatMap(j=>j.estatus==='jugado'?[...(j.estadisticas_local??[]),...(j.estadisticas_visita??[])].filter(e=>e.jugador===p.id&&String(e.asistio)!=='false'):[]).reduce((s,e)=>s+Number(e.puntos||0),0);
  assert.equal(run('bitacoraDe(pid,state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)'),expected,p.nombre);
 }
 c.pid=friendly.jugadores[0].origen_liga_id;
 assert.equal(run('bitacoraDe(pid).reduce((s,f)=>s+f.puntos,0)'),12);
 run('render(pid)');assert.match(nodes.contenido.innerHTML,/Amistosos — fuera/);
 assert.equal(JSON.stringify(c.state),before);
});
test('team friendly history and roster totals follow original IDs and stay outside league standings',async()=>{
 const {c,run,nodes}=await setup();
 assert.equal(run('resumenEquipo("OSV40").pf'),12);
 assert.equal(run('juegosDelEquipo("OSV40",state.juegosAmistosos).length'),1);
 assert.equal(run('totalesJugadores("OSV40",state.juegosAmistosos).reduce((s,p)=>s+p.puntos,0)'),55);
 run('renderDetalleEquipo("OSV40")');assert.match(nodes.contenido.innerHTML,/55 puntos a favor/);assert.match(nodes.contenido.innerHTML,/vs PATA DURA/);assert.match(nodes.contenido.innerHTML,/55-50/);
 assert.equal(run('resumenEquipo("OSV40").pf'),12);
 run('temporadaActivaE="otra"');assert.equal(run('juegosDelEquipo("OSV40",state.juegosAmistosos).length'),0);
 run('temporadaActivaE="2026-2";categoriaActivaE="fem40"');assert.equal(run('juegosDelEquipo("OSV40",state.juegosAmistosos).length'),0);
});
test('guests remain separate and name equality never associates unrelated players',async()=>{
 const {c,run}=await setup();c.guest=friendly.jugadores.find(p=>!p.origen_liga_id).id;
 assert.equal(run('bitacoraDe(guest).length'),0);
 assert.ok(run('bitacoraDe(guest,state.juegosAmistosos).length')>0);
 assert.equal(run('mismoRegistroAmistoso("a","b",{a:{nombre:"Igual"},b:{nombre:"Igual"}})'),false);
});
test('fresh captures, edits, deletions, attendance and visitor side are reflected without cached totals',async()=>{
 const {c,run}=await setup();c.pid=friendly.jugadores[0].origen_liga_id;c.alias=friendly.jugadores[0].id;
 const original=run('bitacoraDe(pid,state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)');
 run('state.juegosAmistosos.push({id:"new",fase:"amistoso",categoria_id:"var40",temporada:"2026-2",estatus:"jugado",fecha:"2026-10-01",local:"guest",visita:"OSV40",marcador_local:4,marcador_visita:20,estadisticas_visita:[{jugador:alias,puntos:20}]})');
 assert.equal(run('bitacoraDe(pid,state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)'),original+20);
 assert.equal(run('totalesJugadores("OSV40",state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)'),75);
 run('state.juegosAmistosos.at(-1).estadisticas_visita[0].asistio=false');
 assert.equal(run('bitacoraDe(pid,state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)'),original);
 run('state.juegosAmistosos.pop()');assert.equal(run('totalesJugadores("OSV40",state.juegosAmistosos).reduce((s,f)=>s+f.puntos,0)'),55);
 assert.equal(run('resumenEquipo("OSV40").pf'),12);
});
