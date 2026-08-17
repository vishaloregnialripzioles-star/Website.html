import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('./server.js', import.meta.url);
let text = await readFile(path, 'utf8');

if (!text.includes('BOT_PRESENCE_SELECTOR_PATCH')) {
  const start = text.indexOf("if(url.pathname==='/servers'){");
  const end = text.indexOf('    const dm=', start);
  if (start < 0 || end < 0) throw new Error('Could not locate /servers route in server.js');
  const replacement = `if(url.pathname==='/servers'){
      const s=getSession(req);if(!s){res.writeHead(302,{Location:'/'});return res.end()}
      // BOT_PRESENCE_SELECTOR_PATCH
      const cards=(await Promise.all(s.guilds.map(async g=>{
        let present=false;
        try{
          const r=await fetch(COMMAND_HUB_API_URL+'/dashboard/bot-status/'+g.id,{headers:{Origin:PUBLIC_URL},cache:'no-store'});
          if(r.ok){const d=await r.json();present=!!d.present;}
        }catch{}
        const action=present
          ? \`<a class="btn" href="/dashboard/\${g.id}">Open Dashboard</a>\`
          : \`<a class="btn" href="https://discord.com/oauth2/authorize?client_id=1530577031753105409&permissions=8&integration_type=0&scope=bot" target="_blank" rel="noopener">Add Bot</a>\`;
        return \`<div class="card"><div class="bolt">⚡</div><h2>\${esc(g.name)}</h2><p class="muted">\${esc(g.id)}</p>\${action}</div>\`;
      }))).join('');
      return res.end(page('Select Server',\`<main class="content"><div class="hero"><h2>Select a server</h2><div class="muted">Choose a server you manage.</div></div><div class="grid">\${cards||'<div class="card"><p class="muted">No manageable servers found.</p></div>'}</div></main>\`));
    }
`;
  text = text.slice(0, start) + replacement + text.slice(end);
}

if (!text.includes('DASHBOARD_SAVE_PATCH_V2')) {
  const marker = '\n// Dashboard draft/save behavior:';
  const start = text.indexOf(marker);
  const end = text.indexOf('\nload();\n</script>', start);
  if (start < 0 || end < 0) throw new Error('Could not locate dashboard save block in server.js');

  const replacement = String.raw`\n// DASHBOARD_SAVE_PATCH_V2
let dashboardSaved = {};
let dashboardDirty = false;
function cloneDashboard(v){ return JSON.parse(JSON.stringify(v ?? {})); }
function markDashboardDirty(){ dashboardDirty=true; renderDashboardSaveBar(); }
function renderDashboardSaveBar(){
  let bar=document.getElementById('dashboard-savebar');
  if(!dashboardDirty){if(bar)bar.remove();return;}
  if(bar)return;
  bar=document.createElement('div');bar.id='dashboard-savebar';
  bar.style='position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:#0d1017ee;border:1px solid #353c4a;box-shadow:0 18px 55px #0009;border-radius:12px;padding:10px 12px;z-index:9999;backdrop-filter:blur(14px)';
  bar.innerHTML='<span style="color:#e5e8ef;font-weight:650;white-space:nowrap">⚠️ You have unsaved changes</span><button id="dashboard-reset" class="btn secondary">Reset</button><button id="dashboard-save" class="btn">Save changes</button>';
  document.body.appendChild(bar);
  document.getElementById('dashboard-reset').onclick=resetDashboardChanges;
  document.getElementById('dashboard-save').onclick=saveDashboardChanges;
}
function save(body){ if(body?.autoResponders)responders=body.autoResponders;markDashboardDirty();toast('Successfully changed — click Save changes to apply'); }
function dashboardSnapshotFromDom(){return {
  prefix:document.getElementById('prefix').value.trim()||'.',
  logChannel:document.getElementById('logChannel').value.trim()||undefined,
  autoResponders:responders,
  automod:{enabled:on('automodEnabled'),antiSpam:on('antiSpam'),antiScam:on('antiScam'),massMentions:on('massMentions'),suspiciousLinks:on('suspiciousLinks'),bannedWords:document.getElementById('bannedWords').value.split('\\n').map(x=>x.trim()).filter(Boolean),action:document.getElementById('automodAction').value},
  ai:{enabled:on('aiEnabled'),mentionOnly:on('mentionOnly'),channelId:document.getElementById('aiChannel').value.trim()||undefined},
  giveawayDaily:{enabled:on('giveawayEnabled'),channelId:document.getElementById('giveawayChannel').value.trim()||undefined,message:document.getElementById('giveawayMessage').value}
};}
async function saveDashboardChanges(){
  const body=dashboardSnapshotFromDom();
  try{
    const r=await fetch('/dashboard/api/'+id+'/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){toast(d.error||'Save failed');return;}
    cfg=d.config||cfg;responders=d.autoResponders||responders;dashboardSaved=cloneDashboard(body);dashboardDirty=false;renderDashboardSaveBar();toast('Successfully saved to this server');
  }catch(e){toast('Could not save changes');}
}
function resetDashboardChanges(){
  const s=dashboardSaved||{};
  document.getElementById('prefix').value=s.prefix||'.';document.getElementById('logChannel').value=s.logChannel||'';responders=cloneDashboard(s.autoResponders||[]);
  const a=s.automod||{};setSwitch('automodEnabled',a.enabled);setSwitch('antiSpam',a.antiSpam);setSwitch('antiScam',a.antiScam);setSwitch('massMentions',a.massMentions);setSwitch('suspiciousLinks',a.suspiciousLinks);document.getElementById('bannedWords').value=(a.bannedWords||[]).join('\\n');document.getElementById('automodAction').value=a.action||'delete_timeout';
  const ai=s.ai||{};setSwitch('aiEnabled',ai.enabled);setSwitch('mentionOnly',ai.mentionOnly);document.getElementById('aiChannel').value=ai.channelId||'';
  const gw=s.giveawayDaily||{};setSwitch('giveawayEnabled',gw.enabled);document.getElementById('giveawayChannel').value=gw.channelId||'';document.getElementById('giveawayMessage').value=gw.message||'🎁 Don’t forget to enter our active giveaway!';renderResponders();dashboardDirty=false;renderDashboardSaveBar();toast('Changes reset');
}
const originalLoad=load;
load=async function(){await originalLoad();dashboardSaved=cloneDashboard(dashboardSnapshotFromDom());dashboardDirty=false;renderDashboardSaveBar();['prefix','logChannel','bannedWords','giveawayChannel','giveawayMessage','aiChannel'].forEach(x=>document.getElementById(x)?.addEventListener('input',markDashboardDirty));document.getElementById('automodAction')?.addEventListener('change',markDashboardDirty);};`;
  text = text.slice(0, start) + replacement + text.slice(end);
}

await writeFile(path, text);
console.log('Dashboard patches applied');
