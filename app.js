/* ——————————————————————————————
   Airdrop Manager V32 — JS
   Fully compatible: GitHub, Acode, Mobile
—————————————————————————————— */

document.addEventListener("DOMContentLoaded", () => {

    /* STORAGE */
    const KEY = "airdrop_v32";
    let DB = JSON.parse(localStorage.getItem(KEY) || "[]");

    const el = id => document.getElementById(id);

    /* CATEGORY */
    const CATS = {
        "Airdrop":"#06b6d4","Faucet":"#60a5fa","Social Task":"#f97316","Testnet":"#8b5cf6",
        "Daily Task":"#10b981","Retro":"#f59e0b","Node":"#64748b","IDO":"#ef4444",
        "Staking":"#84cc16","GameFi":"#7c3aed","NFT":"#db2777"
    };
    const ICONS = {
        "Airdrop":"📦","Faucet":"🚰","Social Task":"🗣️","Testnet":"🧪",
        "Daily Task":"📅","Retro":"🕰️","Node":"🖥️","IDO":"🚀",
        "Staking":"🔒","GameFi":"🎮","NFT":"🖼️"
    };

    /* INIT CATEGORY INPUT */
    const typeInp = el("typeInp");
    const filterCat = el("filterCat");
    Object.keys(CATS).forEach(c => {
        typeInp.innerHTML += `<option>${c}</option>`;
        filterCat.innerHTML += `<option>${c}</option>`;
    });

    /* SAVE DB */
    function SAVE(){ localStorage.setItem(KEY, JSON.stringify(DB)); }

    /* CLOCK */
    function tick(){
        const d = new Date();
        el("clockTime").textContent = ("0"+d.getHours()).slice(-2)+":"+
                                      ("0"+d.getMinutes()).slice(-2);
        el("clockDate").textContent = d.toDateString();
    }
    tick(); setInterval(tick, 1000);

    /* TOAST */
    const toast = el("toast");
    function toastShow(msg, type="info"){
        toast.textContent = msg;
        toast.className = "toast " + type;
        toast.style.display = "block";
        setTimeout(()=> toast.style.display = "none", 1800);
    }

    /* THEME */
    el("themeBtn").onclick = () => {
        document.body.classList.toggle("light");
        localStorage.setItem("theme_v32",
            document.body.classList.contains("light")?"light":"dark"
        );
    };
    if(localStorage.getItem("theme_v32")==="light")
        document.body.classList.add("light");

    /* RENDER */
    function render(){
        el("total").textContent = DB.length;
        el("done").textContent = DB.filter(x=>x.done).length;

        // GRID
        const g = el("grid");
        g.innerHTML = "";
        let any = false;
        Object.keys(CATS).forEach(t=>{
            const c = DB.filter(x=>x.type===t && !x.done).length;
            if(c>0){
                any = true;
                g.innerHTML += `<div class="grid-item"><b>${ICONS[t]}</b> ${t} — ${c}</div>`;
            }
        });
        if(!any) g.innerHTML = "Tidak ada tugas aktif";

        // LIST
        const fc = filterCat.value;
        const fs = el("filterStat").value;

        let arr = DB.filter(i=>{
            return (fc==="All" || i.type===fc) &&
                   (fs==="All" || (fs==="Done"?i.done:!i.done));
        });

        const list = el("list");
        list.innerHTML = "";

        if(arr.length===0){
            list.innerHTML = `<div class="muted">Belum ada data</div>`;
            return;
        }

        arr.forEach(i=>{
            const date = new Date(i.id);
            const dS = date.getDate()+"/"+(date.getMonth()+1)+"/"+date.getFullYear();
            const line = i.done? "text-decoration:line-through;opacity:.6;" : "";

            list.innerHTML += `
            <div class="card" style="border-left:4px solid ${CATS[i.type]}">

                <div class="card-top" style="display:flex;gap:10px;align-items:center;">
                    <div class="star ${i.fav?'active':''}" data-id="${i.id}">★</div>
                    <div class="check ${i.done?'done':''}" data-id="${i.id}">${i.done?'✔':''}</div>

                    <div style="flex:1">
                        <div style="${line}font-weight:700">${i.name}</div>
                        <div class="badge" style="background:${CATS[i.type]}">
                            <span>${ICONS[i.type]}</span> ${i.type}
                        </div>
                    </div>

                    <div class="muted small" style="font-size:12px">${dS}</div>
                </div>

                <div class="card-actions">
                    ${i.link? `<button class="btn btn-link" data-link="${i.link}">🔗 Link</button>` : ""}
                    <button class="btn btn-note" data-id="${i.id}">📝</button>
                    <button class="btn btn-del" data-id="${i.id}">Hapus</button>
                </div>

            </div>`;
        });

        attachHandlers();
    }

    /* ATTACH HANDLERS FOR DYNAMIC LIST */
    function attachHandlers(){
        document.querySelectorAll(".star").forEach(el=>{
            el.onclick = ()=> {
                let id = el.dataset.id;
                let it = DB.find(x=>x.id==id);
                it.fav = !it.fav; SAVE(); render();
            };
        });

        document.querySelectorAll(".check").forEach(el=>{
            el.onclick = ()=> {
                let id = el.dataset.id;
                let it = DB.find(x=>x.id==id);
                it.done = !it.done; SAVE(); render();
            };
        });

        document.querySelectorAll(".btn-del").forEach(el=>{
            el.onclick = ()=> confirmDelete(el.dataset.id);
        });

        document.querySelectorAll(".btn-link").forEach(el=>{
            el.onclick = ()=> {
                let L = el.dataset.link;
                window.open( L.startsWith("http")?L:"https://"+L, "_blank" );
            };
        });

        document.querySelectorAll(".btn-note").forEach(el=>{
            el.onclick = ()=> openNote(el.dataset.id);
        });
    }

    /* ADD */
    el("addBtn").onclick = () => {
        const name = el("nameInp").value.trim();
        const link = el("linkInp").value.trim();
        const type = el("typeInp").value;

        if(!name){ toastShow("Nama wajib!", "error"); return; }

        DB.unshift({
            id: Date.now(),
            name, link, type, done:false, fav:false, note:""
        });

        SAVE(); render();

        el("nameInp").value = "";
        el("linkInp").value = "";
        toastShow("Item ditambahkan", "success");
    };

    /* CONFIRM DELETE */
    function confirmDelete(id){
        const modal = el("confirmModal");
        const yes = el("confirmYes");
        const no = el("confirmNo");

        modal.style.display = "flex";

        yes.onclick = ()=>{
            DB = DB.filter(x=>x.id!=id);
            SAVE(); render();
            modal.style.display = "none";
            toastShow("Item dihapus","success");
        };
        no.onclick = ()=> modal.style.display = "none";
    }

    /* NOTES */
    let editing = null;

    function openNote(id){
        const m = el("noteModal");
        editing = id;

        const it = DB.find(x=>x.id==id);
        el("noteText").value = it?it.note:"";

        m.style.display = "flex";
    }

    el("closeNote").onclick = ()=> el("noteModal").style.display="none";
    el("saveNote").onclick = ()=>{
        if(editing){
            let it = DB.find(x=>x.id==editing);
            it.note = el("noteText").value;
            SAVE(); toastShow("Catatan disimpan","success");
        }
        el("noteModal").style.display="none";
    };

    /* DONATE MODAL */
    const WALLET = "0xB26F9AfBA067999F185951d17798Ac848407dCc";

    el("donateBtn").onclick = async ()=>{
        el("donateAddr").textContent = WALLET;
        el("donateModal").style.display="flex";
        try{
            await navigator.clipboard.writeText(WALLET);
            toastShow("Disalin ke clipboard","success");
        }catch{
            toastShow("Tekan Copy untuk menyalin","info");
        }
    };
    el("closeDonate").onclick = ()=> el("donateModal").style.display="none";
    el("copyDonate").onclick = async ()=>{
        try{
            await navigator.clipboard.writeText(WALLET);
            toastShow("Disalin!","success");
        }catch{
            toastShow("Gagal menyalin","error");
        }
    };

    /* JSON EXPORT */
    el("downloadBtn").onclick = ()=>{
        const blob = new Blob([JSON.stringify(DB,null,2)],{type:"application/json"});
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "airdrops_backup.json";
        a.click();

        URL.revokeObjectURL(url);
    };

    /* JSON IMPORT */
    el("uploadBtn").onclick = ()=> el("fileInput").click();

    el("fileInput").onchange = function(){
        const file = this.files[0];
        if(!file) return;

        const reader = new FileReader();
        reader.onload = ()=> {
            try{
                const arr = JSON.parse(reader.result);
                if(!Array.isArray(arr)) throw "Format salah";

                confirmImport(arr);

            }catch{
                toastShow("File tidak valid","error");
            }
        };
        reader.readAsText(file);
    };

    function confirmImport(arr){
        const M = el("confirmModal");
        el("confirmTitle").textContent = "Import JSON";
        el("confirmMsg").textContent = "OK = Merge, Batal = Replace";

        M.style.display = "flex";

        el("confirmYes").onclick = ()=>{
            const map = new Map(DB.map(i=>[i.id,i]));
            arr.forEach(x=> map.set(x.id,x));
            DB = Array.from(map.values()).sort((a,b)=>b.id-a.id);
            SAVE(); render();
            M.style.display = "none";
            toastShow("Merge sukses","success");
        };

        el("confirmNo").onclick = ()=>{
            DB = arr;
            SAVE(); render();
            M.style.display = "none";
            toastShow("Replace sukses","success");
        };
    }

    /* INIT RENDER */
    render();
});