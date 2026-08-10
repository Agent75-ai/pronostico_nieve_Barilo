(function(){
  'use strict';
  var deferredPrompt=null;

  function addInstallButton(){
    if(document.getElementById('installPwaBtn'))return;
    var toolbar=document.querySelector('.toolbar');
    if(!toolbar)return;
    var b=document.createElement('button');
    b.id='installPwaBtn';
    b.type='button';
    b.className='soft';
    b.textContent='📲 Instalar BariSnow';
    b.style.display='none';
    b.addEventListener('click',function(){
      if(!deferredPrompt)return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(function(){
        deferredPrompt=null;
        b.style.display='none';
      });
    });
    toolbar.appendChild(b);
  }

  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){
      navigator.serviceWorker.register('./sw.js').catch(function(){});
    });
  }

  window.addEventListener('beforeinstallprompt',function(e){
    e.preventDefault();
    deferredPrompt=e;
    addInstallButton();
    var b=document.getElementById('installPwaBtn');
    if(b)b.style.display='inline-flex';
  });

  window.addEventListener('appinstalled',function(){
    deferredPrompt=null;
    var b=document.getElementById('installPwaBtn');
    if(b)b.remove();
  });

  document.addEventListener('DOMContentLoaded',addInstallButton);
})();
