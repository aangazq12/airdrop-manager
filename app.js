/* Airdrop Manager V32 — app.js
   Final build:
   - Vertical Card Panel (Topologi 1)
   - Badge pill bottom-left, actions bottom-right
   - Note preview 2 lines, autosave (debounced)
   - Footer handling for keyboard (visualViewport + fallback)
   - Event delegation, safe import/export, donate modal + copy, toast
*/
document.addEventListener('DOMContentLoaded', () => {
  const STORAGE = 'airdrop_v32';
  const COLORS = {"Airdrop":"#06b6d4","Faucet":"#60a5fa","Social Task":"#f97316","Testnet":"#8b5cf6","Daily Task":"#10b981","Retro":"#f59e0b","Node":"#64748b","IDO":"#ef4444","Staking":"#84cc16","GameFi":"#7c3aed","NFT":"#db2777"};
  const ICONS = {"Airdrop":"📦","Faucet":"🚰","Social Task":"🗣️","Testnet":"🧪","Daily Task":"📅","Retro":"🕰️","Node":"🖥️","IDO":"🚀","Staking":"🔒","GameFi":"🎮","NFT":"🖼️"};
  const CATS = Object.keys(COLORS);

  // Elements
  const $ = id => document.getElementById(id);
  const listEl = $('list'), gridEl = $('grid'), totalEl = $('total'), doneEl = $('done');
  const filterCat = $('filterCat'), filterStat = $('filterStat');
  const nameInp = $('nameInp'), linkInp = $('linkInp'), typeInp = $('typeInp');
  const addBtn = $('addBtn'), downloadBtn = $('downloadBtn'), uploadTrigger = $('uploadTrigger'), fileInput = $('fileInput');
  const donateBtn = $('donateBtn'), donateBackdrop = $('donateBackdrop'), donateAddr = $('donateAddr'), donateCopy = $('donateCopy'), donateClose = $('donateClose');
  const sheetBackdrop = $('sheetBackdrop'), sheetArea = $('sheetArea'), sheetSave = $('sheetSave'), sheetClose = $('sheetClose'), sheetTitle = $('sheetTitle');
  const confirmBackdrop = $('confirmBackdrop'), confirmTitle = $('confirmTitle'), confirmMsg = $('confirmMsg'), confirmYes = $('confirmYes'), confirmNo = $('confirmNo');
  const toastEl = $('toast'), themeBtn = $('themeBtn'), clockTime = $('clockTime'), clockDate = $('clockDate');

  function safeGet(k){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch(e){ console.warn(e); return null; } }
  function safeSet(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); } catch(e){ console.warn(e); } }
  function showToast(msg, type='info', ms=1800){ toastEl.textContent = msg; toastEl.className = 'toast '+type; toastEl.style.display='block'; setTimeout(()=> toastEl.style.display='none', ms); }
  function now(){ return Date.now(); }
  function fmtDate(ts){ const d = new Date(ts); return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`; }

  // Load & migrate
  let DB = [];
  function loadAndMerge(){
    const main = Array.isArray(safeGet(STORAGE)) ? safeGet(STORAGE) : [];
    DB = Array.isArray(main) ? main : [];
    DB = DB.map(it => {
      if(typeof it.note === 'undefined') it.note = '';
      if(!it.createdAt) it.createdAt = it.id || now();
      if(!it.updatedAt) it.updatedAt = it.createdAt;
      return it;
    });
    safeSet(STORAGE, DB);
  }
  loadAndMerge();

  // init UI selects
  CATS.forEach(c => {
    typeInp.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
    filterCat.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`);
  });
  filterCat.onchange = render;
  filterStat.onchange = render;

  // clock
  function tick(){
    const d = new Date();
    clockTime.textContent = ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    clockDate.textContent = d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
  }
  tick(); setInterval(tick,1000);

  // render (batch, innerHTML)
  function render(){
    totalEl.textContent = DB.length;
    doneEl.textContent = DB.filter(i=>i.done).length;

    // grid (original: only show types with count>0)
    gridEl.innerHTML = '';
    let any=false;
    CATS.forEach(type => {
      const c = DB.filter(x=>x.type===type && !x.done).length;
      if(c>0){
        any=true;
        gridEl.insertAdjacentHTML('beforeend', `<div class="grid-item">${ICONS[type]||''} ${type} <span style="margin-left:8px;color:var(--muted)">${c}</span></div>`);
      }
    });
    if(!any) gridEl.textContent = 'Tidak ada tugas aktif';

    // list
    const fc = filterCat.value;
    const fs = filterStat.value;

    var filtered = DB.filter(function(i) {
      var catMatch = fc === 'All' || i.type === fc;
      var statMatch = fs === 'All' || (fs === 'Done' ? i.done : !i.done);
      return catMatch && statMatch;
    });

    if(filtered.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--muted);">Belum ada data</div>';
      return;
    }

    filtered.sort(function(a,b) { return (b.fav?1:0) - (a.fav?1:0) || b.id - a.id; });

    const html = filtered.map(function(item){
      const color = COLORS[item.type] || '#999';
      const notePreview = item.note && item.note.trim() ? `<div class="note-preview" data-id="${item.id}">${escapeHtml(item.note)}</div>` : '';
      const badgeHtml = `<div class="badge" style="background:${color}">${ICONS[item.type] ? ICONS[item.type] + ' ' : ''}<span>${escapeHtml(item.type)}</span></div>`;
      return `
        <div class="card" data-id="${item.id}">
          <div class="card-top">
            <div class="star ${item.fav ? 'active' : ''}" data-action="fav" data-id="${item.id}">★</div>
            <button class="check ${item.done ? 'done' : ''}" data-action="done" data-id="${item.id}" aria-pressed="${item.done ? 'true' : 'false'}">
              ${item.done ? '✔' : ''}
            </button>

            <div class="card-info">
              <div class="title-line">
                <div class="title-text" title="${escapeAttr(item.name)}">${escapeHtml(item.name)}</div>
                <div class="card-date">${fmtDate(item.id)}</div>
              </div>

              ${ notePreview }
            </div>
          </div>

          <div class="divider"></div>

          <div class="card-bottom">
            <div class="left-badge">
              ${badgeHtml}
            </div>

            <div class="actions">
              ${ item.link ? `<button class="btn btn-link" data-action="open-link" data-link="${escapeAttr(item.link)}">LINK</button>` : '' }
              <button class="btn btn-note" data-action="note" data-id="${item.id}">📝 Catatan</button>
              <button class="btn btn-del" data-action="del" data-id="${item.id}">Hapus</button>
            </div>
          </div>
        </div>`;
    }).join('');
    listEl.innerHTML = html;
  }

  // escape helpers
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function escapeAttr(s){ return String(s||'').replace(/"/g,'&quot;'); }

  // Attach event delegation on list (robust)
  listEl.addEventListener('click', (e) => {
    let btn = e.target.closest('[data-action]');
    if(!btn) { const ck = e.target.closest('.check'); if(ck) btn = ck; }
    if(!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    if(action === 'fav'){ toggleFav(id); }
    else if(action === 'done'){ toggleDone(id); }
    else if(action === 'del'){ confirmDelete(id); }
    else if(action === 'note'){ openSheet(id); }
    else if(action === 'open-link'){ const l = btn.getAttribute('data-link'); openLink(l); }
  });

  // accessibility: allow Enter/Space to toggle check when focused
  listEl.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' || e.key === ' ') {
      const el = e.target;
      if(el && el.classList && el.classList.contains('check')) {
        e.preventDefault();
        const id = el.getAttribute('data-id');
        toggleDone(id);
      }
    }
  });

  // toggle functions
  function toggleFav(id){ const it = DB.find(x=>String(x.id)===String(id)); if(!it) return; it.fav=!it.fav; it.updatedAt = now(); safeSet(STORAGE,DB); render(); }
  function toggleDone(id){ const it = DB.find(x=>String(x.id)===String(id)); if(!it) return; it.done=!it.done; it.updatedAt = now(); safeSet(STORAGE,DB); render(); }

  // open link
  function openLink(l){ try{ window.open(/^https?:\/\//i.test(l)?l:'https://'+l, '_blank', 'noopener'); }catch(e){ showToast('Gagal buka link','error'); } }

  // add
  addBtn.addEventListener('click', ()=> {
    const name = (nameInp.value||'').trim();
    const link = (linkInp.value||'').trim();
    const type = typeInp.value || CATS[0];
    if(!name){ showToast('Nama task wajib','error'); nameInp.focus(); return; }
    const item = { id: now(), name, link, type, done:false, fav:false, note:'', createdAt: now(), updatedAt: now() };
    DB.unshift(item); safeSet(STORAGE,DB); nameInp.value=''; linkInp.value=''; render(); showToast('Item ditambahkan','success');
  });

  // confirm delete wrapper
  function confirmDelete(id){
    showConfirm('Hapus item','Yakin ingin menghapus item ini?', async (ok)=>{
      if(ok){ DB = DB.filter(x=>String(x.id)!==String(id)); safeSet(STORAGE,DB); render(); showToast('Item dihapus','success'); }
    });
  }

  // simple confirm (modal)
  function showConfirm(title,msg,cb){
    $('confirmBackdrop').style.display = 'flex';
    $('confirmTitle').textContent = title; $('confirmMsg').textContent = msg;
    function clean(){ $('confirmBackdrop').style.display='none'; $('confirmYes').onclick = null; $('confirmNo').onclick = null; }
    $('confirmYes').onclick = ()=> { clean(); cb(true); };
    $('confirmNo').onclick = ()=> { clean(); cb(false); };
  }

  // sheet: open / save note
  let editingId = null;
  function openSheet(id){
    editingId = id;
    const it = DB.find(x=>String(x.id)===String(id));
    if(it) {
      document.getElementById('sheetArea').value = it.note || "";
      document.getElementById('sheetTitle').textContent = it.name || 'Catatan';
      document.getElementById('sheetBackdrop').style.display = 'flex';
      document.getElementById('sheetBackdrop').setAttribute('aria-hidden','false');
      document.getElementById('sheetArea').focus();
    }
  }
  function closeSheet(){ document.getElementById('sheetBackdrop').style.display = 'none'; document.getElementById('sheetBackdrop').setAttribute('aria-hidden','true'); editingId=null; }

  // sheet save button
  $('sheetSave').addEventListener('click', ()=> {
    if(editingId){
      const item = DB.find(x=>String(x.id)===String(editingId));
      if(item){ item.note = document.getElementById('sheetArea').value; item.updatedAt = now(); safeSet(STORAGE,DB); render(); showToast('Catatan disimpan','success'); }
    }
    closeSheet();
  });
  $('sheetCancel').addEventListener('click', ()=> closeSheet());
  sheetBackdrop.addEventListener('click', (e)=> { if(e.target === sheetBackdrop) closeSheet(); });
  sheetClose.addEventListener('click', ()=> closeSheet());

  // donate modal
  const WALLET = '0xa03e18c900c1f4234cdd3a58f2d8c1d3848c999f';
  $('donateBtn').addEventListener('click', async ()=> {
    donateAddr.textContent = WALLET;
    donateBackdrop.style.display = 'flex';
    donateBackdrop.setAttribute('aria-hidden','false');
    try{ await navigator.clipboard.writeText(WALLET); showToast('Alamat wallet disalin','success'); }catch(e){ showToast('Tekan Copy untuk menyalin','info'); }
  });
  donateClose.addEventListener('click', ()=> { donateBackdrop.style.display='none'; donateBackdrop.setAttribute('aria-hidden','true'); });
  donateCopy.addEventListener('click', async ()=> { try{ await navigator.clipboard.writeText(WALLET); showToast('Alamat disalin','success'); }catch(e){ showToast('Gagal salin','error'); } });
  donateBackdrop.addEventListener('click', (e)=> { if(e.target === donateBackdrop){ donateBackdrop.style.display='none'; donateBackdrop.setAttribute('aria-hidden','true'); } });

  // download/export
  downloadBtn.addEventListener('click', ()=> {
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'airdrops_'+(new Date().toISOString().slice(0,10))+'.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // upload/import (merge or replace)
  uploadTrigger.addEventListener('click', ()=> fileInput.click());
  fileInput.addEventListener('change', (ev)=>{
    const f = ev.target.files && ev.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      try{
        const parsed = JSON.parse(e.target.result);
        if(!Array.isArray(parsed)) throw 'Format tidak valid';
        showConfirm('Import JSON','OK = MERGE, Batal = REPLACE', (ok)=>{
          if(ok){
            const map = new Map(DB.map(i=>[String(i.id), i]));
            parsed.forEach(p => { if(p && p.id) map.set(String(p.id), p); });
            DB = Array.from(map.values()).sort((a,b)=>b.id - a.id);
            safeSet(STORAGE,DB); render(); showToast('Import MERGE berhasil','success');
          } else {
            DB = parsed.map(x=> { if(typeof x.note==='undefined') x.note=''; if(!x.createdAt) x.createdAt = x.id || now(); if(!x.updatedAt) x.updatedAt = x.createdAt; return x; });
            safeSet(STORAGE,DB); render(); showToast('Import REPLACE berhasil','success');
          }
        });
      }catch(err){ console.error(err); showToast('Gagal import: '+String(err),'error'); }
      ev.target.value = '';
    };
    reader.readAsText(f);
  });

  // theme toggle
  themeBtn.addEventListener('click', ()=> {
    document.body.classList.toggle('light');
    localStorage.setItem('theme_v32', document.body.classList.contains('light') ? 'light' : 'dark');
  });
  if(localStorage.getItem('theme_v32') === 'light') document.body.classList.add('light');

  // keyboard handling: mark body.kb-active when inputs focused (fallback hide footer)
  (function keyboardClassHandlers(){
    const inputs = document.querySelectorAll('input, textarea, select');
    function onFocus(){ document.body.classList.add('kb-active'); }
    function onBlur(){ document.body.classList.remove('kb-active'); }
    inputs.forEach(el => { el.addEventListener('focus', onFocus); el.addEventListener('blur', onBlur); });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const vh = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
        if(vh < (window.screen.height * 0.6)) document.body.classList.add('kb-active');
        else document.body.classList.remove('kb-active');
      }, 120);
    });
  })();

  // autosave + visualViewport sheet adjustments
  (function sheetAutosaveAndViewport(){
    const sheetAreaEl = document.getElementById('sheetArea');
    if(!sheetAreaEl) return;
    let _autosaveTimer = null;
    sheetAreaEl.addEventListener('input', function() {
      clearTimeout(_autosaveTimer);
      _autosaveTimer = setTimeout(function(){
        if(typeof editingId !== 'undefined' && editingId !== null){
          const it = DB.find(x => String(x.id) === String(editingId));
          if(it){
            it.note = sheetAreaEl.value;
            it.updatedAt = now();
            safeSet(STORAGE, DB);
            render(); // update preview live
          }
        }
      }, 400);
    });
    function adjustSheetWithViewport(){
      try{
        const vv = window.visualViewport;
        if(!vv) return;
        const sheet = document.querySelector('.sheet');
        if(!sheet) return;
        const offset = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
        sheet.style.transform = offset ? `translateY(-${offset}px)` : 'translateY(0)';
        sheet.style.transition = 'transform .08s linear';
      }catch(e){}
    }
    if(window.visualViewport){
      visualViewport.addEventListener('resize', adjustSheetWithViewport);
      visualViewport.addEventListener('scroll', adjustSheetWithViewport);
    } else {
      window.addEventListener('resize', adjustSheetWithViewport);
    }
  })();

  // misc helpers
  function escapeAttr(s){ return String(s||'').replace(/"/g,'&quot;'); }

  // initial render
  render();

  // expose debug helpers (optional)
  window._AIRDROP_DB = ()=> DB;
  window._dumpKeys = ()=> Object.keys(localStorage).sort();
});
