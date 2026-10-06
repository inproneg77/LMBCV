const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),C=require('../js/arena-core.js');
const state={equiposPorId:{a:{nombre:'Equipo largo <A>',logo:'img/a.png'},b:{nombre:'Visita',logo:'img/b.png'}},categorias:[{id:'var40',nombre:'Varonil 40+'}],temporadas:[{id:'2026-2',nombre:'2026-2'}],sedesPorId:{gym:{nombre:'Gimnasio municipal'}},jugadoresPorId:{p:{nombre:'Aníbal'}},patrocinadores:[{nombre:'Apoyo',logo:'img/s.png'}]};
const g={id:'V1',fecha:'2026-10-01',hora:'18:00',categoria_id:'var40',temporada:'2026-2',fase:'regular',estatus:'jugado',local:'a',visita:'b',marcador_local:55,marcador_visita:50,sede_id:'gym',mvp_jugador:'p'};
function ui(){
 const handlers={};const context={window:{},document:{currentScript:{src:'https://league.test/js/arena.js'},addEventListener:(e,f)=>handlers[e]=f},URL,URLSearchParams,ArenaCore:C,Map,console};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'js/arena.js'),'utf8'),context);return {api:context.window.ArenaUI,handlers};
}
test('share cards retain exact captured score, phase, season, MVP and URL without modifying data',()=>{
 const before=JSON.stringify([g,state]);for(const phase of ['regular','amistoso','playoffs','final']){const model=C.gameModel({...g,fase:phase,forfeit:'local'},state);assert.equal(model.localScore,55);assert.equal(model.visitorScore,50);assert.equal(model.forfeit,true);assert.equal(model.mvp,'Aníbal');assert.equal(new URLSearchParams(model.query).get('juego'),'V1');assert.equal(model.season,'2026-2');}
 assert.equal(JSON.stringify([g,state]),before);
});
test('only played games offer share actions and values are safe in HTML attributes',()=>{
 const {api}=ui();assert.equal(api.gameActions({...g,estatus:'programado'},state),'');const html=api.gameActions({...g,id:'<x>"'},state);assert.match(html,/Compartir resultado/);assert.match(html,/Compartir destacado/);assert.ok(!html.includes('<x>'));assert.ok(!api.gameActions({...g,mvp_jugador:''},state).includes('Compartir destacado'));
});
test('profile switch changes presentation and accessible pressed state without touching competition data',()=>{
 const {handlers}=ui();const official={dataset:{profilePanel:'oficial'},hidden:false},friendly={dataset:{profilePanel:'amistosos'},hidden:true};
 const root={querySelectorAll:s=>s==='[data-profile-panel]'?[official,friendly]:[first,second]};
 const first={dataset:{profileShow:'oficial'},setAttribute(k,v){this[k]=v;},closest:()=>root};
 const second={dataset:{profileShow:'amistosos'},setAttribute(k,v){this[k]=v;},closest:()=>root};
 const before=JSON.stringify(state);handlers.click({target:{closest:s=>s==='[data-profile-show]'?second:null}});assert.equal(official.hidden,true);assert.equal(friendly.hidden,false);assert.equal(second['aria-pressed'],'true');assert.equal(first['aria-pressed'],'false');
 handlers.click({target:{closest:s=>s==='[data-profile-show]'?first:null}});assert.equal(official.hidden,false);assert.equal(friendly.hidden,true);assert.equal(JSON.stringify(state),before);
});
test('new scripts have no API writes or token access and public pages load them before rendering',()=>{
 for(const p of ['js/arena.js','js/arena-core.js'])assert.doesNotMatch(fs.readFileSync(path.join(root,p),'utf8'),/localStorage|sessionStorage|ghGuardar|api.github|Authorization|method:\s*['"](?:POST|PUT|DELETE)/);
 for(const p of ['index.html','calendario/index.html','jugador/index.html','equipos/index.html','rankings/index.html']){const html=fs.readFileSync(path.join(root,p),'utf8');assert.ok(html.includes('css/arena.css'));assert.ok(html.indexOf('js/arena-core.js')<html.indexOf('js/arena.js'));assert.ok(html.indexOf('js/arena.js')<html.indexOf('js/amistosos.js'));assert.ok(html.includes('class="arena"'));}
});
