(()=>{
  const AUTO_KEY='bahiaFuelPriceAutoV1';
  const CACHE_KEY='bahiaFuelMarketCacheV1';
  const priceInput=document.getElementById('fuelPrice');
  if(!priceInput) return;
  const field=priceInput.closest('.field');
  const box=document.createElement('div');
  box.className='fuel-market-box';
  box.innerHTML=`<div class="fuel-market-top"><label class="fuel-market-toggle"><input id="fuelMarketAuto" type="checkbox"> Usar promedio nacional de nafta súper</label><button class="fuel-market-refresh" id="fuelMarketRefresh" type="button">↻ Actualizar precio</button></div><div class="fuel-market-status" id="fuelMarketStatus">Consultando precio de mercado…</div>`;
  field.appendChild(box);
  const auto=document.getElementById('fuelMarketAuto');
  const refresh=document.getElementById('fuelMarketRefresh');
  const status=document.getElementById('fuelMarketStatus');
  const autoDefault=localStorage.getItem(AUTO_KEY)!=='0';
  auto.checked=autoDefault;

  function fmt(v){return new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(v)||0)}
  function dateText(v){if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return String(v).slice(0,10);return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d)}
  function show(data,source='mercado'){
    if(!data||!Number.isFinite(Number(data.average_ars_liter)))return;
    const n=Number(data.average_ars_liter);
    const when=dateText(data.latest_reported_at||data.generated_at);
    status.innerHTML=`Promedio ${source}: <strong>${fmt(n)}/L</strong>${data.stations?` · ${data.stations} estaciones`:''}${when?` · ${when}`:''}.`;
  }
  function apply(data){
    const n=Number(data?.average_ars_liter);
    if(!Number.isFinite(n)||n<=0)return false;
    state.fuelPrice=n;
    priceInput.value=String(n);
    renderTotals();
    save();
    return true;
  }
  async function update(force=false){
    refresh.disabled=true;refresh.textContent='Actualizando…';
    status.textContent='Consultando promedio nacional de nafta súper…';
    try{
      const stamp=force?Date.now():new Date().toISOString().slice(0,10);
      const res=await fetch(`fuel-price.json?v=${encodeURIComponent(stamp)}`,{cache:force?'no-store':'default'});
      if(!res.ok)throw new Error('No se pudo consultar el precio');
      const data=await res.json();
      localStorage.setItem(CACHE_KEY,JSON.stringify(data));
      show(data,'nacional');
      if(auto.checked){apply(data);flash(`Nafta súper actualizada: ${fmt(data.average_ars_liter)}/L`)}
    }catch(err){
      let cached=null;try{cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null')}catch{}
      if(cached){show(cached,'guardado');if(auto.checked)apply(cached)}
      else status.textContent='No pude actualizar el promedio. Podés ingresar el precio manualmente.';
    }finally{refresh.disabled=false;refresh.textContent='↻ Actualizar precio'}
  }
  auto.addEventListener('change',()=>{
    localStorage.setItem(AUTO_KEY,auto.checked?'1':'0');
    priceInput.disabled=auto.checked;
    if(auto.checked)update(true); else {status.textContent='Modo manual: podés editar el precio por litro.';priceInput.focus()}
  });
  refresh.addEventListener('click',()=>update(true));
  priceInput.addEventListener('input',e=>{
    if(e.isTrusted&&!auto.checked)localStorage.setItem(AUTO_KEY,'0');
  });
  priceInput.disabled=auto.checked;
  update(false);
})();
