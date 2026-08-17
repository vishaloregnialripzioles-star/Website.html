import fs from 'node:fs';
const path='server.js';
const marker='ADVANCED_DASHBOARD_CONTROLS_V2';
const rawScript=fs.readFileSync('advanced-dashboard.js','utf8').trim();
const loggingScript=fs.readFileSync('logging-dashboard.js','utf8').trim();
const cleanScript=rawScript.replace("const cats=[['general','⚙️ General Settings'],['commands','▣ Commands'],['messages','💬 Messages'],['rewards','🏆 Level & Invite Roles'],['automod','🛡️ Advanced AutoMod'],['moderation','🛡️ Moderation'],['giveaway','🎁 Giveaways'],['templates','📝 Message Templates'],['logging','📋 Logging']];","const cats=[['general','General Settings'],['commands','Commands'],['messages','Messages'],['rewards','Level & Invite Roles'],['automod','Advanced AutoMod'],['moderation','Moderation'],['giveaway','Giveaways'],['templates','Message Templates'],['logging','Logging']];");
let src=fs.readFileSync(path,'utf8');
const footer='</body></html>';
if(!src.includes(marker)){
  const encoded=Buffer.from(cleanScript,'utf8').toString('base64');
  const injection=`<script>/* ${marker} */ (new Function(atob('${encoded}')))();</script>`;
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer in server.js');
  src=src.replace(footer,`${injection}${footer}`);
  console.log('[patch-server] Advanced dashboard controls V2 applied');
}
const logMarker='LOGGING_DASHBOARD_V4';
if(!src.includes(logMarker)){
  const encoded=Buffer.from(`/* ${logMarker} */\n${loggingScript}`,'utf8').toString('base64');
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for logging dashboard');
  src=src.replace(footer,`<script>(new Function(atob('${encoded}')))();</script>${footer}`);
  console.log('[patch-server] Logging dashboard V4 applied');
}
const hamburgerCss='<style id="hamburger-menu-fix">.v3-menu{font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important}.v3-menu:before{content:"";display:block;width:24px;height:3px;border-radius:3px;background:#fff;box-shadow:0 7px 0 #fff,0 14px 0 #fff}</style>';
if(!src.includes('id="hamburger-menu-fix"')){
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for hamburger fix');
  src=src.replace(footer,`${hamburgerCss}${footer}`);
  console.log('[patch-server] Three-line hamburger menu fix applied');
}
fs.writeFileSync(path,src,'utf8');
