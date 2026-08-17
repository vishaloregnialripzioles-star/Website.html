const PATCH = `(()=>{try{const oldToggle=window.toggle;window.toggle=function(id){if(typeof oldToggle==='function')oldToggle(id);window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()};window.markDashboardDirty=function(){window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()};window.save=function(body){if(typeof mergeDashboard==='function')mergeDashboard(window.dashboardDraft,body);if(body&&body.autoResponders)window.responders=body.autoResponders;if(typeof renderResponders==='function')renderResponders();window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar();if(typeof toast==='function')toast('Changes are waiting to be saved')};['prefix','logChannel','bannedWords','giveawayChannel','giveawayMessage','aiChannel'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()}));document.getElementById('automodAction')?.addEventListener('change',()=>{window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()});document.querySelectorAll('[onclick]').forEach(b=>{const f=b.getAttribute('onclick')||'';if(/^save(General|Automod|Ai|Giveaway)\(\)$/.test(f))b.textContent='Done'})}catch(e){console.error('Dashboard fix',e)}})();`;
const SERVER_PATCH = `<script>(()=>{const INVITE='https://discord.com/oauth2/authorize?client_id=1530577031753105409&permissions=8&integration_type=0&scope=bot';const cards=[...document.querySelectorAll('.card')];cards.forEach(card=>{const text=card.textContent||'';const m=text.match(/\\b(\\d{17,20})\\b/);if(!m)return;const guildId=m[1];const old=card.querySelector('a.btn');if(!old)return;old.textContent='Checking bot…';old.removeAttribute('href');fetch('/dashboard/api/'+guildId+'/config',{credentials:'same-origin'}).then(r=>{if(r.ok){old.textContent='Open Dashboard';old.href='/dashboard/'+guildId}else{old.textContent='Add Bot';old.href=INVITE;old.target='_blank';old.rel='noopener noreferrer'}}).catch(()=>{old.textContent='Add Bot';old.href=INVITE;old.target='_blank';old.rel='noopener noreferrer'});});})();</script>`;
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'&&u.pathname==='/servers'){
    e.respondWith(fetch(e.request).then(async r=>{
      const text=await r.text();
      if(!text.includes('</body>'))return new Response(text,{status:r.status,headers:r.headers});
      const patched=text.replace('</body>',SERVER_PATCH+'</body>');
      return new Response(patched,{status:r.status,statusText:r.statusText,headers:r.headers});
    }));
    return;
  }
  if(e.request.mode==='navigate'&&/^\/dashboard\/\d+$/.test(u.pathname)){
    e.respondWith(fetch(e.request).then(async r=>{
      const text=await r.text();
      if(!text.includes('</body>'))return new Response(text,{status:r.status,headers:r.headers});
      const patched=text.replace('</body>',`<script>${PATCH}</script></body>`);
      return new Response(patched,{status:r.status,statusText:r.statusText,headers:r.headers});
    }));
  }
});
