(function(root){
'use strict';
function createPhotoStorage({fetcher=fetch,getToken}){
 const base='https://api.github.com/repos/inproneg77/LMBCV';
 const decode=s=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,'')),c=>c.charCodeAt(0))));
 async function api(path,method='GET',body){if(!getToken())throw new Error('Conecta tu token de GitHub.');const r=await fetcher(base+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+getToken(),Accept:'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(!r.ok)throw new Error(r.status===409||r.status===422?'El repositorio cambió durante el guardado. Vuelve a intentar; tu foto sigue seleccionada.':'GitHub respondió '+r.status+'. Revisa el token y su permiso Contents: Read and write.');return r.json();}
 async function roster(){const file=await api('/contents/data/roster.json?ref=main');return decode(file.content);}
 async function save(playerId,image){if(!image)throw new Error('Selecciona una foto.');const head=(await api('/git/ref/heads/main')).object.sha;const parent=await api('/git/commits/'+head);const file=await api('/contents/data/roster.json?ref='+head),data=decode(file.content);const player=data.jugadores.find(p=>p.id===playerId);if(!player)throw new Error('El jugador ya no existe. Recarga la lista.');const imagePath='img/jugadores/foto-'+crypto.randomUUID()+'.png';player.foto=imagePath;
 const photo=await api('/git/blobs','POST',{content:image,encoding:'base64'}),json=await api('/git/blobs','POST',{content:JSON.stringify(data,null,2)+'\n',encoding:'utf-8'});
 const tree=await api('/git/trees','POST',{base_tree:parent.tree.sha,tree:[{path:imagePath,mode:'100644',type:'blob',sha:photo.sha},{path:'data/roster.json',mode:'100644',type:'blob',sha:json.sha}]});
 const commit=await api('/git/commits','POST',{message:'Actualizar foto de jugador: '+player.nombre,tree:tree.sha,parents:[head]});
 await api('/git/refs/heads/main','PATCH',{sha:commit.sha,force:false});return {player,path:imagePath};
 }
 return {roster,save};
}
if(typeof module!=='undefined'&&module.exports){module.exports=createPhotoStorage;return;}
const $=id=>document.getElementById(id),message=(s)=>{$('photo-message').textContent=s;};
const store=createPhotoStorage({getToken:()=>localStorage.getItem('lmbc_gh_token')||''});
let players=[],image=null,busy=false,version=0;
$('photo-token').value=localStorage.getItem('lmbc_gh_token')||'';
function render(){const previous=$('photo-player').value,q=$('photo-search').value.trim().toLocaleLowerCase('es');$('photo-player').replaceChildren(new Option('Elige un jugador…',''),...players.filter(p=>p.nombre.toLocaleLowerCase('es').includes(q)).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es')).map(p=>new Option(p.nombre+' · '+p.id,p.id)));$('photo-player').value=previous;validate();}
function validate(){$('photo-save').disabled=busy||!image||!$('photo-player').value;const p=players.find(p=>p.id===$('photo-player').value);$('photo-current').textContent=p?(p.foto?'Este jugador ya tiene foto; guardar la reemplazará.':'Este jugador aún no tiene foto.'):'Selecciona al jugador.';}
async function load(){try{players=(await store.roster()).jugadores;render();message('Jugadores cargados. Selecciona al jugador y su foto.');}catch(e){message(e.message);}}
$('photo-connect').onclick=()=>{localStorage.setItem('lmbc_gh_token',$('photo-token').value.trim());load();};
$('photo-search').oninput=render;$('photo-player').onchange=validate;
$('photo-file').onchange=async()=>{const v=++version;image=null;validate();$('photo-preview').hidden=true;const file=$('photo-file').files[0];if(!file)return;let url;try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>10*1024*1024)throw new Error('Elige PNG, JPG o WebP de hasta 10 MB.');url=URL.createObjectURL(file);const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(new Error('No se pudo abrir la foto.'));img.src=url;});const scale=Math.min(1,768/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);if(v!==version)return;const png=canvas.toDataURL('image/png');image=png.split(',')[1];$('photo-preview').src=png;$('photo-preview').hidden=false;message('Foto lista para guardar.');}catch(e){message(e.message);}finally{if(url)URL.revokeObjectURL(url);validate();}};
$('photo-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const controls=Array.from($('photo-form').elements);controls.forEach(c=>c.disabled=true);message('Guardando foto y perfil juntos…');try{const result=await store.save($('photo-player').value,image);const p=players.find(p=>p.id===result.player.id);p.foto=result.path;message('Foto guardada para '+result.player.nombre+'. Aparecerá en su perfil cuando termine la publicación del sitio.');image=null;$('photo-file').value='';$('photo-preview').hidden=true;}catch(err){message(err.message);}finally{busy=false;controls.forEach(c=>c.disabled=false);validate();}};
if($('photo-token').value)load();
})(typeof window!=='undefined'?window:this);
