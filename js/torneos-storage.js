(function(root){
 'use strict';
 function createStorage({fetcher=fetch,getToken,core}){
  const base='https://api.github.com/repos/inproneg77/LMBCV';
  async function api(path,method='GET',body){const headers={'Accept':'application/vnd.github+json'};if(getToken())headers.Authorization='Bearer '+getToken();if(body)headers['Content-Type']='application/json';const response=await fetcher(base+path,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});if(!response.ok){let message='';try{message=(await response.json()).message??'';}catch{}const error=new Error(response.status===401||response.status===403?'No se pudo autorizar. Revisa que tu token tenga permiso de escritura en LMBCV.':response.status===409||response.status===422?'Otro guardado cambió el repositorio. Tu borrador se conserva; vuelve a intentar.':'GitHub respondió '+response.status+(message?': '+message:''));error.status=response.status;throw error;}return response.status===204?null:response.json();}
  const decode=content=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g,'')),c=>c.charCodeAt(0))));
  async function read(path,ref='main'){try{const file=await api('/contents/'+path+'?ref='+encodeURIComponent(ref));return {sha:file.sha,data:decode(file.content)};}catch(e){if(e.status===404)return {sha:null,data:null};throw e;}}
  async function publicJSON(path){const res=await fetcher('../'+path,{cache:'no-store'});if(!res.ok)throw new Error('No se pudo cargar el torneo. Vuelve a intentar.');return res.json();}
  async function catalog(admin){if(admin)return (await read('data/torneos/index.json')).data??{torneos:[]};return publicJSON('data/torneos/index.json');}
  async function load(id,admin){if(!/^tor-[a-f0-9]+$/.test(id))throw new Error('Identificador de torneo inválido.');const path='data/torneos/'+id+'.json';const file=admin?await read(path):{sha:null,data:await publicJSON(path)};if(!file.data)throw new Error('El torneo no existe.');core.validate(file.data);return file;}
  async function save(t,expectedSha,images={}){
   if(!getToken())throw new Error('Conecta tu token para guardar.');core.validate(t);
   const path='data/torneos/'+t.id+'.json';
   // Un commit publica documento, catálogo y logos juntos. No se pisan versiones ajenas.
   for(let attempt=0;attempt<2;attempt++){
    const head=(await api('/git/ref/heads/main')).object.sha;
    const current=await read(path,head);if(current.sha!==expectedSha){const error=new Error('Otra persona modificó este torneo. Tu borrador está conservado. Exporta una copia y abre la versión actual antes de combinar cambios.');error.status=409;throw error;}
    const index=(await read('data/torneos/index.json',head)).data??{torneos:[]};
    const summary={id:t.id,name:t.name,logo:t.logo,status:t.status,start:t.start,end:t.end,divisions:t.divisions.map(d=>({id:d.id,name:d.name,branch:d.branch})),updatedAt:new Date().toISOString()};
    index.torneos=[...index.torneos.filter(x=>x.id!==t.id),summary];
    const parent=await api('/git/commits/'+head);const entries=[];
    const dataBlob=await api('/git/blobs','POST',{content:JSON.stringify(t,null,2)+'\n',encoding:'utf-8'});entries.push({path,mode:'100644',type:'blob',sha:dataBlob.sha});
    const indexBlob=await api('/git/blobs','POST',{content:JSON.stringify(index,null,2)+'\n',encoding:'utf-8'});entries.push({path:'data/torneos/index.json',mode:'100644',type:'blob',sha:indexBlob.sha});
    for(const [imagePath,content] of Object.entries(images)){if(!imagePath.startsWith('img/torneos/'+t.id+'/')||!/\.png$/.test(imagePath))throw new Error('Ruta de logo inválida.');const blob=await api('/git/blobs','POST',{content,encoding:'base64'});entries.push({path:imagePath,mode:'100644',type:'blob',sha:blob.sha});}
    const tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:entries});
    const commit=await api('/git/commits','POST',{message:'Administrar torneo: '+t.name,tree:tree.sha,parents:[head]});
    try{await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return {sha:dataBlob.sha,commit:commit.sha};}catch(e){
      // Una respuesta perdida no significa que la escritura haya fallado.
      if(!e.status){try{const check=await read(path);if(check.sha===dataBlob.sha)return {sha:dataBlob.sha,commit:commit.sha};}catch{}}
      if(attempt===0&&[409,422].includes(e.status))continue;throw e;
    }
   }
  }
  return {api,read,load,catalog,save};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=createStorage;else root.createTournamentStorage=createStorage;
})(typeof window!=='undefined'?window:this);
