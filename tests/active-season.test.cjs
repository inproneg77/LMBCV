const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../js',name),'utf8');
const seasons=[{id:'2026-1',nombre:'Anterior',activa:false},{id:'2026-2',nombre:'Activa',activa:true}];
const flush=()=>new Promise(resolve=>setImmediate(resolve));

async function home(search){
 const requests=[],renders=[],app={innerHTML:''};
 const ctx=vm.createContext({URLSearchParams,location:{search},history:{replaceState(){}},CustomEvent:class{},window:{addEventListener(){},dispatchEvent(){}},document:{body:{dataset:{portal:'inicio'}},getElementById:id=>id==='portal-content'?app:null},LMBC:{url:p=>p,escape:String,read:k=>k==='lmbc_fan_context'?JSON.stringify({season:'2026-1',category:'var40'}):'',write(){}},PortalCore:{},FanView:{home:x=>{renders.push(x.season);return '';}},renderPatrocinadores(){},fetch:async()=>({ok:true,json:async()=>({torneos:[]})}),cargarDatos:async options=>{requests.push(options.temporada);return {categorias:[{id:'var40'}],temporadas:seasons,patrocinadores:[]};}});
 vm.runInContext(source('portal.js'),ctx);await flush();return {requests,renders};
}
test('Home ignores an old remembered season and requests the current active season',async()=>{const r=await home('');assert.deepEqual(r.requests,['activa']);assert.ok(r.renders.length);assert.ok(r.renders.every(s=>s==='2026-2'));});
test('An explicit historical home link still loads the requested season',async()=>{const r=await home('?temporada=2026-1');assert.deepEqual(r.requests,['2026-1']);assert.ok(r.renders.every(s=>s==='2026-1'));});

test('Public season selector defaults to active despite old browser preference, while allowing history and manual changes',()=>{
 for(const [search,expected] of [['','2026-2'],['?temporada=2026-1','2026-1'],['?temporada=invalid','2026-2']]){
  const changes=[],handlers={},select={value:'',addEventListener:(name,fn)=>handlers[name]=fn},cont={set innerHTML(html){select.value=html.match(/value="([^"]+)" selected/)[1];}};
  const ctx=vm.createContext({URLSearchParams,window:{location:{search},LMBC:{read:()=> '2026-1',write(){}}},document:{getElementById:id=>id==='temporada-selector'?cont:select}});
  vm.runInContext(source('datos.js'),ctx);ctx.iniciarSelectorTemporada(seasons,s=>changes.push(s));assert.equal(changes[0],expected);select.value='2026-1';handlers.change();assert.equal(changes.at(-1),'2026-1');
 }
});

async function calendar(search){
 const ctx=vm.createContext({URLSearchParams,window:{location:{search},addEventListener(){}},document:{querySelector:()=>null},cargarDatos:async()=>({temporadas:seasons,juegos:[{id:'historic',temporada:'2026-1'}],categorias:[],patrocinadores:[]}),iniciarTabs(){}});
 vm.runInContext(source('calendario.js').replace(/\biniciar\(\);\s*$/,''),ctx);
 vm.runInContext('renderPatrocinadores=()=>{};renderProximoJuego=()=>{};',ctx);
 await ctx.iniciar();return vm.runInContext('calendarFilter.season',ctx);
}
test('Calendar defaults to active season',async()=>assert.equal(await calendar(''),'2026-2'));
test('Calendar preserves explicit historical and all-season selections',async()=>{assert.equal(await calendar('?temporada=2026-1'),'2026-1');assert.equal(await calendar('?temporada='),'');});
test('An existing direct link to an old game remains accessible in its own season',async()=>assert.equal(await calendar('?juego=historic'),'2026-1'));
