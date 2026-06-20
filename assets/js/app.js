(() => {
  // ── Auth helpers ──────────────────────────────────────────
  const TOKEN_KEY = 'cfm_token';
  const USER_KEY  = 'cfm_user';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function getUser()  { try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; } }
  function setAuth(token, user) { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user)); }
  function clearAuth() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); }
  function logout() { clearAuth(); window.location.href = 'login.html'; }
  function requireAuth() {
    const user = getUser(); const token = getToken();
    if (!user || !token) { window.location.href = 'login.html'; return null; }
    return user;
  }
  function authHeaders() {
    const t = getToken();
    return t ? { 'Authorization': 'Bearer ' + t, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  }

  // ── apiFetch ──────────────────────────────────────────────
  async function apiFetch(path, opts = {}) {
    const headers = { ...authHeaders(), ...(opts.headers || {}) };
    const res = await fetch(path, { ...opts, headers });
    if (res.status === 401) { clearAuth(); window.location.href = 'login.html'; return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || `HTTP ${res.status}`);
    return data;
  }

  // ── Toast ─────────────────────────────────────────────────
  let toastContainer;
  function showToast(msg, type = 'info') {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    t.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Charts ────────────────────────────────────────────────
  function generateChartData(points, base, volatility, trend) {
    const data = []; let v = base;
    for (let i = 0; i < points; i++) {
      v += (Math.random() - (0.5 - trend * 0.1)) * volatility;
      data.push(Math.max(0, v));
    }
    return data;
  }

  function drawAreaChart(canvas, data, height = 120) {
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const W = canvas.offsetWidth || 600; canvas.width = W;
    const max = Math.max(...data); const min = Math.min(...data);
    const range = max - min || 1;
    const pad = 10; const cw = W - pad * 2; const ch = height - pad * 2;
    const x = i => pad + (i / (data.length - 1)) * cw;
    const y = v => pad + ch - ((v - min) / range) * ch;
    ctx.clearRect(0, 0, W, height);
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, 'rgba(0,212,255,.25)');
    grad.addColorStop(1, 'rgba(0,212,255,.0)');
    ctx.beginPath(); ctx.moveTo(x(0), y(data[0]));
    data.forEach((v, i) => { if (i > 0) ctx.lineTo(x(i), y(v)); });
    ctx.lineTo(x(data.length - 1), height); ctx.lineTo(x(0), height); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x(0), y(data[0]));
    data.forEach((v, i) => { if (i > 0) ctx.lineTo(x(i), y(v)); });
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 2; ctx.stroke();
  }

  function drawDonutChart(canvas, segments, size = 120) {
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.25;
    let start = -Math.PI / 2;
    const total = segments.reduce((s, x) => s + x.value, 0);
    segments.forEach(seg => {
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill();
      start += angle;
    });
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = '#111827'; ctx.fill();
  }

  // ── Live prices ───────────────────────────────────────────
  const PRICES = {
    BTC:  { price: 67420.50, change: 2.34 },
    ETH:  { price: 3521.80,  change: 1.87 },
    BNB:  { price: 412.30,   change: -0.52 },
    SOL:  { price: 185.60,   change: 4.21 },
    ADA:  { price: 0.485,    change: -1.13 },
    DOT:  { price: 8.92,     change: 0.78 },
    LINK: { price: 18.45,    change: 3.12 },
    AVAX: { price: 38.70,    change: -0.94 },
  };

  function updatePrices() {
    Object.keys(PRICES).forEach(sym => {
      const p = PRICES[sym];
      const delta = (Math.random() - 0.48) * p.price * 0.002;
      p.price  = Math.max(0.001, p.price + delta);
      p.change = parseFloat((p.change + (Math.random() - 0.5) * 0.3).toFixed(2));
    });
  }
  setInterval(updatePrices, 3000);

  // ── FAQ ───────────────────────────────────────────────────
  function initFAQ() {
    document.querySelectorAll('.faq-item').forEach(item => {
      const q = item.querySelector('.faq-q');
      if (q) q.addEventListener('click', () => {
        const open = item.classList.contains('open');
        document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
        if (!open) item.classList.add('open');
      });
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────
  function initScrollReveal() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; } });
    }, { threshold: 0.1 });
    document.querySelectorAll('.feature-card, .plan-card, .stat-card').forEach(el => {
      el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; el.style.transition = 'opacity .5s ease, transform .5s ease';
      obs.observe(el);
    });
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initFAQ();
    setTimeout(initScrollReveal, 100);
  });

  // ── Export ────────────────────────────────────────────────
  window.CFM = {
    getToken, getUser, setAuth, clearAuth, logout, requireAuth,
    authHeaders, apiFetch, showToast,
    drawAreaChart, drawDonutChart, generateChartData,
    PRICES,
  };
})();
