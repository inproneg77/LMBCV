(function(root){
  'use strict';
  let scope='',dirty=false,busy=false,host=null,baseline='',restoring=false;
  const storageKey=()=> 'lmbc_capture_draft:'+scope;
  const contextField=e=>/(sel-cat$|sel-categoria$|sel-juego$|modo-captura|sel-modo$|sel-juego-existente$)/.test(e.id);
  const fields=()=>Array.from((host||document).querySelectorAll('input,select,textarea')).filter(e=>!['password','file','button','submit'].includes(e.type)&&!/(token|remember)/.test(e.id)&&!(scope.startsWith('resultado:')&&contextField(e)));
  const key=(e,i)=>e.id||[e.closest('.cap-fila')?.dataset.jugador,e.closest('[id]')?.id,e.className,i].join('|');
  function values(){return fields().map((e,i)=>({key:key(e,i),value:e.value,checked:e.checked}));}
  function status(text){let node=document.getElementById('capture-draft-status');if(!node&&host){node=document.createElement('p');node.id='capture-draft-status';node.className='results-note';node.setAttribute('role','status');host.prepend(node);}if(node)node.textContent=text;}
  function persist(){if(!scope||restoring)return;const snapshot=values(),encoded=JSON.stringify(snapshot);dirty=encoded!==baseline;if(!dirty)return;try{localStorage.setItem(storageKey(),JSON.stringify({at:new Date().toISOString(),baseline,fields:snapshot}));status('Borrador conservado en este navegador. Pendiente de guardar.');}catch{status('Hay cambios pendientes. No cierres la página antes de guardar o copiar tu captura.');}}
  function open(id){scope=id;host=document.querySelector('.cap-wrap')||document.querySelector('main');baseline=JSON.stringify(values());dirty=false;
    try{const saved=JSON.parse(localStorage.getItem(storageKey())||'null');if(saved&&confirm((saved.baseline&&saved.baseline!==baseline?'Los datos guardados cambiaron desde tu borrador. Deberás revisar y conciliar los valores. ':'')+'Hay un borrador pendiente de esta captura. ¿Recuperarlo?')){restoring=true;const map=new Map(saved.fields.map(f=>[f.key,f]));fields().forEach((e,i)=>{const f=map.get(key(e,i));if(f){e.value=f.value;if(e.type==='checkbox')e.checked=f.checked;if(e.tagName==='SELECT'||e.type==='checkbox')e.dispatchEvent(new Event('change',{bubbles:true}));e.closest('.cap-fila')?.classList.toggle('activo',!!e.closest('.cap-fila')?.querySelector('.chk-jugo')?.checked);}});dirty=true;status('Borrador recuperado. Revisa los datos antes de guardarlos. Los archivos elegidos deben seleccionarse de nuevo.');}else status('Los cambios se conservarán como borrador en este navegador.');}catch{status('No se pudo recuperar el borrador.');}finally{restoring=false;}
  }
  function clear(){try{localStorage.removeItem(storageKey());}catch{}baseline=JSON.stringify(values());dirty=false;status('Captura guardada en GitHub. La publicación del sitio puede seguir en proceso.');}
  document.addEventListener('input',e=>{if(!['password','file'].includes(e.target.type)&&!/(token|remember)/.test(e.target.id))persist();});
  document.addEventListener('change',e=>{if(!contextField(e.target)&&!['password','file'].includes(e.target.type)&&!/(token|remember)/.test(e.target.id))persist();});
  window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
  root.CaptureGuard={open,clear,persist,setBusy:v=>{busy=v;},isDirty:()=>dirty};
})(window);
