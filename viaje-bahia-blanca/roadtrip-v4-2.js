function renderStages(){
  refs.stages.innerHTML=state.stages.map((x,i)=>{
    const hasRoute=x.km>0;
    const status=x.routeHint||'Distancia pendiente de cálculo';
    const statusClass=status.startsWith('Error')?'route-error':status.startsWith('Automático')?'route-ok':'route-warn';
    return `<article class="stage-card" data-stage="${esc(x.id)}">
      <div class="stage-top">
        <div><div class="stage-title">Etapa ${i+1}</div><div class="stage-subtitle">${esc(x.from||'Origen')} → ${esc(x.to||'Destino')}</div></div>
        <div class="stage-actions">
          <button class="mini-btn move-stage move-up" type="button" aria-label="Subir etapa" ${i===0?'disabled':''}>↑</button>
          <button class="mini-btn move-stage move-down" type="button" aria-label="Bajar etapa" ${i===state.stages.length-1?'disabled':''}>↓</button>
          <button class="mini-btn map-stage" type="button">Google Maps ↗</button>
          <button class="mini-btn danger remove-stage" type="button" ${state.stages.length===1?'disabled':''}>Eliminar</button>
        </div>
      </div>
      <div class="stage-route-main">
        <div class="field"><label>Desde</label><input class="s-from" value="${esc(x.from)}" autocomplete="address-level2"></div>
        <div class="route-arrow" aria-hidden="true">→</div>
        <div class="field"><label>Hasta</label><input class="s-to" value="${esc(x.to)}" autocomplete="address-level2"></div>
        <button class="mini-btn calc-stage primary-action" type="button">↻ Calcular ruta</button>
      </div>
      <div class="stage-summary">
        <span class="cost-chip">${hasRoute?`${x.km.toLocaleString('es-AR')} km`:'Km pendientes'}</span>
        <span class="cost-chip">${x.routeMinutes?routeTimeText(x.routeMinutes):'Tiempo pendiente'}</span>
        <span class="cost-chip">Combustible: <strong data-stagefuel="${esc(x.id)}">${money(0)}</strong></span>
        <span class="cost-chip route-state ${statusClass}">${esc(status)}</span>
      </div>
      <details class="stage-details">
        <summary>Costos y ajustes del tramo</summary>
        <div class="stage-grid">
          <div class="field"><label>Km ruta <span class="label-help">editable</span></label><input class="s-km" type="number" min="0" step="0.1" value="${x.km}" inputmode="decimal"></div>
          <div class="field"><label>Km locales</label><input class="s-local" type="number" min="0" step="1" value="${x.localKm}" inputmode="numeric"></div>
          <div class="field"><label>Peajes</label><input class="s-tolls" type="number" min="0" step="0.01" value="${x.tolls}" inputmode="decimal"></div>
          <div class="field"><label>Estacionamiento</label><input class="s-parking" type="number" min="0" step="0.01" value="${x.parking}" inputmode="decimal"></div>
          <div class="field"><label>Noches previstas</label><input class="s-nights" type="number" min="0" step="1" value="${x.nights}" inputmode="numeric"></div>
        </div>
      </details>
    </article>`
  }).join('')
}

function renderStays(){
  refs.stays.innerHTML=state.stays.length?state.stays.map((x,i)=>{
    const nights=nightsBetween(x.checkIn,x.checkOut);
    const total=x.priceTotal>0?`${x.currency} ${x.priceTotal.toLocaleString('es-AR')}`:'Precio pendiente';
    const perNight=nights&&x.priceTotal?`${x.currency} ${(x.priceTotal/nights).toLocaleString('es-AR',{maximumFractionDigits:0})}/noche`:'';
    return `<article class="stay-card" data-stay="${esc(x.id)}">
      <div class="stay-top">
        <div class="stay-title-wrap"><div class="stay-title">Estadía ${i+1} · ${esc(x.name||'Alojamiento')}</div><div class="stay-subtitle">${esc(x.location||'Localidad pendiente')} · ${nights?`${nights} ${nights===1?'noche':'noches'}`:'fechas pendientes'}</div></div>
        <div class="stay-actions"><button class="mini-btn danger remove-stay" type="button">Eliminar</button></div>
      </div>
      <div class="stay-grid">
        <div class="field"><label>Alojamiento</label><input class="h-name" value="${esc(x.name)}" placeholder="Hotel, departamento…"></div>
        <div class="field"><label>Localidad</label><input class="h-location" value="${esc(x.location)}" placeholder="Ciudad o parada"></div>
        <div class="field"><label>Check-in</label><input class="h-in" type="date" value="${esc(x.checkIn)}"></div>
        <div class="field"><label>Check-out</label><input class="h-out" type="date" value="${esc(x.checkOut)}"></div>
        <div class="field"><label>Precio total</label><input class="h-price" type="number" min="0" step="0.01" value="${x.priceTotal}" inputmode="decimal"></div>
        <div class="field"><label>Moneda</label><select class="h-currency"><option value="ARS"${x.currency==='ARS'?' selected':''}>ARS</option><option value="USD"${x.currency==='USD'?' selected':''}>USD</option></select></div>
      </div>
      <div class="stay-summary"><span class="cost-chip">${esc(total)}</span>${perNight?`<span class="cost-chip">${esc(perNight)}</span>`:''}<span class="cost-chip">${x.include?'Incluida en presupuesto':'Excluida del presupuesto'}</span></div>
      <label class="include-label"><input class="h-include" type="checkbox"${x.include?' checked':''}> Incluir esta estadía en el presupuesto</label>
      <details class="stay-import">
        <summary>Importar precio desde una captura</summary>
        <div class="upload-box"><label class="upload-label">📷 Elegir captura<input class="h-photo" type="file" accept="image/png,image/jpeg,image/webp"></label></div>
        <span class="ocr-status">${esc(x.ocrHint||'El OCR intentará detectar el importe total. Revisalo antes de darlo por válido.')}</span>
      </details>
    </article>`
  }).join(''):'<div class="empty"><strong>Sin estadías todavía.</strong><br>Agregá la primera cuando tengas definida una parada o una reserva.</div>'
}

