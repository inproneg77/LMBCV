const {test}=require('node:test'),assert=require('node:assert/strict');
const {jornadaModels,jornadaScopes}=require('../js/arena-core.js');
const state={categorias:[{id:'v40',nombre:'Varonil 40+'},{id:'f40',nombre:'Femenil 40+'}],temporadas:[{id:'s1',nombre:'Temporada 1'},{id:'s2',nombre:'Temporada 2'}],equiposPorId:{a:{nombre:'Local',logo:'img/a.png'},b:{nombre:'Visita',logo:'img/b.png'}},sedesPorId:{gym:{nombre:'Gimnasio'}},jugadoresPorId:{},patrocinadores:[]};
const base={id:'1',categoria_id:'v40',temporada:'s1',fecha:'2026-10-10',hora:'18:00',fase:'regular',estatus:'jugado',local:'a',visita:'b',sede_id:'gym',marcador_local:20,marcador_visita:0,forfeit:'visita'};
const games=[base,{...base,id:'2',hora:'19:00',estatus:'programado',marcador_local:null,marcador_visita:null,forfeit:''},{...base,id:'3',categoria_id:'f40'},{...base,id:'4',temporada:'s2'},{...base,id:'5',fase:'amistoso'},{...base,id:'6',fecha:'2026-10-11'},{...base,id:'7',estatus:'cancelado'}];
test('Jornada downloads isolate category, branch, date, season and friendlies without changing any source data',()=>{
 const before=JSON.stringify([games,state]);const scopes=jornadaScopes(games);assert.equal(scopes.length,5);
 const m=jornadaModels(games,state,scopes[0]);assert.equal(m.rol.rows.length,2);assert.equal(m.results.rows.length,1);assert.equal(m.rol.category,'Varonil 40+');assert.equal(m.rol.season,'Temporada 1');assert.equal(m.results.rows[0].cells[2],'20 – 0 · Forfeit');assert.deepEqual(m.results.rows[0].logos,['','img/a.png','','img/b.png','']);assert.equal(JSON.stringify([games,state]),before);
 assert.throws(()=>jornadaModels(games,state,{date:base.fecha}),/categoría/);
});
test('A visible team search discovers its scope but exports the COMPLETE category jornada, including pending games in the role only',()=>{
 const [scope]=jornadaScopes([games[0]]),m=jornadaModels(games,state,scope);assert.equal(m.rol.rows.length,2);assert.equal(m.results.rows.length,1);assert.equal(m.rol.rows[1].cells[3],'19:00');assert.match(m.results.note,/1 de 2/);
 const query=new URL(m.rol.page).searchParams;assert.equal(query.get('dia'),base.fecha);assert.equal(query.get('categoria'),'v40');assert.equal(query.get('temporada'),'s1');assert.equal(query.get('tipo'),'liga');assert.equal(query.get('equipo'),null);
});
test('Every scope generates its own image model, with no global cross-category export or empty results',()=>{
 for(const scope of jornadaScopes(games)){const m=jornadaModels(games,state,scope);const expected=games.filter(g=>g.fecha===scope.date&&g.categoria_id===scope.category&&g.temporada===scope.season&&(g.fase==='amistoso'?'Amistosos':'Liga')===scope.kind&&['jugado','programado'].includes(g.estatus));assert.equal(m.rol.rows.length,expected.length);assert.equal(m.results.rows.length,expected.filter(g=>g.estatus==='jugado').length);}
});
test('One shared image dialog supports results, MVP and tables: safe names, explicit sharing, copied scope, cancellation and cleanup',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');let shared=0,copied='',revoked=false,focused=false,closed;
 const controls=Object.fromEntries(['[data-dismiss]','[data-status]','[data-native]','[data-copy]'].map(k=>[k,{}]));
 const dialog={setAttribute(){},querySelector:k=>controls[k],showModal(){},addEventListener:(name,fn)=>{if(name==='close')closed=fn;},remove(){},close:()=>closed()};
 class URLs extends URL{static createObjectURL(){return 'blob:test';}static revokeObjectURL(){revoked=true;}}
 const window={},document={currentScript:{src:'https://league.test/js/arena.js'},addEventListener(){},createElement:()=>dialog,body:{append(){}}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../js/arena.js'),'utf8'),{window,document,URL:URLs,File,navigator:{canShare:()=>true,share:async()=>{shared++;throw {name:'AbortError'};},clipboard:{writeText:async p=>{copied=p;}}}});
 window.ArenaUI.shareImage({blob:new Blob(['png']),name:'equipo".png',title:'<Liga>',page:'https://league.test/calendario/?categoria=f40&dia=2026-10-10',trigger:{focus:()=>{focused=true;}}});
 assert.equal(shared,0);assert.match(dialog.innerHTML,/&lt;Liga&gt;/);assert.match(dialog.innerHTML,/equipo&quot;.png/);await controls['[data-native]'].onclick();assert.equal(shared,1);assert.equal(controls['[data-status]'].textContent,'');await controls['[data-copy]'].onclick();assert.match(copied,/categoria=f40&dia=2026-10-10/);controls['[data-dismiss]'].onclick();assert.ok(revoked&&focused);
});
