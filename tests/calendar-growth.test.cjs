const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
test('Calendar keeps every future and overdue schedule, paginates only old results and prints all filtered history',async()=>{
 const handlers={},content={innerHTML:'',buttons:[],append(b){this.buttons.push(b);},querySelectorAll(){return [];}};
 const past=Array.from({length:35},(_,i)=>({id:'past-'+i,fecha:'2026-08-'+String(i%28+1).padStart(2,'0'),hora:'20:00',estatus:'jugado',temporada:'2026-2',categoria_id:'var40'}));
 const future=['duela','municipal'].map(sede_id=>({id:sede_id,fecha:'2026-10-17',hora:'20:00',estatus:'programado',sede_id}));
 const overdue={id:'overdue',fecha:'2026-01-01',hora:'20:00',estatus:'programado',sede_id:'duela'};
 const state={juegos:[...past,...future,overdue],categorias:[],temporadas:[{id:'2026-2',activa:true}],patrocinadores:[]};
 const ctx=vm.createContext({URLSearchParams,window:{location:{search:''},addEventListener:(n,f)=>handlers[n]=f},document:{getElementById:id=>id==='contenido'?content:null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>({})},cargarDatos:async()=>state,iniciarTabs:()=>{},fechaLocalISO:()=> '2026-10-14',escaparHTML:String,MESES:Array(12).fill('Mes')});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/calendario.js'),'utf8').replace(/\biniciar\(\);\s*$/,''),ctx);
 vm.runInContext('renderJuego=j=>"<game id="+j.id+">";renderPatrocinadores=()=>{};renderProximoJuego=()=>{};formatearFecha=fecha=>({diaSemana:"día",texto:fecha});',ctx);
 await ctx.iniciar();vm.runInContext('tabsListas=true;render();',ctx);
 const count=()=> (content.innerHTML.match(/<game /g)||[]).length;
 const visiblePast=new Set(past.map(g=>g.fecha)).size;
 assert.ok(content.innerHTML.includes('id=duela>'));assert.ok(content.innerHTML.includes('id=municipal>'));assert.ok(content.innerHTML.includes('id=overdue>'));assert.ok(count()<state.juegos.length);
 assert.ok(content.buttons.length);content.buttons.at(-1).onclick();assert.ok(count()>15);
 handlers.beforeprint();assert.equal(count(),state.juegos.length);handlers.afterprint();assert.ok(count()<state.juegos.length);assert.equal(vm.runInContext('jornadasHistoricasMostradas',ctx),24);
});
