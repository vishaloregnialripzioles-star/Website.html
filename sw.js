const PATCH = `(()=>{try{
  const oldToggle=window.toggle;
  window.toggle=function(id){if(typeof oldToggle==='function')oldToggle(id);window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()};
  window.markDashboardDirty=function(){window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()};
  window.save=function(body){if(typeof mergeDashboard==='function')mergeDashboard(window.dashboardDraft,body);if(body&&body.autoResponders)window.responders=body.autoResponders;if(typeof renderResponders==='function')renderResponders();window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar();if(typeof toast==='function')toast('Changes are waiting to be saved')};
  ['prefix','logChannel','bannedWords','giveawayChannel','giveawayMessage'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>{window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()}));
  document.getElementById('automodAction')?.addEventListener('change',()=>{window.dashboardDirty=true;if(typeof renderDashboardSaveBar==='function')renderDashboardSaveBar()});
  document.querySelectorAll('[onclick]').forEach(b=>{const f=b.getAttribute('onclick')||'';if(/^save(General|Automod|Giveaway)\\(\\)$/.test(f))b.textContent='Done'});
  const aiNav=[...document.querySelectorAll('a[href="#ai"]')];aiNav.forEach(e=>e.remove());
  document.getElementById('ai')?.remove();
  const aiButtons=[...document.querySelectorAll('[onclick="saveAi()"]')];aiButtons.forEach(e=>e.closest('.card')?.remove());
}catch(e){console.error('Dashboard fix',e)}})();`;
const BOT_API='https://server-1-05si.onrender.com';
const INVITE='https://discord.com/oauth2/authorize?client_id=1530577031753105409&permissions=8&integration_type=0&scope=bot';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.mode==='navigate'&&/^\\/dashboard\\/\\d+$/.test(u.pathname)){
    e.respondWith(fetch(e.request).then(async r=>{
      const text=await r.text();
      if(!text.includes('</body>'))return new Response(text,{status:r.status,headers:r.headers});
      const patched=text.replace('</body>',`<script>${PATCH}</script></body>`);
      return new Response(patched,{status:r.status,statusText:r.statusText,headers:r.headers});
    }));
    return;
  }
  if(e.request.mode==='navigate'&&u.pathname==='/servers'){
    e.respondWith(fetch(e.request).then(async r=>{
      const text=await r.text();
      const ids=[...text.matchAll(/href="\\/dashboard\\/(\\d+)">Open Dashboard<\\/a>/g)].map(m=>m[1]);
      if(!ids.length)return new Response(text,{status:r.status,statusText:r.statusText,headers:r.headers});
      const states=await Promise.all(ids.map(async id=>{try{const x=await fetch(`${BOT_API}/dashboard/bot-status/${id}`,{cache:'no-store'});if(!x.ok)return [id,false];const d=await x.json();return [id,!!d.present]}catch{return [id,false]}}));
      const present=new Map(states);
      const patched=text.replace(/<a class="btn" href="\\/dashboard\\/(\\d+)">Open Dashboard<\\/a>/g,(full,id)=>present.get(id)?full:`<a class="btn" href="${INVITE}" target="_blank" rel="noopener">Add Bot</a>`);
      return new Response(patched,{status:r.status,statusText:r.statusText,headers:r.headers});
    }));
  }
});
