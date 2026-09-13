// Renders the shared header and footer into placeholder elements.
// Keeps markup consistent across every customer-facing page without a build step.

function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;
  el.innerHTML = `
    <div class="container header-inner">
      <a href="/index.html" class="logo">Fettra<span> _ فِطْره 🎀</span></a>
      <form class="nav-search" onsubmit="event.preventDefault(); window.location.href='/index.html?search=' + encodeURIComponent(this.q.value);">
        <input name="q" type="search" placeholder="ابحث عن المنتجات..." maxlength="150" />
        <button type="submit" class="search-btn" title="بحث" aria-label="بحث">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </form>
      <div class="header-actions">
        <div class="social-links">
          <span class="social-label">تواصل معنا</span>
          <a href="https://www.instagram.com/fettra1_?igsh=eHVsMWlwaGFkNDU1" target="_blank" rel="noopener noreferrer" class="icon-btn" title="إنستجرام" aria-label="تواصل معنا على إنستجرام">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
          </a>
          <a href="https://www.facebook.com/share/1RSXtftnDt/" target="_blank" rel="noopener noreferrer" class="icon-btn" title="فيسبوك" aria-label="تواصل معنا على فيسبوك">
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h-2a5 5 0 0 0-5 5v2H6v4h2v7h4v-7h3l1-4h-4V8a1 1 0 0 1 1-1h3z"/></svg>
          </a>
        </div>
        <a href="/cart.html" class="icon-btn" title="السلة">
          🛒<span class="cart-badge" data-cart-badge style="display:none;">0</span>
        </a>
        <a href="/orders.html" class="icon-btn" title="طلباتي">📦</a>
        <a href="#" id="authAction" class="btn btn-outline btn-sm">
          <span class="auth-icon" aria-hidden="true">👤</span><span class="label">تسجيل الدخول</span>
        </a>
      </div>
    </div>
  `;
  setupAuthState();
  refreshCartBadge();
}

function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      &copy; ${new Date().getFullYear()} <span>Fettra _ فِطْره 🎀</span> — منتجات مختارة بعناية، تصل إلى باب بيتك.
    </div>
  `;
}

async function setupAuthState() {
  const authBtn = document.getElementById("authAction");
  if (!authBtn) return;
  try {
    const me = await api.get("/api/auth/me");
    authBtn.querySelector(".label").textContent = `أهلاً، ${me.name.split(" ")[0]}`;
    authBtn.href = "#";
    authBtn.onclick = async (e) => {
      e.preventDefault();
      if (confirm("تسجيل الخروج من حسابك؟")) {
        await api.post("/api/auth/logout");
        window.location.href = "/index.html";
      }
    };
  } catch {
    authBtn.querySelector(".label").textContent = "تسجيل الدخول";
    authBtn.href = "/login.html";
    authBtn.onclick = null;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
});
