import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('./server.js', import.meta.url);
let source = await readFile(path, 'utf8');
let changed = false;
const botApiUrl = 'https://server-1-05si.onrender.com';
const inviteUrl = 'https://discord.com/oauth2/authorize?client_id=1530577031753105409&permissions=8&integration_type=0&scope=bot';

if (!source.includes("const BOT_INVITE_URL =")) {
  const marker = "const COMMAND_HUB_API_URL = (process.env.COMMAND_HUB_API_URL || 'https://server-1-05si.onrender.com').replace(/\\/$/, '');";
  if (!source.includes(marker)) throw new Error('Could not locate bot API configuration in server.js');
  source = source.replace(marker, `${marker}\nconst BOT_INVITE_URL = '${inviteUrl}';`);
  changed = true;
}

const oldCards = 'const cards=s.guilds.map(g=>`<div class="card"><div class="bolt">⚡</div><h2>${esc(g.name)}</h2><p class="muted">${esc(g.id)}</p><a class="btn" href="/dashboard/${g.id}">Open Dashboard</a></div>`).join(\'\');';
const newCards = `const cards=(await Promise.all(s.guilds.map(async g=>{\n        let present=false;\n        try {\n          const r=await fetch(\`${botApiUrl}/dashboard/bot-status/\${g.id}\`);\n          if(r.ok){const d=await r.json();present=d.present===true;}\n        } catch {}\n        return present\n          ? \`<div class="card"><div class="bolt">⚡</div><h2>\${esc(g.name)}</h2><p class="muted">\${esc(g.id)}</p><div class="status" style="color:#75e89b;margin:10px 0;font-weight:800">● Bot is installed</div><a class="btn" href="/dashboard/\${g.id}">Open Dashboard</a></div>\`\n          : \`<div class="card"><div class="bolt">⚡</div><h2>\${esc(g.name)}</h2><p class="muted">\${esc(g.id)}</p><div class="status" style="color:#f0b84b;margin:10px 0;font-weight:800">● Bot is not installed</div><a class="btn" href="${inviteUrl}">Add Bot</a></div>\`;\n      }))).join('');`;
if (source.includes(oldCards)) {
  source = source.replace(oldCards, newCards);
  changed = true;
}

// Replace the duplicate/shadowing save functions with one draft-only save.
const draftSave = `function save(body){
  mergeDashboard(dashboardDraft, body);
  if(body && body.autoResponders) responders = body.autoResponders;
  cfg = {...cfg, ...dashboardDraft};
  renderResponders();
  markDashboardDirty();
  toast('Successfully changed — click Save changes to apply');
}`;
const firstSave = /(?:async )?function save\(body\)\{[\s\S]*?\}\nfunction saveGeneral\(\)/;
if (firstSave.test(source)) {
  source = source.replace(firstSave, `${draftSave}\nfunction saveGeneral()`);
  changed = true;
}
const duplicateSave = /function save\(body\)\{\n  mergeDashboard\(dashboardDraft, body\);[\s\S]*?toast\('Changes are waiting to be saved'\);\n\}/;
if (duplicateSave.test(source)) {
  source = source.replace(duplicateSave, draftSave);
  changed = true;
}

if (source.includes('function markDashboardDirty(){ dashboardDirty = true; }')) {
  source = source.replace('function markDashboardDirty(){ dashboardDirty = true; }', 'function markDashboardDirty(){ dashboardDirty = true; renderDashboardSaveBar(); }');
  changed = true;
}

source = source.replace("function toggle(id){document.getElementById(id).classList.toggle('on')}", "function toggle(id){document.getElementById(id).classList.toggle('on');markDashboardDirty()}");
source = source.replace('sent to the live Command-Hub bot', 'sent to the live Server-1 bot');
source = source.replaceAll('Saved to Command-Hub', 'Saved to Server-1');

if (changed) await writeFile(path, source, 'utf8');
console.log(changed ? '[patch-server] Dashboard fixes applied' : '[patch-server] Dashboard fixes already present');
