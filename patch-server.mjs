import fs from 'node:fs';
const path='server.js';
const rawScript=fs.readFileSync('advanced-dashboard.js','utf8').trim();
const modulesScript=fs.readFileSync('modules-dashboard.js','utf8').trim();
const hinglishScript=fs.readFileSync('hinglish-dashboard.js','utf8').trim();
const socialScript=fs.readFileSync('social-dashboard.js','utf8').trim();
let src=fs.readFileSync(path,'utf8');
const footer='</body></html>';
const advancedMarker='ADVANCED_DASHBOARD_CONTROLS_V4';
if(!src.includes(advancedMarker)){
  const encoded=Buffer.from(rawScript,'utf8').toString('base64');
  const injection=`<script>/* ${advancedMarker} */ (new Function(atob('${encoded}')))();</script>`;
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer in server.js');
  src=src.replace(footer,`${injection}${footer}`);
  console.log('[patch-server] Sparxie dashboard V4 applied');
}
const modulesMarker='SPARXIE_MODULES_DASHBOARD_V1';
if(!src.includes(modulesMarker)){
  const encoded=Buffer.from(modulesScript,'utf8').toString('base64');
  const injection=`<script>/* ${modulesMarker} */ (new Function(atob('${encoded}')))();</script>`;
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for module dashboard');
  src=src.replace(footer,`${injection}${footer}`);
  console.log('[patch-server] Server module dashboard applied');
}
const hinglishMarker='SPARXIE_HINGLISH_AUTOMOD_V1';
if(!src.includes(hinglishMarker)){
  const encoded=Buffer.from(hinglishScript,'utf8').toString('base64');
  const injection=`<script>/* ${hinglishMarker} */ (new Function(atob('${encoded}')))();</script>`;
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for Hinglish AutoMod');
  src=src.replace(footer,`${injection}${footer}`);
  console.log('[patch-server] Hinglish cursed words dashboard applied');
}
const socialMarker='SPARXIE_SOCIAL_DASHBOARD_V1';
if(!src.includes(socialMarker)){
  const encoded=Buffer.from(socialScript,'utf8').toString('base64');
  const injection=`<script>/* ${socialMarker} */ (new Function(atob('${encoded}')))();</script>`;
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for social dashboard');
  src=src.replace(footer,`${injection}${footer}`);
  console.log('[patch-server] Social notification + reaction role dashboard applied');
}
const hamburgerCss='<style id="hamburger-menu-fix-v4">.v4-menu{display:none!important}@media(max-width:800px){.v4-menu{display:block!important}}</style>';
if(!src.includes('id="hamburger-menu-fix-v4"')){
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for hamburger fix');
  src=src.replace(footer,`${hamburgerCss}${footer}`);
  console.log('[patch-server] Three-line mobile menu fix applied');
}
const presenceMarker='BOT_PRESENCE_RELIABLE_V2';
if(!src.includes(presenceMarker)){
  const oldPresence='async function botPresent(guildId){try{const r=await fetch(`${BOT_API}/dashboard/bot-status/${guildId}`,{headers:{\'cache-control\':\'no-cache\'}});if(!r.ok)return false;const d=await r.json();return !!d.present}catch{return false}}';
  const newPresence=`/* ${presenceMarker} */ async function botPresent(guildId){for(let attempt=1;attempt<=3;attempt++){try{const r=await fetch(\`${BOT_API}/dashboard/bot-status/\${guildId}\`,{headers:{\'cache-control\':\'no-cache\'},signal:AbortSignal.timeout(8000)});if(r.ok){const d=await r.json();return !!d.present}if(r.status===404)return false}catch{}if(attempt<3)await new Promise(resolve=>setTimeout(resolve,700*attempt))}return null}`;
  if(!src.includes(oldPresence)) throw new Error('Could not locate bot presence function');
  src=src.replace(oldPresence,newPresence);
  const oldServers='function serversPage(guilds){const cards=guilds.map(g=>`<div class="card"><h3>${esc(g.name)}</h3><p class="muted">${esc(g.id)}</p>${g.bot?`<a class="btn" href="/dashboard/${encodeURIComponent(g.id)}">Open Dashboard</a>`:`<a class="btn" href="${ADD_BOT_URL}">Add Bot</a>`}</div>`).join(\'\');return html(\'Select Server\',`<main class="content"><div class="hero"><h2>Select a Server</h2><div class="muted">Servers you manage are shown below. Open Dashboard is available only where Sparxie is installed.</div></div><div class="server-grid">${cards||\'<div class="card">No manageable servers found.</div>\'}</div></main>`)}';
  const newServers=`function serversPage(guilds){const cards=guilds.map(g=>{const action=g.bot===true?\`<a class="btn" href="/dashboard/\${encodeURIComponent(g.id)}">Open Dashboard</a>\`:g.bot===null?\`<a class="btn" href="/dashboard/\${encodeURIComponent(g.id)}">Open Dashboard</a>\`:\`<a class="btn" href="\${ADD_BOT_URL}">Add Bot</a>\`;return \`<div class="card"><h3>\${esc(g.name)}</h3><p class="muted">\${esc(g.id)}</p>\${action}</div>\`}).join('');return html('Select Server',\`<main class="content"><div class="hero"><h2>Select a Server</h2><div class="muted">Servers you manage are shown below. Open Dashboard is available only where Sparxie is installed.</div></div><div class="server-grid">\${cards||'<div class="card">No manageable servers found.</div>'}</div></main>\`)}`;
  if(!src.includes(oldServers)) throw new Error('Could not locate server selection page');
  src=src.replace(oldServers,newServers);
  const oldGate="if(!(await botPresent(gid)))return redirect(res,'/servers');";
  const newGate="const presence=await botPresent(gid);if(presence===false)return redirect(res,'/servers');";
  if(!src.includes(oldGate)) throw new Error('Could not locate dashboard presence gate');
  src=src.replace(oldGate,newGate);
  console.log('[patch-server] Reliable bot presence detection applied');
}
fs.writeFileSync(path,src,'utf8');
