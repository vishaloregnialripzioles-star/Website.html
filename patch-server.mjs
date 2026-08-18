import fs from 'node:fs';
const path='server.js';
const rawScript=fs.readFileSync('advanced-dashboard.js','utf8').trim();
const modulesScript=fs.readFileSync('modules-dashboard.js','utf8').trim();
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
const hamburgerCss='<style id="hamburger-menu-fix-v4">.v4-menu{display:none!important}@media(max-width:800px){.v4-menu{display:block!important}}</style>';
if(!src.includes('id="hamburger-menu-fix-v4"')){
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for hamburger fix');
  src=src.replace(footer,`${hamburgerCss}${footer}`);
  console.log('[patch-server] Three-line mobile menu fix applied');
}
fs.writeFileSync(path,src,'utf8');
