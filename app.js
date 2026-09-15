// ============================================================
// Baykal Makine — CNC Machine V1 Kayıt Paneli
// index.html'deki View / Program / Manuel / Settings panellerini
// ve alt "Sistem Olay Günlüğü" şeridini api.php'deki
// /logs ve /errors uçlarına bağlar.
// ============================================================

const API_BASE = 'api.php';
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 82; // r=82 -> ~515.2
let latestLogs = [];

// ---------------- YARDIMCI FONKSİYONLAR ----------------

function fmtDate(v){
  if(!v) return '—';
  return v.replace('T', ' ').slice(0, 19);
}

function fmtDuration(sec){
  if(sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtDistance(mm){
  return `${Number(mm).toFixed(2)} mm`;
}

function setConnStatus(ok, text){
  document.querySelectorAll('#connStatus, #connStatusSettings').forEach(el => {
    if(!el) return;
    el.textContent = text;
    if(el.id === 'connStatus'){
      el.classList.remove('conn-ok', 'conn-err');
      el.classList.add(ok ? 'conn-ok' : 'conn-err');
    } else {
      el.className = 'conn ' + (ok ? 'ok' : 'err');
    }
  });
}

// ---------------- SEKME (NAV) GEÇİŞİ ----------------

const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(btn => {
  btn.addEventListener('click', () => {
    navItems.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.view-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`panel-${btn.dataset.view}`);
    if(target) target.classList.remove('hidden');
  });
});

// ---------------- GÖSTERGE (GAUGE) ----------------

function setGauge(count){
  const fill = document.getElementById('gaugeFill');
  const numberEl = document.getElementById('runCount');
  if(numberEl) numberEl.textContent = count;
  if(!fill) return;

  // Görsel bir gösterge halkası: çalıştırma sayısı arttıkça
  // halka dolar, 20 çalıştırmadan sonra tamamen dolu kabul edilir.
  const target = 20;
  const pct = Math.min(count / target, 1);
  const offset = GAUGE_CIRCUMFERENCE * (1 - pct);
  fill.style.strokeDasharray = GAUGE_CIRCUMFERENCE;
  fill.style.strokeDashoffset = offset;
}

// ---------------- MAKİNE DURUMU / ÖZET ----------------

function updateSummary(rows){
  latestLogs = rows;
  setGauge(rows.length);

  const totalDistance = rows.reduce((sum, r) => sum + Number(r.cut_measurement || 0), 0);
  const distanceEl = document.getElementById('totalDistance');
  if(distanceEl) distanceEl.textContent = fmtDistance(totalDistance);

  const running = rows.some(r => r.status === 'IN_PROGRESS');
  const statusEl = document.getElementById('machineStatus');
  if(statusEl){
    statusEl.classList.remove('running', 'idle', 'unknown');
    if(running){
      statusEl.classList.add('running');
      statusEl.innerHTML = `<span class="dot"></span> ÇALIŞIYOR (RUNNING)`;
    } else {
      statusEl.classList.add('idle');
      statusEl.innerHTML = `<span class="dot"></span> HAZIR (IDLE)`;
    }
  }

  renderOps(rows);
  renderUsers(rows);
  populateErrorLogSelect(rows);
}

function renderOps(rows){
  const tbody = document.getElementById('opsBody');
  if(!tbody) return;

  const counts = {};
  rows.forEach(r => {
    counts[r.operation_name] = (counts[r.operation_name] || 0) + 1;
  });

  const names = Object.keys(counts);
  if(names.length === 0){
    tbody.innerHTML = `<tr><td colspan="3" class="empty">Henüz operasyon yok.</td></tr>`;
    return;
  }

  tbody.innerHTML = names.map((name, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${name}</td>
      <td>${counts[name]}</td>
    </tr>
  `).join('');
}

function renderUsers(rows){
  const tbody = document.getElementById('usersBody');
  if(!tbody) return;

  const byUser = {};
  rows.forEach(r => {
    if(!byUser[r.users_name]){
      byUser[r.users_name] = { count: 0, distance: 0 };
    }
    byUser[r.users_name].count += 1;
    byUser[r.users_name].distance += Number(r.cut_measurement || 0);
  });

  const names = Object.keys(byUser);
  if(names.length === 0){
    tbody.innerHTML = `<tr><td colspan="4" class="empty">Henüz operatör yok.</td></tr>`;
    return;
  }

  tbody.innerHTML = names.map((name, i) => `
    <tr>
      <td>#${i + 1}</td>
      <td>${name}</td>
      <td>${byUser[name].count}</td>
      <td>${fmtDistance(byUser[name].distance)}</td>
    </tr>
  `).join('');
}

function populateErrorLogSelect(rows){
  const select = document.getElementById('err_log_id');
  if(!select) return;

  const current = select.value;
  if(rows.length === 0){
    select.innerHTML = `<option value="">Önce bir log kaydı oluşturun</option>`;
    return;
  }

  select.innerHTML = rows.map(r =>
    `<option value="${r.log_id}">#${r.log_id} — ${r.operation_name} (${r.users_name})</option>`
  ).join('');

  if(current && rows.some(r => String(r.log_id) === current)){
    select.value = current;
  }
}

// ---------------- KAYITLARI YÜKLE ----------------

async function loadLogs(){
  const tbody = document.getElementById('logsBody');

  try {
    const res = await fetch(`${API_BASE}/logs`);
    if(!res.ok) throw new Error('Sunucu hatası');
    const rows = await res.json();

    setConnStatus(true, '● bağlı');
    updateSummary(rows);

    if(!tbody) return;

    if(rows.length === 0){
      tbody.innerHTML = `<tr><td colspan="8" class="empty">Henüz kayıt yok.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => `
      <tr>
        <td>#${r.log_id}</td>
        <td>${r.users_name}</td>
        <td>${r.operation_name}</td>
        <td>${r.cut_measurement}</td>
        <td>${fmtDuration(r.time_used)}</td>
        <td><span class="badge ${r.status}">${r.status}</span></td>
        <td>${fmtDate(r.start_time)}</td>
        <td>${r.end_time ? '' : `<button class="complete-btn" data-id="${r.log_id}">Tamamla</button>`}</td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', () => completeLog(btn.dataset.id));
    });
  } catch (e) {
    setConnStatus(false, '● bağlantı yok');

    const statusEl = document.getElementById('machineStatus');
    if(statusEl){
      statusEl.classList.remove('running', 'idle');
      statusEl.classList.add('unknown');
      statusEl.innerHTML = `<span class="dot"></span> BİLİNMİYOR`;
    }
    if(tbody) tbody.innerHTML = `<tr><td colspan="8" class="empty">Kayıtlar yüklenemedi: ${e.message}</td></tr>`;
  }
}

async function completeLog(id){
  try {
    const res = await fetch(`${API_BASE}/logs/${id}/complete`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    if(!res.ok) throw new Error((await res.json()).error || 'Güncelleme başarısız');
    loadLogs();
  } catch (e) {
    alert('Hata: ' + e.message);
  }
}

// ---------------- ALT ŞERİT: SİSTEM OLAY GÜNLÜĞÜ (machine_errors) ----------------

function errorRowsHtml(rows){
  if(rows.length === 0){
    return `<tr><td colspan="6" class="empty">Kayıtlı hata yok.</td></tr>`;
  }
  return rows.map(r => `
    <tr>
      <td>#${r.error_id}</td>
      <td>#${r.log_id}</td>
      <td>${r.error_code}</td>
      <td>${r.error_message}</td>
      <td><span class="badge ${r.severity === 'HIGH' ? 'FAIL' : 'IN_PROGRESS'}">${r.severity}</span></td>
      <td>${fmtDate(r.occurred_at)}</td>
    </tr>
  `).join('');
}

async function loadErrors(){
  const countEl = document.getElementById('errorCount');
  const drawerBody = document.getElementById('errorsBody');
  const fullBody = document.getElementById('errorsFullBody');

  try {
    const res = await fetch(`${API_BASE}/errors`);
    if(!res.ok) throw new Error('Sunucu hatası');
    const rows = await res.json();

    if(countEl){
      countEl.textContent = rows.length;
      countEl.classList.toggle('zero', rows.length === 0);
    }

    const html = errorRowsHtml(rows);
    if(drawerBody) drawerBody.innerHTML = html;
    if(fullBody) fullBody.innerHTML = html;
  } catch (e) {
    if(countEl){ countEl.textContent = '?'; }
    const errHtml = `<tr><td colspan="6" class="empty">Hatalar yüklenemedi: ${e.message}</td></tr>`;
    if(drawerBody) drawerBody.innerHTML = errHtml;
    if(fullBody) fullBody.innerHTML = errHtml;
  }
}

document.getElementById('eventBarToggle')?.addEventListener('click', () => {
  document.getElementById('eventDrawer')?.classList.toggle('hidden');
});

document.getElementById('eventDrawerClose')?.addEventListener('click', () => {
  document.getElementById('eventDrawer')?.classList.add('hidden');
});

// ---------------- MANUEL KAYIT FORMU ----------------

document.getElementById('logForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('logMsg');
  const data = {
    users_name: form.users_name.value.trim(),
    operation_name: form.operation_name.value.trim(),
    cut_measurement: parseFloat(form.cut_measurement.value)
  };

  try {
    const res = await fetch(`${API_BASE}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if(!res.ok) throw new Error(json.error || 'Kayıt eklenemedi');

    if(msg){
      msg.textContent = `Kayıt oluşturuldu (log_id: ${json.log_id})`;
      msg.className = 'form-msg ok';
    }
    form.reset();
    loadLogs();
  } catch (err) {
    if(msg){
      msg.textContent = 'Hata: ' + err.message;
      msg.className = 'form-msg err';
    }
  }
});

document.getElementById('refreshLogs')?.addEventListener('click', () => {
  loadLogs();
  loadErrors();
});

// ---------------- HATA KAYDI FORMU ----------------

document.getElementById('errorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = document.getElementById('errMsg');

  // LocalStorage'dan token'ı al (Varsa ekler)
  const token = localStorage.getItem('token') || '';
  
  const data = {
    log_id: parseInt(form.log_id.value, 10),
    error_code: form.error_code.value.trim(),
    error_message: form.error_message.value.trim(),
    severity: form.severity.value
  };

  try {
    const res = await fetch(`${API_BASE}/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if(!res.ok) throw new Error(json.error || 'Hata kaydı eklenemedi');

    if(msg){
      msg.textContent = `Hata kaydı oluşturuldu (error_id: ${json.error_id})`;
      msg.className = 'form-msg ok';
    }
    form.reset();
    loadErrors();
  } catch (err) {
    if(msg){
      msg.textContent = 'Hata: ' + err.message;
      msg.className = 'form-msg err';
    }
  }
});

// ---------------- BAŞLATMA ----------------

loadLogs();
loadErrors();
setInterval(() => { loadLogs(); loadErrors(); }, 15000); // her 15 saniyede bir otomatik yenile