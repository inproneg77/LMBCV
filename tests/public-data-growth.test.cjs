const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const source=name=>fs.readFileSync(path.join(root,'js',name+'.js'),'utf8');
const originalFiles=fs.readdirSync(path.join(root,'data'),{recursive:true}).filter(p=>p.endsWith('.json')&&!p.startsWith('public'+path.sep));
const originalHashes=()=>Object.fromEntries(originalFiles.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data',p))).digest('hex')]));
const before=originalHashes();
const built=require('../scripts/build-public-data.cjs').build(root);
async function loader(options={},accelerated=false,missingIndex=false,override=null){
 const requests=[],ctx={window:{location:{search:''}},document:{currentScript:{src:'https://league.test/js/public-data.js'}},URL,URLSearchParams,TextEncoder,crypto:crypto.webcrypto,AbortController,setTimeout,clearTimeout,console,FanCore:require('../js/fan-core.js'),fetch:async value=>{
  const name=String(value).startsWith('https:')?new URL(value).pathname.slice(1):String(value);
  const file=path.join(root,name),exists=fs.existsSync(file)&&!(missingIndex&&name==='data/public/index.json');
  requests.push({name,bytes:exists?fs.statSync(file).size:0});return {ok:exists,status:exists?200:404,json:async()=>{const data=JSON.parse(fs.readFileSync(file,'utf8'));return override?override(name,data):data;}};
 }};
 vm.createContext(ctx);vm.runInContext(source('amistosos'),ctx);
 if(accelerated)vm.runInContext(source('public-data'),ctx);
 vm.runInContext(source('datos'),ctx);
 const state=await ctx.cargarDatos(options);return {state,ctx,requests};
}
const plain=x=>JSON.parse(JSON.stringify(x));
test('Compiled public views never alter captures, rosters, seasons or sponsor sources',()=>assert.deepEqual(originalHashes(),before));
test('Current-season package preserves every league game, including all Polifuncional schedules and original stats',async()=>{
 const old=await loader({temporada:'activa'}),fast=await loader({temporada:'activa',publico:'completo'},true);
 assert.deepEqual(plain(fast.state.juegosOficiales),plain(old.state.juegosOficiales));
 assert.deepEqual(plain(fast.state.juegosAmistosos),plain(old.state.juegosAmistosos.filter(g=>g.temporada==='2026-2')));
 assert.ok(fast.state.juegosOficiales.some(g=>g.sede_id==='duela'&&g.estatus==='programado'));
 assert.ok(fast.requests.length<old.requests.length);assert.ok(!fast.requests.some(r=>r.name.includes('juegos_')));
});
test('Precalculated standings, leaders and performance match existing rules in EVERY category and season',async()=>{
 for(const season of ['2026-1','2026-2']){
  const old=await loader({temporada:season,amistosos:false}),fast=await loader({temporada:season,amistosos:false,publico:'resumen'},true);
  for(const result of [old,fast]){
   for(const module of ['standing','lideres','rankings'])vm.runInContext(source(module).replace(/^iniciar(?:Standing|Lideres|Rankings)\(\);\s*$/gm,''),result.ctx);
   result.ctx.state=result.state;result.ctx.season=season;vm.runInContext('ESTADO_S=state;ESTADO_L=state;ESTADO_R=state;temporadaActivaS=season;temporadaActivaL=season;temporadaActivaR=season;',result.ctx);
  }
  for(const cat of old.state.categorias){
   for(const result of [old,fast]){result.ctx.cat=cat.id;vm.runInContext('categoriaActivaS=cat;categoriaActivaL=cat;categoriaActivaR=cat;',result.ctx);}
   for(const fn of ['calcularStanding','acumularEstadisticas','calcularEstadisticasEquipos'])assert.deepEqual(plain(fast.ctx[fn]()),plain(old.ctx[fn]()),cat.id+' '+season+' '+fn);
  }
 }
});
test('Selecting an older season loads it once, including its friendlies and identities',async()=>{
 const fast=await loader({temporada:'activa',publico:'completo'},true),old=await loader();
 await Promise.all([fast.state.ensureSeason('2026-1'),fast.state.ensureSeason('2026-1')]);
 assert.equal(fast.requests.filter(r=>r.name.includes('/season/')).length,2);
 assert.deepEqual(plain(fast.state.juegosOficiales.filter(g=>g.temporada==='2026-1')),plain(old.state.juegosOficiales.filter(g=>g.temporada==='2026-1')));
 assert.deepEqual(plain(fast.state.juegosAmistosos.filter(g=>g.temporada==='2026-1')),plain(old.state.juegosAmistosos.filter(g=>g.temporada==='2026-1')));
});
test('Player starts with current participation and exact career totals; concurrent history loading never duplicates games',async()=>{
 const old=await loader(),fast=await loader({publico:'jugador',jugador:'ISAAOLA'},true);
 for(const result of [old,fast]){vm.runInContext(source('jugador').replace('iniciarJugador();',''),result.ctx);result.ctx.state=result.state;vm.runInContext('ESTADO_J=state;',result.ctx);}
 const all=old.ctx.bitacoraDe('ISAAOLA');const totals=all.reduce((a,f)=>({jj:a.jj+1,puntos:a.puntos+f.puntos,triples:a.triples+f.triples,faltas:a.faltas+f.faltas}),{jj:0,puntos:0,triples:0,faltas:0});
 assert.deepEqual(plain(fast.state.playerSummary.totals),totals);assert.equal(fast.ctx.contarMVP('ISAAOLA'),old.ctx.contarMVP('ISAAOLA'));
 assert.ok(fast.state.juegos.every(g=>g.temporada==='2026-2'));assert.ok(!fast.requests.some(r=>/\/roster\.json$|\/juegos_/.test(r.name)));
 await Promise.all([fast.state.ensureSeason('2026-1'),fast.state.ensureSeason('2026-1')]);
 const personal=rows=>plain(rows.map(({juego,...r})=>({...r,gameId:juego.id,category:juego.categoria_id,season:juego.temporada,date:juego.fecha})));assert.deepEqual(personal(fast.ctx.bitacoraDe('ISAAOLA')),personal(all));
});
test('Every player and guest career matches captured history and independent friendly groups',async()=>{
 const old=await loader();vm.runInContext(source('jugador').replace('iniciarJugador();',''),old.ctx);old.ctx.state=old.state;vm.runInContext('ESTADO_J=state;',old.ctx);
 const index=JSON.parse(built.output.get('data/public/index.json'));
 for(const id of Object.keys(old.state.jugadoresPorId)){
  const key=require('../scripts/build-public-data.cjs').digest(id),profile=JSON.parse(built.output.get(index.profileRoot+key+'/index.json'));
  const official=old.ctx.bitacoraDe(id),friends=old.ctx.bitacoraDe(id,old.state.juegosAmistosos);
  assert.equal(profile.totals.jj,official.length,id);assert.equal(profile.totals.puntos,official.reduce((n,f)=>n+f.puntos,0),id);
  assert.equal(profile.groups.filter(g=>g.kind==='amistosos').reduce((n,g)=>n+g.totales.jj,0),friends.length,id);
 }
});
test('Missing compiled artifacts fall back to original files, preserving capture-compatible behavior',async()=>{
 const old=await loader({temporada:'activa'}),fallback=await loader({temporada:'activa',publico:'completo'},true,true);
 assert.deepEqual(plain(fallback.state.juegos),plain(old.state.juegos));assert.ok(fallback.requests.some(r=>r.name.startsWith('data/juegos_')));
});
test('Token/capture mode never calls public artifacts or changes its read contract',async()=>{
 const result=await loader({},true);assert.ok(!result.requests.some(r=>r.name.startsWith('data/public/')));
 assert.equal(result.state.playerSummary,undefined);assert.ok(result.state.juegosOficiales.some(g=>g.temporada==='2026-1'));
});
test('Playoffs package keeps every recorded series and avoids downloading game statistics',async()=>{
 const old=await loader({temporada:'activa',roster:false,amistosos:false}),fast=await loader({temporada:'activa',publico:'playoffs',roster:false,amistosos:false},true);
 assert.deepEqual(plain(fast.state.playoffs),plain(old.state.playoffs));assert.equal(fast.state.juegos.length,0);assert.equal(fast.requests.length,1);
});

test('Incomplete index or mismatched package revision safely returns to original captures',async()=>{
 const old=await loader({temporada:'activa'});
 for(const override of [(name,data)=>name==='data/public/index.json'?{schema:1,revision:'broken',files:{}}:data,(name,data)=>name.includes('/season/')?{...data,revision:'old'}:data]){
  const result=await loader({temporada:'activa',publico:'completo'},true,false,override);
  assert.deepEqual(plain(result.state.juegos),plain(old.state.juegos));
 }
});
test('A failed player history request can be retried without losing current totals or duplicating games',async()=>{
 let fail=true;const oldSeason=require('../scripts/build-public-data.cjs').digest('2026-1');
 const result=await loader({publico:'jugador',jugador:'ISAAOLA'},true,false,(name,data)=>{if(name.includes('/player/')&&name.endsWith('/'+oldSeason+'.json')&&fail){fail=false;throw Error('simulated network failure');}return data;});
 const total=plain(result.state.playerSummary.totals);
 await assert.rejects(result.state.ensureSeason('2026-1'));assert.deepEqual(plain(result.state.playerSummary.totals),total);
 await result.state.ensureSeason('2026-1');assert.ok(result.state.juegos.some(g=>g.temporada==='2026-1'));assert.equal(new Set(result.state.juegos.map(g=>g.categoria_id+'|'+g.temporada+'|'+g.id)).size,result.state.juegos.length);
});
test('Active-season downloads remain bounded when fifty archived seasons exist',async()=>{
 const normal=await loader({temporada:'activa',publico:'completo'},true);
 const many=await loader({temporada:'activa',publico:'completo'},true,false,(name,data)=>name==='data/public/index.json'?{...data,files:{...data.files,'data/temporadas.json':{temporadas:[...data.files['data/temporadas.json'].temporadas,...Array.from({length:50},(_,i)=>({id:'archive-'+i,activa:false}))]}}}:data);
 assert.deepEqual(many.requests.map(r=>r.name),normal.requests.map(r=>r.name));assert.deepEqual(plain(many.state.juegos),plain(normal.state.juegos));
});
test('Measure actual public JSON transfer savings against original loaders',async t=>{
 const bytes=rows=>rows.reduce((n,r)=>n+r.bytes,0),report={};
 for(const [name,options] of [['season',{temporada:'activa',publico:'completo'}],['standings',{temporada:'activa',publico:'resumen',amistosos:false}],['player',{publico:'jugador',jugador:'ISAAOLA'}]]){
  const {publico,jugador,...original}=options,old=await loader(original),fast=await loader(options,true);
  report[name]={beforeBytes:bytes(old.requests),afterBytes:bytes(fast.requests),beforeRequests:old.requests.length,afterRequests:fast.requests.length};
  assert.ok(bytes(fast.requests)<bytes(old.requests),name);assert.ok(fast.requests.length<old.requests.length,name);
 }
 t.diagnostic(JSON.stringify(report));
});

test('New captures and edits produce a distinct complete revision without changing source JSON',()=>{
 const os=require('node:os'),fixture=fs.mkdtempSync(path.join(os.tmpdir(),'lmbc-growth-'));
 assert.ok(path.resolve(fixture).startsWith(path.resolve(os.tmpdir())+path.sep));
 try{
  fs.cpSync(path.join(root,'js'),path.join(fixture,'js'),{recursive:true});
  fs.cpSync(path.join(root,'data'),path.join(fixture,'data'),{recursive:true,filter:name=>!name.startsWith(path.join(root,'data/public'))});
  const categories=JSON.parse(fs.readFileSync(path.join(fixture,'data/categorias.json'),'utf8')),seasons=JSON.parse(fs.readFileSync(path.join(fixture,'data/temporadas.json'),'utf8')).temporadas;
  const name=categories.flatMap(c=>seasons.map(s=>path.join('juegos_'+c.id,s.id+'.json'))).find(p=>fs.existsSync(path.join(fixture,'data',p))&&JSON.parse(fs.readFileSync(path.join(fixture,'data',p),'utf8')).juegos?.some(g=>g.estatus==='programado'));
  assert.ok(name);const file=path.join(fixture,'data',name),data=JSON.parse(fs.readFileSync(file,'utf8')),game=data.juegos.find(g=>g.estatus==='programado');game.hora='23:15';
  fs.writeFileSync(file,JSON.stringify(data));const captured=fs.readFileSync(file,'utf8');
  const rebuilt=require('../scripts/build-public-data.cjs').build(fixture);assert.notEqual(rebuilt.revision,built.revision);assert.equal(fs.readFileSync(file,'utf8'),captured);
  const index=JSON.parse(rebuilt.output.get('data/public/index.json')),pack=JSON.parse(rebuilt.output.get(index.seasons[game.temporada]));
  assert.equal(pack.files['data/'+name.replaceAll(path.sep,'/')].juegos.find(g=>g.id===game.id).hora,'23:15');
 }finally{fs.rmSync(fixture,{recursive:true,force:true});}
});
