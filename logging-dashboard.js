(()=>{
  if(!location.pathname.startsWith('/dashboard/')) return;
  const m=location.pathname.match(/\/dashboard\/(\d+)/); if(!m) return;
  const gid=m[1];
  const wait=()=>{const root=document.getElementById('advanced-dashboard-v3'); if(!root){setTimeout(wait,100);return} if(document.getElementById('logging-dashboard-v4'))return; init(root)};
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cats=[['messageDelete','Message Delete'],['messageEdit','Message Edit'],['messageBulkDelete','Bulk Message Delete'],['serverChanges','Server Changes'],['channelChanges','Channel Changes'],['roleChanges','Role Changes'],['memberChanges','Member Changes'],['moderation','Moderation Actions'],['joinsLeaves','Joins / Leaves'],['invites','Invites'],['commands','Commands'],['automod','AutoMod'],['giveaways','Giveaways']];
  async function init(root){
    const call=async(method,body)=>{const r=await fetch('/dashboard/api/'+gid+'/config',{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();let d={};try{d=JSON.parse(t)}catch{}if(!r.ok)throw new Error(d.error||t||'Request failed');return d};
    let cfg={};
    try{cfg=(await call('GET')).config||{}}catch(e){return}
    const nav=root.querySelector('#v3-nav'); if(!nav)return;
    const old=nav.querySelector('button[data-id="logging"]'); if(!old)return;
    old.onclick=()=>{root.querySelector('#v3-drawer').classList.remove('open');root.querySelector('#v3-overlay').classList.remove('open');render()};
    function render(){
      const panel=root.querySelector('#v3-panel'); if(!panel)return;
      const logs=cfg.logging||{}; const enabled=logs.enabled!==false; const selected=logs.categories||{}; const channels=logs.channels||{};
      panel.classList.remove('v3-hidden');
      panel.innerHTML=`<button class="v3-close" id="log-close">✕</button><h2 class="v3-title">Logging</h2><div class="v3-sub">Enable each log type and optionally send it to its own Discord channel. Leave a channel blank to use the main Log Channel.</div>
      <div class="v3-card"><div class="v3-row"><div><b>Logging</b><div class="v3-note">Master switch for all logging.</div></div><input class="v3-switch" id="log-master" type="checkbox" ${enabled?'checked':''}></div><div class="v3-field"><label>Main Log Channel ID</label><input class="v3-input" id="log-main" value="${esc(logs.channelId||cfg.logChannel||'')}" placeholder="123456789012345678"></div></div>
      <div class="v3-card"><h3>Logging Categories</h3><div class="v3-note" style="margin-bottom:12px">Turn a category on/off and choose a separate channel for it.</div><div style="display:grid;gap:10px">${cats.map(([key,label])=>`<div class="v3-log-item" style="display:grid;grid-template-columns:1fr 48px;gap:10px;align-items:center"><div><b>${label}</b><input class="v3-input log-channel" data-key="${key}" value="${esc(channels[key]||'')}" placeholder="Separate channel ID (optional)" style="margin-top:7px"><div class="v3-note">Blank = main log channel</div></div><input class="v3-switch log-enabled" data-key="${key}" type="checkbox" ${selected[key]!==false?'checked':''}></div>`).join('')}</div></div>
      <div class="v3-actions"><button class="v3-btn" id="log-save">Save Logging Settings</button><button class="v3-btn" id="log-test">Send Test Logs</button></div>`;
      panel.querySelector('#log-close').onclick=()=>panel.classList.add('v3-hidden');
      panel.querySelector('#log-save').onclick=async()=>{try{const categories={};const nextChannels={};panel.querySelectorAll('.log-enabled').forEach(e=>categories[e.dataset.key]=e.checked);panel.querySelectorAll('.log-channel').forEach(e=>{if(e.value.trim())nextChannels[e.dataset.key]=e.value.trim()});const next={...logs,enabled:panel.querySelector('#log-master').checked,channelId:panel.querySelector('#log-main').value.trim(),categories,channels:nextChannels};const out=await call('PUT',{logging:next,logChannel:next.channelId});cfg=out.config||{...cfg,logging:next,logChannel:next.channelId};notify('Logging settings saved successfully');render() }catch(e){notify(e.message)}};
      panel.querySelector('#log-test').onclick=async()=>{try{await call('PUT',{loggingTest:true});notify('Test request sent')}catch(e){notify(e.message)}};
    }
    function notify(t){const x=root.querySelector('#v3-toast');x.textContent=t;x.style.display='block';setTimeout(()=>x.style.display='none',2200)}
    root.querySelector('#v3-menu').addEventListener('click',async()=>{try{cfg=(await call('GET')).config||cfg}catch{} });
  }
  wait();
})();