function opt(v,l,s){return`<option value="${v}"${v===s?' selected':''}>${l}</option>`}
function renderExpenses(){
  refs.expenseBody.innerHTML=state.expenses.map(x=>`<tr data-expense="${esc(x.id)}">
    <td data-label="Rubro"><select class="row-input e-cat">${CATEGORIES.map(c=>opt(c,c,x.category)).join('')}</select></td>
    <td data-label="Concepto"><input class="row-input e-name" value="${esc(x.name)}"></td>
    <td class="amount" data-label="Precio"><input class="row-input e-price" type="number" min="0" step="0.01" value="${x.price}" inputmode="decimal"></td>
    <td class="base" data-label="Base"><select class="row-input e-basis">${BASES.map(([v,l])=>opt(v,l,x.basis)).join('')}</select></td>
    <td class="result" data-label="Subtotal" data-exp-sub="${esc(x.id)}">${money(0)}</td>
    <td class="remove" data-label=""><button class="remove-btn remove-expense" type="button" aria-label="Eliminar gasto">×</button></td>
  </tr>`).join('')
}

function updateWorkflow(c){
  const routeDone=state.stages.filter(x=>x.km>0).length;
  const routeEl=document.querySelector('[data-workflow="route"]');
  el('routeStepStatus').textContent=routeDone===state.stages.length?`${routeDone} ${routeDone===1?'etapa calculada':'etapas calculadas'}`:`${routeDone}/${state.stages.length} etapas calculadas`;
  routeEl.classList.toggle('complete',routeDone===state.stages.length&&routeDone>0);routeEl.classList.toggle('warn',routeDone<state.stages.length);
  const included=state.stays.filter(x=>x.include&&x.priceTotal>0).length;
  const stayEl=document.querySelector('[data-workflow="stays"]');
  el('stayStepStatus').textContent=included?`${included} ${included===1?'reserva':'reservas'} · ${c.reservedNights} ${c.reservedNights===1?'noche':'noches'}`:'Sin reservas cargadas';
  stayEl.classList.toggle('complete',included>0);stayEl.classList.toggle('warn',included===0);
  const missing=[];
  if(!state.fuelPrice)missing.push('precio de combustible');
  if(state.stages.some(x=>!x.km))missing.push('distancias');
  if(state.stays.some(x=>x.include&&x.currency!==state.currency)&&!state.usdArs)missing.push('tipo de cambio');
  const budgetEl=document.querySelector('[data-workflow="budget"]');
  el('budgetStepStatus').textContent=missing.length?`Falta ${missing.slice(0,2).join(' y ')}`:`${money(c.total)} estimado`;
  budgetEl.classList.toggle('complete',!missing.length&&c.total>0);budgetEl.classList.toggle('warn',missing.length>0);
  const notice=el('setupNotice');
  if(missing.length){notice.className='setup-notice show';notice.innerHTML=`Para que el presupuesto sea completo, falta <strong>${missing.join(', ')}</strong>. Podés seguir cargando el resto mientras tanto.`}
  else{notice.className='setup-notice show ok';notice.textContent='Datos básicos completos. Ya podés concentrarte en ruta, estadías y gastos.'}
}

