import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const PUBLIC_URL = process.env.PUBLIC_URL || '';

const sessions = new Map();

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function sign(value) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function makeSession(data) {
  const id = crypto.randomUUID();
  sessions.set(id, { ...data, createdAt: Date.now() });
  return `${base64url(id)}.${sign(id)}`;
}

function getSession(req) {
  const raw = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('sparxie_session='));
  if (!raw) return null;
  const token = decodeURIComponent(raw.split('=').slice(1).join('='));
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  let id;
  try { id = Buffer.from(encoded, 'base64url').toString(); } catch { return null; }
  if (!crypto.timingSafeEqual(Buffer.from(sign(id)), Buffer.from(signature))) return null;
  const session = sessions.get(id);
  if (!session || Date.now() - session.createdAt > 7 * 24 * 60 * 60 * 1000) return null;
  return session;
}

function redirect(res, location, cookies = []) {
  res.writeHead(302, { Location: location, 'Set-Cookie': cookies });
  res.end();
}

async function discordToken(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri
  });
  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  if (!response.ok) throw new Error(`Discord token exchange failed: ${response.status}`);
  return response.json();
}

async function discordApi(path, token) {
  const response = await fetch(`https://discord.com/api/v10${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) throw new Error(`Discord API failed: ${response.status}`);
  return response.json();
}

function renderShell(title, content, session = null) {
  const user = session?.user;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
:root{color-scheme:dark;--bg:#0b0d12;--panel:#151821;--panel2:#1d202b;--line:#292e3b;--text:#f5f7ff;--muted:#9ca3b4;--brand:#5865f2;--brand2:#7280ff;--ok:#35d07f}
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 80% 0,#222852 0,#10131d 38%,#080a0f 100%);color:var(--text);min-height:100vh}a{text-decoration:none;color:inherit}.nav{height:72px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:#0d0f16cc;backdrop-filter:blur(16px);position:sticky;top:0;z-index:5}.logo{display:flex;align-items:center;gap:11px;font-weight:800;font-size:20px}.logo-mark{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#5865f2,#8b5cf6);display:grid;place-items:center;box-shadow:0 10px 30px #5865f244}.user{display:flex;gap:10px;align-items:center;color:#fff}.avatar{width:34px;height:34px;border-radius:50%;background:#303645;object-fit:cover}.wrap{max-width:1100px;margin:0 auto;padding:54px 22px}.hero{text-align:center;padding:35px 0 45px}.eyebrow{color:#aeb7ff;font-weight:700;letter-spacing:.08em;text-transform:uppercase;font-size:12px}.hero h1{font-size:clamp(36px,7vw,68px);line-height:1;margin:14px 0}.hero p{max-width:620px;margin:0 auto 28px;color:var(--muted);font-size:17px;line-height:1.65}.btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;border:0;border-radius:13px;padding:13px 20px;font-weight:800;color:#fff;background:linear-gradient(135deg,var(--brand),var(--brand2));box-shadow:0 12px 35px #5865f244;cursor:pointer}.btn.secondary{background:var(--panel2);box-shadow:none;border:1px solid var(--line)}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px}.card{background:#151821e8;border:1px solid var(--line);border-radius:20px;padding:18px;transition:.18s transform,.18s border-color}.card:hover{transform:translateY(-3px);border-color:#5865f288}.server{display:flex;align-items:center;gap:14px}.server-icon{width:58px;height:58px;border-radius:17px;background:#2b3040;display:grid;place-items:center;font-size:22px;font-weight:800;overflow:hidden}.server-icon img{width:100%;height:100%;object-fit:cover}.server h3{margin:0 0 4px;font-size:17px}.server p{margin:0;color:var(--muted);font-size:12px}.card .btn{width:100%;margin-top:18px}.dash{display:grid;grid-template-columns:230px 1fr;gap:20px}.side,.main-card{background:#151821e8;border:1px solid var(--line);border-radius:20px}.side{padding:12px}.side a{display:block;padding:12px;border-radius:11px;color:var(--muted);font-weight:700}.side a.active,.side a:hover{background:#24283a;color:#fff}.main-card{padding:25px}.main-card h2{margin-top:0}.feature{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:13px;margin-top:20px}.feature div{background:#1d202b;border:1px solid var(--line);border-radius:15px;padding:16px}.feature b{display:block;margin-bottom:6px}.feature span{color:var(--muted);font-size:13px}.empty{text-align:center;padding:55px 20px;color:var(--muted);border:1px dashed var(--line);border-radius:18px}.notice{padding:14px 16px;background:#251f14;border:1px solid #6d5628;color:#f6d98a;border-radius:14px;margin-bottom:18px}.small{color:var(--muted);font-size:13px}@media(max-width:700px){.nav{padding:0 16px}.wrap{padding:35px 15px}.dash{grid-template-columns:1fr}.hero h1{font-size:42px}}
</style></head><body>
<nav class="nav"><a class="logo" href="/"><span class="logo-mark">⚡</span>Sparxie Dashboard</a>${user?`<div class="user"><img class="avatar" src="${user.avatar || ''}" onerror="this.style.display='none'"><span>${escapeHtml(user.global_name || user.username)}</span></div>`:''}</nav>
${content}</body></html>`;
}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function absoluteBase(req){ return PUBLIC_URL || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`; }

const server = http.createServer(async (req,res)=>{
  try {
    const url = new URL(req.url, absoluteBase(req));
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

    if (url.pathname === '/login') {
      if (!CLIENT_ID || !CLIENT_SECRET) {
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        return res.end(renderShell('Connect Discord', `<main class="wrap"><div class="notice">Discord OAuth is not configured yet. Add <b>DISCORD_CLIENT_ID</b> and <b>DISCORD_CLIENT_SECRET</b> in Render Environment Variables.</div><div class="hero"><div class="eyebrow">Dashboard ready</div><h1>Connect your Discord</h1><p>The dashboard is deployed and ready. Once OAuth is configured, users can sign in and select a server they manage.</p></div></main>`));
      }
      const redirectUri = `${absoluteBase(req)}/oauth/callback`;
      const auth = new URL('https://discord.com/oauth2/authorize');
      auth.searchParams.set('client_id', CLIENT_ID); auth.searchParams.set('response_type','code'); auth.searchParams.set('redirect_uri',redirectUri); auth.searchParams.set('scope','identify guilds');
      return redirect(res, auth.toString());
    }

    if (url.pathname === '/oauth/callback') {
      if (!CLIENT_ID || !CLIENT_SECRET) return redirect(res,'/');
      const code=url.searchParams.get('code'); if(!code) return redirect(res,'/');
      const redirectUri=`${absoluteBase(req)}/oauth/callback`;
      const token=await discordToken(code,redirectUri);
      const [user,guilds]=await Promise.all([discordApi('/users/@me',token.access_token),discordApi('/users/@me/guilds',token.access_token)]);
      const manageable=guilds.filter(g=>((BigInt(g.permissions||0) & 0x20n)!==0n) || g.owner);
      const session=makeSession({user:{id:user.id,username:user.username,global_name:user.global_name,avatar:user.avatar?`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`:''},guilds:manageable});
      return redirect(res,'/servers',[`sparxie_session=${encodeURIComponent(session)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`]);
    }

    if (url.pathname === '/logout') return redirect(res,'/', ['sparxie_session=; Path=/; HttpOnly; Max-Age=0']);

    if (url.pathname === '/servers') {
      const session=getSession(req); if(!session) return redirect(res,'/');
      const cards=session.guilds.map(g=>`<article class="card"><div class="server"><div class="server-icon">${g.icon?`<img src="https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128">`:'◈'}</div><div><h3>${escapeHtml(g.name)}</h3><p>Server ID: ${g.id}</p></div></div><a class="btn" href="/dashboard/${encodeURIComponent(g.id)}">Open Dashboard</a></article>`).join('');
      const content=`<main class="wrap"><div class="hero" style="padding-top:10px"><div class="eyebrow">Your Discord</div><h1>Select a server</h1><p>Choose a server you manage to open its dashboard. Server-specific settings will live here.</p></div>${cards?`<div class="grid">${cards}</div>`:`<div class="empty">No manageable servers were returned by Discord.</div>`}</main>`;
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(renderShell('Select Server',content,session));
    }

    if (url.pathname.startsWith('/dashboard/')) {
      const session=getSession(req); if(!session) return redirect(res,'/');
      const guildId=decodeURIComponent(url.pathname.split('/')[2]||'');
      const guild=session.guilds.find(g=>g.id===guildId); if(!guild) return redirect(res,'/servers');
      const content=`<main class="wrap"><div class="dash"><aside class="side"><a class="active" href="#overview">Overview</a><a href="#automod">AutoMod</a><a href="#moderation">Moderation</a><a href="#giveaways">Giveaways</a><a href="#logging">Logging</a><a href="#commands">Commands</a></aside><section class="main-card"><div class="server"><div class="server-icon">${guild.icon?`<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128">`:'◈'}</div><div><h2 style="margin:0">${escapeHtml(guild.name)}</h2><p class="small">${guild.id}</p></div></div><hr style="border:0;border-top:1px solid var(--line);margin:22px 0"><h2 id="overview">Dashboard</h2><p class="small">This is the starting dashboard. You can tell me which settings and controls you want added here next.</p><div class="feature"><div id="automod"><b>🛡️ AutoMod</b><span>Manage banned words, spam, links and actions.</span></div><div id="moderation"><b>🔨 Moderation</b><span>Timeouts, warnings, kicks and bans.</span></div><div id="giveaways"><b>🎉 Giveaways</b><span>Create and manage server giveaways.</span></div><div id="logging"><b>📋 Logging</b><span>Configure moderation and server logs.</span></div><div id="commands"><b>⚡ Commands</b><span>Configure command access and categories.</span></div></div><div style="margin-top:22px"><a class="btn secondary" href="/servers">← Change Server</a></div></section></div></main>`;
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); return res.end(renderShell(`${guild.name} Dashboard`,content,session));
    }

    const html=await readFile(new URL('./index.html',import.meta.url),'utf8');
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}); res.end(html);
  } catch (error) {
    console.error(error); res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8'}); res.end('Internal server error');
  }
});
server.listen(PORT,'0.0.0.0',()=>console.log(`Dashboard listening on 0.0.0.0:${PORT}`));
