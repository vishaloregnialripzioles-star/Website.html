import { readFile, writeFile } from 'node:fs/promises';

const path = new URL('./server.js', import.meta.url);
const text = await readFile(path, 'utf8');
if (text.includes('BOT_PRESENCE_SELECTOR_PATCH')) process.exit(0);

const start = text.indexOf("if(url.pathname==='/servers'){");
const end = text.indexOf('    const dm=', start);
if (start < 0 || end < 0) throw new Error('Could not locate /servers route in server.js');

const replacement = `if(url.pathname==='/servers'){
      const s=getSession(req);if(!s){res.writeHead(302,{Location:'/'});return res.end()}
      // BOT_PRESENCE_SELECTOR_PATCH
      const cards=(await Promise.all(s.guilds.map(async g=>{
        let present=false;
        try{
          const r=await fetch(\`${COMMAND_HUB_API_URL}/dashboard/bot-status/\${g.id}\`,{headers:{Origin:PUBLIC_URL},cache:'no-store'});
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

await writeFile(path, text.slice(0, start) + replacement + text.slice(end));
console.log('Server selector bot-presence patch applied');
