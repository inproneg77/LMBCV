const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function context(search='',pathname='/administrar/reconocimientos/'){
 const elements=new Map(),values=new Map(),calls=[];
 const element=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',hidden:true,value:'',checked:false,addEventListener(){}});return elements.get(id);};
 const ctx=vm.createContext({URLSearchParams,location:{search,pathname,replace:url=>calls.push(['redirect',url])},window:{addEventListener(){}},document:{getElementById:element,addEventListener(){},querySelectorAll:()=>[]},LMBC:{escape:String,url:p=>'/'+p},LMBCHonors:require('../js/season-honors-core.js'),LMBCHonorsCard:{},LMBCAuth:{get:()=>'',set(){}},LMBCHonorsStorage:()=>({catalog:async()=>calls.push(['catalog']),save:async()=>calls.push(['save'])}),localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});
 return {ctx,calls,element,values};
}
test('Public recognition page contains no editor access or credentials; legacy edit link redirects into administration',()=>{
 const html=read('reconocimientos/index.html');assert.ok(!html.includes('Administrar cierre'));assert.ok(!html.includes('id="token"'));assert.ok(!html.includes('season-honors-storage.js'));assert.ok(!html.includes('access.js'));
 const admin=read('administrar/reconocimientos/index.html');assert.match(admin,/noindex,nofollow/);assert.match(admin,/id="token"/);assert.match(read('js/portal.js'),/administrar\/reconocimientos\//);
 const c=context('?administrar=1&temporada=2026-1','/reconocimientos/');vm.runInContext(read('js/season-honors.js'),c.ctx);assert.deepEqual(c.calls,[['redirect','/administrar/reconocimientos/?temporada=2026-1']]);
});
test('Without a token the administration page never loads working data or renders recognition controls',()=>{
 const c=context();vm.runInContext(read('js/season-honors.js'),c.ctx);assert.equal(c.calls.length,0);assert.equal(c.element('honors-filters').hidden,true);assert.match(c.element('honors-content').innerHTML,/Conecta tu token/);assert.ok(!c.element('honors-content').innerHTML.includes('MVP'));
});
test('Saving a working draft stays in browser storage and never sends it to GitHub',async()=>{
 const c=context(),src=read('js/season-honors.js'),marker="if(admin){window.addEventListener('lmbc:access'";
 const prefix=src.slice(0,src.lastIndexOf(marker));
 vm.runInContext(prefix+"window.testHooks={save,readLocalDraft,setDraft:r=>{draft=r;editor=()=>{};}};})();",c.ctx);
 const record={seasonId:'s',categoryId:'c',published:false,awards:[{name:'Trabajo sin publicar'}]};
 c.ctx.window.testHooks.setDraft(record);await c.ctx.window.testHooks.save(false);
 assert.equal(c.calls.length,0);assert.equal(c.values.size,1);assert.equal(c.ctx.window.testHooks.readLocalDraft('s','c').record.awards[0].name,'Trabajo sin publicar');assert.equal(c.ctx.window.testHooks.readLocalDraft('otro','c'),null);assert.match(c.element('honors-status').textContent,/solo en este navegador/);
});
test('Catalog refuses unauthenticated or read-only repository access before loading editor data',async()=>{
 const storage=require('../js/season-honors-storage.js');let calls=0;
 const fetcher=async()=>{calls++;return {ok:true,status:200,json:async()=>({permissions:{push:false}})};};
 await assert.rejects(storage({getToken:()=>'',fetcher}).catalog(),/token/);assert.equal(calls,0);
 await assert.rejects(storage({getToken:()=> 'test',fetcher}).catalog(),/permiso para administrar/);assert.equal(calls,1);
});
