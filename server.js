import http from 'node:http';
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessions = new Map();

function base(req) {
  return process.env.DISCORD_REDIRECT_URI
    ? process.env.DISCORD_REDIRECT_URI.replace(/\/oauth\/callback$/, '')
    : (process.env.PUBLIC_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`);
}
function redirectUri(req) { return process.env.DISCORD_REDIRECT_URI || `${base(req)}/oauth/callback`; }
function sign(v) { return crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url'); }
function sessionCookie(id) { return `sparxie_session=${encodeURIComponent(`${Buffer.from(id).toString('base64url')}.${sign(id)}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`; }
function getSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sparxie_session='));
  if (!raw) return null;
  const token = decodeURIComponent(raw.slice('sparxie_session='.length));
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const id = Buffer.from(encoded, 'base64url').toString();
  const expected = sign(id);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const s = sessions.get(id);
  return s && Date.now() - s.createdAt < 7 * 24 * 60 * 60 * 1000 ? s : null;
}
function newSession(data) { const id = crypto.randomUUID(); sessions.set(id, { ...data, createdAt: Date.now() }); return id; }
async function api(path, token) {
  const r = await fetch(`https://discord.com/api/v10${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`Discord API ${r.status}: ${await r.text()}`);
  return r.json();
}
function esc(v='') { return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function page(title, body) { return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{margin:0;background:#0b0d12;color:#f5f7ff;font:16px system-ui;text-align:center}main{max-width:900px;margin:auto;padding:60px 20px}.btn{display:inline-block;padding:13px 20px;background:#5865f2;color:white;text-decoration:none;border-radius:12px;font-weight:800}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;margin-top:25px}.card{background:#171a22;border:1px solid #292e3b;border-radius:18px;padding:20px;text-align:left}.muted{color:#9ca3b4}.icon{width:55px;height:55px;border-radius:15px;background:#5865f2;display:grid;place-items:center;margin-bottom:12px;font-size:24px}</style></head><body>${body}</body></html>`; }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, base(req));
    if (url.pathname === '/login') {
      if (!CLIENT_ID || !CLIENT_SECRET) return res.end(page('Setup', '<main><h1>Discord OAuth setup required</h1><p class="muted">Add DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in Render.</p></main>'));
      const u = new URL('https://discord.com/oauth2/authorize');
      u.searchParams.set('client_id', CLIENT_ID); u.searchParams.set('response_type','code'); u.searchParams.set('redirect_uri', redirectUri(req)); u.searchParams.set('scope','identify guilds');
      res.writeHead(302,{Location:u.toString()}); return res.end();
    }
    if (url.pathname === '/oauth/callback') {
      const code = url.searchParams.get('code'); if (!code) { res.writeHead(400); return res.end('Missing OAuth code'); }
      const body = new URLSearchParams({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:redirectUri(req)});
      const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
      if (!tokenRes.ok) { res.writeHead(502); return res.end(`Discord OAuth failed: ${await tokenRes.text()}`); }
      const token = await tokenRes.json();
      const [user,guilds] = await Promise.all([api('/users/@me',token.access_token),api('/users/@me/guilds',token.access_token)]);
      const manageable = guilds.filter(g => g.owner || ((BigInt(g.permissions || 0) & 0x20n) !== 0n));
      const id = newSession({ user, guilds: manageable });
      res.writeHead(302,{Location:'/servers','Set-Cookie':sessionCookie(id)}); return res.end();
    }
    if (url.pathname === '/logout') { res.writeHead(302,{Location:'/', 'Set-Cookie':'sparxie_session=; Path=/; Max-Age=0'}); return res.end(); }
    if (url.pathname === '/servers') {
      const s=getSession(req); if(!s){res.writeHead(302,{Location:'/'});return res.end();}
      const cards=s.guilds.map(g=>`<div class="card"><div class="icon">${g.icon?'🛡️':'⚡'}</div><h2>${esc(g.name)}</h2><p class="muted">${g.id}</p><a class="btn" href="/dashboard/${g.id}">Open Dashboard</a></div>`).join('');
      res.setHeader('Content-Type','text/html'); return res.end(page('Select Server',`<main><h1>Select a server</h1><p class="muted">Choose a server you manage.</p><div class="grid">${cards || '<p class="muted">No manageable servers found.</p>'}</div></main>`));
    }
    if (url.pathname.startsWith('/dashboard/')) {
      const s=getSession(req); if(!s){res.writeHead(302,{Location:'/'});return res.end();}
      const id=url.pathname.split('/')[2]; const g=s.guilds.find(x=>x.id===id); if(!g){res.writeHead(302,{Location:'/servers'});return res.end();}
      res.setHeader('Content-Type','text/html'); return res.end(page(`${g.name} Dashboard`,`<main><h1>⚡ ${esc(g.name)}</h1><p class="muted">Server-specific dashboard is ready. Prefix, AutoMod, moderation, giveaways and logging can be added here.</p><a class="btn" href="/servers">Change Server</a></main>`));
    }
    const html=await readFile(new URL('./index.html',import.meta.url),'utf8'); res.setHeader('Content-Type','text/html'); res.end(html);
  } catch(e) { console.error(e); res.writeHead(500); res.end('Internal server error'); }
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Dashboard listening on 0.0.0.0:${PORT}`));
