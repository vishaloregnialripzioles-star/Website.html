(()=>{
  if(!location.pathname.startsWith('/dashboard/')) return;
  const m=location.pathname.match(/\/dashboard\/(\d+)/); if(!m) return;
  const gid=m[1], marker='hinglish-cursed-words-card-v1';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const actions=[['delete','Delete'],['warn','Warn'],['timeout','Timeout'],['delete_timeout','Delete + Timeout'],['dm_warn','DM + Warn']];
  const call=async(method,body)=>{const r=await fetch('/dashboard/api/'+gid+'/config',{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const t=await r.text();let d={};try{d=JSON.parse(t)}catch{}if(!r.ok)throw new Error(d.error||t||('HTTP '+r.status));return d};
  const add=()=>{
    const content=document.querySelector('#v4-content'); if(!content||content.querySelector('#'+marker)) return;
    const headings=[...content.querySelectorAll('.v4-heading h2')]; if(!headings.some(x=>x.textContent?.trim()==='Advanced AutoMod')) return;
    const card=document.createElement('section'); card.id=marker; card.className='v4-card';
    card.innerHTML=`<h3 style="margin:0 0 5px">Hinglish Cursed Words</h3><div class="v4-note" style="margin-bottom:10px">Add up to 1000 Hinglish cursed words. Matching ignores common punctuation/leet substitutions such as g@y, g?y and g&y. Detected messages are deleted and punished using the condition below.</div><label class="v4-field">Words / phrases, one per line<textarea id="hcw-words" class="v4-text" maxlength="20000" placeholder="one word or phrase per line"></textarea></label><label class="v4-field">Condition / punishment<select id="hcw-action" class="v4-select">${actions.map(a=>`<option value="${a[0]}">${a[1]}</option>`).join('')}</select></label><div class="v4-note" id="hcw-count">0 / 1000 words</div><div class="v4-actions-row"><button class="v4-btn" id="hcw-save">Save Hinglish Cursed Words</button></div>`;
    content.appendChild(card);
    const wordsEl=card.querySelector('#hcw-words'), countEl=card.querySelector('#hcw-count');
    const updateCount=()=>{const n=wordsEl.value.split(/\n|,/).map(x=>x.trim()).filter(Boolean).slice(0,1000).length;countEl.textContent=`${n} / 1000 words`};
    wordsEl.addEventListener('input',updateCount);
    call('GET').then(d=>{const a=d.config?.automod||{};wordsEl.value=(a.hinglishCursedWords||[]).join('\n');card.querySelector('#hcw-action').value=a.hinglishCursedWordsRule?.action||a.action||'delete_timeout';updateCount()}).catch(()=>{});
    card.querySelector('#hcw-save').onclick=async()=>{try{const words=[...new Set(wordsEl.value.split(/\n|,/).map(x=>x.trim().toLocaleLowerCase()).filter(Boolean))].slice(0,1000);const action=card.querySelector('#hcw-action').value;const d=await call('GET');const a=d.config?.automod||{};a.hinglishCursedWords=words;a.hinglishCursedWordsRule={...(a.hinglishCursedWordsRule||{}),enabled:true,windowSeconds:a.hinglishCursedWordsRule?.windowSeconds||5,maxCount:a.hinglishCursedWordsRule?.maxCount||1,action};await call('PUT',{automod:a});countEl.textContent=`${words.length} / 1000 words`;const b=document.createElement('div');b.className='v4-note';b.textContent='Saved successfully.';card.appendChild(b);setTimeout(()=>b.remove(),1800)}catch(e){alert(e.message)}};
  };
  new MutationObserver(add).observe(document.body,{subtree:true,childList:true}); add();
})();
