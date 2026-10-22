const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('Public pages load ordered deferred dependencies and enable the compiled loader before requesting data',()=>{
 for(const page of ['index.html',...['calendario','equipos','jugador','standing','lideres','rankings','dashboard','comparar','playoffs'].map(p=>p+'/index.html')]){
  const html=fs.readFileSync(path.join(root,page),'utf8'),scripts=[...html.matchAll(/<script\s+([^>]*\bsrc="([^"]+)"[^>]*)>/g)];
  assert.ok(scripts.every(s=>/\bdefer\b/.test(s[1])),page+' must not block parsing');
  const sources=scripts.map(s=>s[2].split('?')[0].split('/').at(-1));
  assert.equal(sources.filter(s=>s==='public-data.js').length,1,page);
  for(const dependency of ['fan-core.js','amistosos.js','public-data.js'])assert.ok(sources.indexOf(dependency)<sources.indexOf('datos.js'),page+' '+dependency);
 }
 for(const page of ['captura','agregar-juego','nuevo-jugador'])assert.doesNotMatch(fs.readFileSync(path.join(root,page,'index.html'),'utf8'),/src="[^"]*public-data\.js/,'Capture keeps its original token-based source');
});
function fixture({failRoster=false,revision='a'.repeat(24)}={}){
 const requests=[],ctx={window:{},document:{currentScript:{src:'https://league.test/js/public-data.js'}},URL,AbortController,setTimeout,clearTimeout};
 const prefix='data/public/'+revision+'/',seasonPath=prefix+'season/current.json',rosterPath=prefix+'roster.json';
 const index={schema:1,revision,files:{'data/temporadas.json':{temporadas:[{id:'2026-2',activa:true}]}},seasons:{'2026-2':seasonPath},summaries:{'2026-2':seasonPath},roster:rosterPath};
 ctx.fetch=async(url,options)=>{
  const name=new URL(url).pathname.slice(1);requests.push({name,cache:options.cache});
  if(name===rosterPath&&failRoster)throw Error('network');
  if(name===seasonPath)assert.ok(requests.some(r=>r.name===rosterPath),'Roster starts before season completes');
  return {ok:true,json:async()=>name==='data/public/index.json'?index:name===rosterPath?{jugadores:[{id:'p',nombre:'Original'}]}:{schema:1,revision,files:{},friendly:{equipos:[],jugadores:[],juegos:[]}}};
 };
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'js/public-data.js'),'utf8'),ctx);
 return {ctx,requests};
}
test('Roster loads alongside the season, with cache reuse restricted to revision-specific paths',async()=>{
 const f=fixture(),data=await f.ctx.window.LMBCPublic.load({publico:'completo',temporada:'activa'});
 assert.ok(data);assert.equal(f.requests.length,3);
 assert.equal(f.requests[0].cache,'no-cache');assert.ok(f.requests.slice(1).every(r=>r.cache==='force-cache'));
 assert.equal((await data.read('data/roster.json')).jugadores[0].nombre,'Original');
});
test('A new published revision requests new packages; a failed roster still allows the original-data fallback',async()=>{
 const a=fixture(),b=fixture({revision:'b'.repeat(24)}),failure=fixture({failRoster:true});
 assert.ok(await a.ctx.window.LMBCPublic.load({publico:'completo',temporada:'activa'}));
 assert.ok(await b.ctx.window.LMBCPublic.load({publico:'completo',temporada:'activa'}));
 assert.notEqual(a.requests[1].name,b.requests[1].name);
 assert.equal(await failure.ctx.window.LMBCPublic.load({publico:'completo',temporada:'activa'}),null);
});
