import fs from 'node:fs';
const path='server.js';
const marker='/* ADVANCED_DASHBOARD_CONTROLS */';
const script=fs.readFileSync('advanced-dashboard.js','utf8').trim();
let src=fs.readFileSync(path,'utf8');
if(!src.includes(marker)){
  const injection=`${marker}\n${script}\n`;
  const needle='</script></body></html>`;
  if(!src.includes(needle)) throw new Error('Could not locate dashboard script footer in server.js');
  src=src.replace(needle,`${injection}</script></body></html>`);
  fs.writeFileSync(path,src,'utf8');
  console.log('[patch-server] Advanced dashboard controls applied');
}else console.log('[patch-server] Advanced dashboard controls already applied');