function renderTotals(){
  const c=calc();
  state.stages.forEach(x=>{const node=document.querySelector(`[data-stagefuel="${CSS.escape(x.id)}"]`);if(node)node.textContent=money((x.km+x.localKm)*state.fuelConsumption/100*state.fuelPrice)});
  c.otherRows.forEach(x=>{const n=document.querySelector(`[data-exp-sub="${CSS.escape(x.id)}"]`);if(n)n.textContent=money(x.subtotal)});
  el('summaryTotal').textContent=money(c.total);el('mobileTotal').textContent=money(c.total);el('summaryCar').textContent=money(c.car);el('summaryKm').textContent=`${Math.round(c.totalKm).toLocaleString('es-AR')} km`;el('summaryStays').textContent=money(c.stays);el('summaryNights').textContent=`${c.reservedNights} ${c.reservedNights===1?'noche':'noches'}`;el('summaryRemaining').textContent=state.budgetTarget?money(state.budgetTarget-c.total):'—';el('summaryTarget').textContent=state.budgetTarget?`Objetivo ${money(state.budgetTarget)}`:'Sin objetivo definido';el('summaryContingency').textContent=`Incluye ${state.contingency}% de contingencia`;
  el('heroKm').textContent=`${Math.round(c.totalKm).toLocaleString('es-AR')} km`;el('heroFuel').textContent=`${c.fuelLiters.toFixed(1)} L`;el('heroDuration').textContent=`${days()} ${days()===1?'día':'días'}`;el('heroTravelers').textContent=`${state.travelers} ${state.travelers===1?'viajero':'viajeros'}`;
  el('totalKmText').textContent=`${Math.round(c.totalKm).toLocaleString('es-AR')} km`;el('fuelLitersText').textContent=`${c.fuelLiters.toFixed(1)} L`;el('fuelCostText').textContent=money(c.fuelCost);el('tollsText').textContent=money(c.tolls);el('parkingText').textContent=money(c.parking);el('localKmText').textContent=`${Math.round(c.localKm).toLocaleString('es-AR')} km`;el('sideTotal').textContent=money(c.total);el('perPersonText').textContent=money(c.total/state.travelers);el('perPersonDayText').textContent=money(c.total/(state.travelers*days()));el('durationText').textContent=`${days()} ${days()===1?'día':'días'}`;el('driveTimeText').textContent=routeTimeText(c.driveMinutes);el('reservedNightsText').textContent=String(c.reservedNights);el('contingencyText').textContent=money(c.cont);
  const cats=[['Auto',c.car],['Alojamientos',c.stays],['Otros gastos',c.other]].filter(([,v])=>v>0),sum=cats.reduce((s,[,v])=>s+v,0);el('categoryBreakdown').innerHTML=cats.map(([name,v])=>`<div class="cat"><div class="cat-top"><div class="cat-name"><span class="dot"></span><span>${name}</span></div><span class="cat-amount">${money(v)}</span></div><div class="bar"><span style="width:${Math.max(3,v/sum*100).toFixed(1)}%"></span></div></div>`).join('')||'<p class="hint">Cargá importes para ver la distribución.</p>';
  const first=state.stages[0],last=state.stages[state.stages.length-1];el('routePreview').textContent=`${first?.from||state.origin} → ${last?.to||'Bahía Blanca'}`;
  updateWorkflow(c);save()
}

function syncConfig(){
  const oldOrigin=state.origin;
  state.origin=refs.origin.value.trim();
  if(state.stages[0]&&(!state.stages[0].from||state.stages[0].from===oldOrigin)){state.stages[0].from=state.origin;renderStages()}
  state.startDate=refs.startDate.value||state.startDate;state.endDate=refs.endDate.value||state.endDate;
  if(state.endDate<state.startDate){state.endDate=state.startDate;refs.endDate.value=state.endDate;flash('Ajusté la fecha de regreso para que no sea anterior a la salida.')}
  state.travelers=Math.max(1,Math.round(finite(refs.travelers.value,1)));state.currency=refs.currency.value;state.contingency=Math.min(100,Math.max(0,finite(refs.contingency.value)));state.fuelConsumption=Math.max(0,finite(refs.fuelConsumption.value));state.fuelPrice=Math.max(0,finite(refs.fuelPrice.value));state.usdArs=Math.max(0,finite(refs.usdArs.value));state.budgetTarget=Math.max(0,finite(refs.budgetTarget.value));state.notes=refs.notes.value;renderTotals()
}
function setConfig(){refs.origin.value=state.origin;refs.startDate.value=state.startDate;refs.endDate.value=state.endDate;refs.travelers.value=state.travelers;refs.currency.value=state.currency;refs.contingency.value=state.contingency;refs.fuelConsumption.value=state.fuelConsumption;refs.fuelPrice.value=state.fuelPrice;refs.usdArs.value=state.usdArs;refs.budgetTarget.value=state.budgetTarget;refs.notes.value=state.notes}
['origin','startDate','endDate','travelers','currency','contingency','fuelConsumption','fuelPrice','usdArs','budgetTarget','notes'].forEach(k=>el(k).addEventListener(k==='origin'||k==='notes'?'input':'change',syncConfig));
