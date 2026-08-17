import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('./server.js', import.meta.url);
let source = await readFile(path, 'utf8');
let changed = false;
const botApiUrl = 'https://server-1-05si.onrender.com';
const inviteUrl = 'https://discord.com/oauth2/authorize?client_id=1530577031753105409&permissions=8&integration_type=0&scope=bot';

// Keep the existing server-selection flow, but make the Bot installed/Add Bot
// decision against the real Server-1 bot.
const oldCards = 'const cards=s.guilds.map(g=>`<div class="card"><div class="bolt">⚡</div><h2>${esc(g.name)}</h2><p class="muted">${esc(g.id)}</p><a class="btn" href="/dashboard/${g.id}">Open Dashboard</a></div>`).join(\'\');';
const newCards = `const cards=(await Promise.all(s.guilds.map(async g=>{
        let present=false;
        try {
          const r=await fetch(\`${botApiUrl}/dashboard/bot-status/\${g.id}\`,{cache:'no-store'});
          if(r.ok){const d=await r.json();present=d.present===true;}
        } catch {}
        return present
          ? \`<div class="card"><div class="bolt">⚡</div><h2>\${esc(g.name)}</h2><p class="muted">\${esc(g.id)}</p><div class="status" style="color:#75e89b;margin:10px 0;font-weight:800">● Bot is installed</div><a class="btn" href="/dashboard/\${g.id}">Open Dashboard</a></div>\`
          : \`<div class="card"><div class="bolt">⚡</div><h2>\${esc(g.name)}</h2><p class="muted">\${esc(g.id)}</p><div class="status" style="color:#f0b84b;margin:10px 0;font-weight:800">● Bot is not installed</div><a class="btn" href="${inviteUrl}">Add Bot</a></div>\`;
      }))).join('');`;
if (source.includes(oldCards)) {
  source = source.replace(oldCards, newCards);
  changed = true;
}

// The original dashboard contains an old save() implementation. Replace every
// save(body) declaration with one draft-only implementation so there is no
// shadowing/override ambiguity.
const draftSave = `function save(body){
  mergeDashboard(dashboardDraft, body);
  if(body && body.autoResponders) responders = body.autoResponders;
  cfg = {...cfg, ...dashboardDraft};
  renderResponders();
  markDashboardDirty();
  toast('Successfully changed — click Save changes to apply');
}`;
const saveRegex = /(?:async )?function save\(body\)\{[\s\S]*?\n\}/g;
if (saveRegex.test(source)) {
  source = source.replace(saveRegex, draftSave);
  changed = true;
}

source = source.replace(
  'function markDashboardDirty(){ dashboardDirty = true; }',
  'function markDashboardDirty(){ dashboardDirty = true; renderDashboardSaveBar(); }',
);
source = source.replace(
  "function toggle(id){document.getElementById(id).classList.toggle('on')}",
  "function toggle(id){const e=document.getElementById(id);if(e)e.classList.toggle('on');markDashboardDirty()}",
);
source = source.replace('sent to the live Command-Hub bot', 'sent to the live Server-1 bot');
source = source.replaceAll('Saved to Command-Hub', 'Saved to Server-1');

// Replace the final dashboard commit function with a defensive implementation
// that reports the real API error instead of silently failing.
const saveChangesRegex = /async function saveDashboardChanges\(\)\{[\s\S]*?\n\}\nfunction resetDashboardChanges/;
const saveChanges = `async function saveDashboardChanges(){
  const button=document.getElementById('dashboard-save');
  if(button) { button.disabled=true; button.textContent='Saving…'; }
  try {
    const body=dashboardSnapshotFromDom();
    const r=await fetch('/dashboard/api/'+id+'/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const text=await r.text();
    let d={};
    try { d=JSON.parse(text||'{}'); } catch {}
    if(!r.ok) throw new Error(d.error||('Save failed (HTTP '+r.status+')'));
    cfg=d.config||cfg;
    responders=d.autoResponders||responders;
    dashboardSaved=cloneDashboard(body);
    dashboardDraft={};
    dashboardDirty=false;
    renderDashboardSaveBar();
    toast('Successfully saved to this server');
  } catch(err) {
    toast(err instanceof Error ? err.message : 'Save failed');
    console.error('[Dashboard save]',err);
  } finally {
    const b=document.getElementById('dashboard-save');
    if(b) { b.disabled=false; b.textContent='Save changes'; }
  }
}
function resetDashboardChanges`;
if (saveChangesRegex.test(source)) {
  source = source.replace(saveChangesRegex, saveChanges);
  changed = true;
}

// Remove the obsolete AI module and its JS references from the generated page.
const aiNav = /<a href="#ai">[^<]*AI Moderation<\/a>/g;
if (aiNav.test(source)) {
  source = source.replace(aiNav, '');
  changed = true;
}
const aiSection = /\n<section id="ai"[\s\S]*?<section id="logging"/;
if (aiSection.test(source)) {
  source = source.replace(aiSection, '\n<section id="logging"');
  changed = true;
}
source = source.replace(/const ai=cfg\.ai\|\|\{\};setSwitch\('aiEnabled',[\s\S]*?document\.getElementById\('aiChannel'\)\.value=ai\.channelId\|\|'';/, '');
source = source.replace(/function saveAi\(\)\{[\s\S]*?\n\}/, '');
source = source.replace(/const ai=\{enabled:on\('aiEnabled'[\s\S]*?return \{prefix:/, 'return {prefix:');
source = source.replace(/const ai=s\.ai\|\|\{\};setSwitch\('aiEnabled'[\s\S]*?document\.getElementById\('aiChannel'\)\.value=ai\.channelId\|\|'';\n/, '');
source = source.replace("dashboardSaved=cloneDashboard(dashboardSnapshotFromDom());", "dashboardSaved=cloneDashboard(dashboardSnapshotFromDom());");

// Earlier automated patches accidentally left escaped template-literal delimiters
// in server.js. Normalize those before Node parses the generated server.
const normalized = source.replaceAll('\\`', '`');
if (normalized !== source) {
  source = normalized;
  changed = true;
}

if (changed) await writeFile(path, source, 'utf8');
console.log(changed ? '[patch-server] Dashboard fixes applied' : '[patch-server] Dashboard fixes already present');
