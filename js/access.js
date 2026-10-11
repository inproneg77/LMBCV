(function(root){
  'use strict';
  const key='lmbc_gh_token';
  const get=()=>{try{return sessionStorage.getItem(key)||localStorage.getItem(key)||'';}catch{return '';}};
  const remembered=()=>{try{return !!localStorage.getItem(key);}catch{return false;}};
  let remember=remembered();
  function set(value){try{localStorage.removeItem(key);sessionStorage.removeItem(key);(remember?localStorage:sessionStorage).setItem(key,String(value??'').trim());}catch{throw new Error('El navegador no pudo conservar el acceso. Revisa sus permisos de almacenamiento.');}}
  function disconnect(){try{localStorage.removeItem(key);sessionStorage.removeItem(key);}catch{}document.querySelectorAll('input[type=password]').forEach(e=>{e.value='';e.dispatchEvent(new Event('change',{bubbles:true}));});window.dispatchEvent(new Event('lmbc:access'));}
  function init(){const input=document.getElementById('token')||document.getElementById('photo-token')||document.getElementById('tor-token');if(!input)return;
    input.value=get();const row=document.createElement('div');row.className='access-options';
    const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.id='lmbc-remember-access';check.checked=remember;label.append(check,document.createTextNode(' Recordar acceso en este navegador'));
    check.onchange=()=>{const value=get();remember=check.checked;set(value);};const button=document.createElement('button');button.type='button';button.textContent='Desconectar';button.onclick=()=>{disconnect();button.textContent='Acceso desconectado';};row.append(label,button);input.parentElement.after(row);
  }
  root.LMBCAuth={get,set,disconnect};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
