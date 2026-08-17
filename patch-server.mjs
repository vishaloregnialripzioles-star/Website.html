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
  fs.writeFileSync(path,src,'utf8');
  console.log('[patch-server] Advanced dashboard controls V2 applied');
}else console.log('[patch-server] Advanced dashboard controls V2 already applied');
