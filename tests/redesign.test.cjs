const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../js/portal-core.js');
test('catalog requests begin before a slow season index resolves',async()=>{
 const requested=[];let release;
 const gate=new Promise(r=>release=r);
 const context=vm.createContext({window:{},console,setTimeout,clearTimeout,AbortController,URLSearchParams,fetch:async p=>{
  requested.push(p);if(p==='data/temporadas.json')await gate;
  return {ok:true,status:200,json:async()=>p==='data/categorias.json'?[]:p==='data/sedes.json'?{sedes:[]}: {}};
 }});
 for(const p of ['js/amistosos.js','js/datos.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',p),'utf8'),context);
 const pending=vm.runInContext('cargarDatos()',context);
 assert.ok(requested.includes('data/roster.json'));assert.ok(requested.includes('data/equipos.json'));
 release();await pending;
});
test('calendar defers statistics rendering while preserving eager export support',()=>{
 let sheets=0;
 const context=vm.createContext({window:{},URLSearchParams,renderHojaEstadistica:()=>{sheets++;return 'FULL_STATS';},nombreMVP:()=>'',escaparHTML:String,RUTA_IMG:''});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/calendario.js'),'utf8').replace(/^iniciar\(\);\s*$/m,''),context);
 vm.runInContext("ESTADO={equiposPorId:{},sedesPorId:{},temporadas:[],categorias:[],jugadoresPorId:{}}",context);
 context.game={id:'g',estatus:'jugado',estadisticas_local:[{puntos:2}],marcador_local:2,marcador_visita:0};
 const deferred=vm.runInContext('renderJuego(game,true)',context);assert.equal(sheets,0);assert.ok(deferred.includes('juego-detalle'));assert.ok(!deferred.includes('FULL_STATS'));
 assert.match(vm.runInContext('renderJuego(game)',context),/FULL_STATS/);assert.equal(sheets,1);
});
const games=[
 {id:'a',categoria_id:'var40',temporada:'2026-2',local:'A',visita:'B',fase:'regular',estatus:'programado',fecha:'2026-10-01',hora:'18:00'},
 {id:'b',categoria_id:'var40',temporada:'2026-2',local:'A',visita:'C',fase:'amistoso',estatus:'jugado',fecha:'2026-09-25',hora:'17:00'},
 {id:'c',categoria_id:'fem40',temporada:'2026-1',local:'D',visita:'E',fase:'regular',estatus:'jugado',fecha:'2026-09-24',hora:'19:00'},
 {id:'d',categoria_id:'var40',temporada:'2026-2',local:'B',visita:'C',fase:'regular',estatus:'programado',fecha:'2026-09-20',hora:'18:00'}
];
test('calendar filters compose without mixing category, season, team, competition or result state',()=>{
 assert.deepEqual(C.filterGames(games,{category:'var40',season:'2026-2',team:'A',kind:'liga',state:'programado'}).map(g=>g.id),['a']);
 assert.deepEqual(C.filterGames(games,{kind:'amistoso'}).map(g=>g.id),['b']);
 assert.deepEqual(C.filterGames(games,{query:'quino'},{A:{nombre:'QUIÑONES'}}).map(g=>g.id),['a','b']);
 assert.equal(games.length,4);
});
test('upcoming excludes overdue schedules; recent uses date and time without mutating data',()=>{
 assert.deepEqual(C.upcoming(games,'2026-09-24').map(g=>g.id),['a']);
 assert.deepEqual(C.recent(games).map(g=>g.id),['b','c']);
 assert.deepEqual(games.map(g=>g.id),['a','b','c','d']);
});
test('portal leaders match official participation and exclude all friendly statistics',()=>{
 const line={jugador:'p',puntos:12,triples:2,asistio:true};const fixture=[{estatus:'jugado',fase:'regular',estadisticas_local:[line]},{estatus:'jugado',fase:'playoffs',estadisticas_visita:[line]},{estatus:'jugado',fase:'amistoso',estadisticas_local:[{...line,puntos:999}]},{estatus:'jugado',fase:'regular',estadisticas_local:[{...line,asistio:false}]}];
 assert.deepEqual(C.leaders(fixture,{p:{nombre:'Persona'}}),[{id:'p',name:'Persona',points:24,threes:4,games:2}]);
});
test('home loader requests selected season while full calendar retains all seasons',async()=>{
 const requested=[],root=path.join(__dirname,'..');const context=vm.createContext({window:{},console,setTimeout,clearTimeout,AbortController,URLSearchParams,fetch:async p=>{requested.push(p);try{const data=JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));return{ok:true,status:200,json:async()=>data};}catch{return{ok:false,status:404};}}});
 for(const p of ['js/amistosos.js','js/datos.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),context);
 const s=await vm.runInContext("cargarDatos({temporada:'2026-2'})",context);
 assert.equal(requested.filter(p=>p.startsWith('data/juegos_')).length,3);
 assert.ok(requested.filter(p=>p.startsWith('data/juegos_')).every(p=>p.endsWith('/2026-2.json')));
 assert.ok(s.temporadas.length>=2);
 requested.length=0;await vm.runInContext('cargarDatos()',context);
 assert.equal(requested.filter(p=>p.startsWith('data/juegos_')).length,s.temporadas.length*3);
});
