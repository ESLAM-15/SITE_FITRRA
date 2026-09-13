// Small fetch wrapper shared by every customer-facing page.
// Always sends cookies (credentials: "include") so the httpOnly JWT cookie is used.

async function apiRequest(url, { method = "GET", body, isFormData = false } = {}) {
  const options = {
    method,
    credentials: "include",
    headers: {},
  };

  if (body !== undefined) {
    if (isFormData) {
      options.body = body; // FormData sets its own Content-Type with boundary
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

const api = {
  get: (url) => apiRequest(url),
  post: (url, body, isFormData = false) => apiRequest(url, { method: "POST", body, isFormData }),
  put: (url, body, isFormData = false) => apiRequest(url, { method: "PUT", body, isFormData }),
  patch: (url, body) => apiRequest(url, { method: "PATCH", body }),
  del: (url) => apiRequest(url, { method: "DELETE" }),
};

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message, type = "success") {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function formatMoney(n) {
  return `${Number(n).toFixed(2)} ج.م`;
}

async function refreshCartBadge() {
  const badgeEls = document.querySelectorAll("[data-cart-badge]");
  if (badgeEls.length === 0) return;
  try {
    const cart = await api.get("/api/cart");
    badgeEls.forEach((el) => {
      el.textContent = cart.itemCount;
      el.style.display = cart.itemCount > 0 ? "flex" : "none";
    });
  } catch {
    // not logged in / no cart yet — hide badge silently
    badgeEls.forEach((el) => (el.style.display = "none"));
  }
}
