// Same lightweight fetch wrapper pattern as the customer site, kept separate
// so the admin panel has zero shared code path with the public storefront.

async function adminApiRequest(url, { method = "GET", body, isFormData = false } = {}) {
  const options = { method, credentials: "include", headers: {} };

  if (body !== undefined) {
    if (isFormData) {
      options.body = body;
    } else {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = (data && (data.error || (data.details && data.details[0]?.message))) || "حدث خطأ ما.";
    const err = new Error(message);
    err.status = res.status;
    err.details = data && data.details;
    throw err;
  }
  return data;
}

const adminApi = {
  get: (url) => adminApiRequest(url),
  post: (url, body, isFormData = false) => adminApiRequest(url, { method: "POST", body, isFormData }),
  put: (url, body, isFormData = false) => adminApiRequest(url, { method: "PUT", body, isFormData }),
  patch: (url, body) => adminApiRequest(url, { method: "PATCH", body }),
  del: (url) => adminApiRequest(url, { method: "DELETE" }),
};

function adminEscapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function adminFormatMoney(n) {
  return `${Number(n).toFixed(2)} ج.م`;
}

const adminStatusLabel = {
  pending: "قيد الانتظار",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

function adminToast(message, type = "success") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.style.cssText = "position:fixed;bottom:20px;left:20px;z-index:999;display:flex;flex-direction:column;gap:10px;";
    document.body.appendChild(wrap);
  }
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `background:${type === "error" ? "#c0392b" : "#2f6b4f"};color:#fff;padding:12px 18px;border-radius:10px;font-size:14px;box-shadow:0 8px 24px rgba(0,0,0,0.15);max-width:300px;`;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// Guards every admin.html page except login.html — redirects to login if the
// admin_token cookie is missing/invalid. Also renders the sidebar shell.
async function requireAdminAuth(activePage) {
  try {
    const me = await adminApi.get("/api/admin/auth/me");
    renderAdminShell(activePage, me.username);
  } catch {
    window.location.href = "/admin/login.html";
  }
}

function renderAdminShell(activePage, username) {
  const shell = document.getElementById("adminShell");
  if (!shell) return;
  const nav = [
    { key: "dashboard", label: "لوحة القيادة", href: "/admin/dashboard.html" },
    { key: "products", label: "المنتجات", href: "/admin/products.html" },
    { key: "orders", label: "الطلبات", href: "/admin/orders.html" },
    { key: "reviews", label: "آراء العملاء", href: "/admin/reviews.html" },
  ];
  shell.querySelector(".sidebar-nav").innerHTML = nav
    .map((n) => `<a href="${n.href}" class="${n.key === activePage ? "active" : ""}">${n.label}</a>`)
    .join("");
  const userLabel = shell.querySelector(".sidebar-user");
  if (userLabel) userLabel.textContent = username;
}

async function adminLogout() {
  if (!confirm("تسجيل الخروج من لوحة التحكم؟")) return;
  await adminApi.post("/api/admin/auth/logout");
  window.location.href = "/admin/login.html";
}
