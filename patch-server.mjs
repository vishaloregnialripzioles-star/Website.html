import fs from 'node:fs';
const path='server.js';
const marker='ADVANCED_DASHBOARD_CONTROLS_V2';
const script=fs.readFileSync('advanced-dashboard.js','utf8').trim();
let src=fs.readFileSync(path,'utf8');
if(!src.includes(marker)){
  const encoded=Buffer.from(script,'utf8').toString('base64');
  const injection=`<script>/* ${marker} */ (new Function(atob('${encoded}')))();</script>`;
  const needle='</body></html>';
  if(!src.includes(needle)) throw new Error('Could not locate HTML footer in server.js');
  src=src.replace(needle,`${injection}</body></html>`);
  console.log('[patch-server] Advanced dashboard controls V2 applied');
}else{
  console.log('[patch-server] Advanced dashboard controls V2 already applied');
}

// Always force the dashboard menu control to render as a real three-line hamburger.
// This intentionally hides any text/icon glyph (including an "A") and draws three CSS bars.
const hamburgerCss='<style id="hamburger-menu-fix">.v3-menu{font-size:0!important;display:flex!important;align-items:center!important;justify-content:center!important}.v3-menu:before{content:"";display:block;width:24px;height:3px;border-radius:3px;background:#fff;box-shadow:0 7px 0 #fff,0 14px 0 #fff}</style>';
if(!src.includes('id="hamburger-menu-fix"')){
  const footer='</body></html>';
  if(!src.includes(footer)) throw new Error('Could not locate HTML footer for hamburger fix');
  src=src.replace(footer,`${hamburgerCss}${footer}`);
  fs.writeFileSync(path,src,'utf8');
  console.log('[patch-server] Three-line hamburger menu fix applied');
}
