let cachedCart = null;

const addressValidators = {
  fullName: (v) => v.trim().length >= 2 || "الاسم الكامل مطلوب.",
  phone: (v) => /^[0-9+\-\s]{7,20}$/.test(v.trim()) || "أدخل رقم هاتف صحيح.",
  country: (v) => v.trim().length >= 2 || "الدولة مطلوبة.",
  city: (v) => v.trim().length >= 2 || "المدينة مطلوبة.",
  area: (v) => v.trim().length >= 2 || "المنطقة مطلوبة.",
  street: (v) => v.trim().length >= 2 || "الشارع مطلوب.",
  building: (v) => v.trim().length >= 1 || "رقم المبنى مطلوب.",
};

function validateField(name, value) {
  const rule = addressValidators[name];
  if (!rule) return true;
  const result = rule(value);
  const fieldEl = document.getElementById(`f-${name}`);
  if (!fieldEl) return result === true;
  const errEl = fieldEl.querySelector("small.error");
  if (result === true) {
    fieldEl.classList.remove("invalid");
    return true;
  }
  fieldEl.classList.add("invalid");
  if (errEl) errEl.textContent = result;
  return false;
}

function attachLiveValidation() {
  const form = document.getElementById("checkoutForm");
  Object.keys(addressValidators).forEach((name) => {
    const input = form.elements[name];
    if (input) input.addEventListener("blur", () => validateField(name, input.value));
  });
}

function renderSummary(cart) {
  const el = document.getElementById("checkoutSummary");
  el.innerHTML = `
    ${cart.items
      .map(
        (it) => `
      <div class="summary-row">
        <span>${escapeHtml(it.name)} × ${it.quantity}</span>
        <span>${formatMoney(it.lineTotal)}</span>
      </div>`
      )
      .join("")}
    <div class="summary-row total"><span>الإجمالي</span><span>${formatMoney(cart.total)}</span></div>
  `;
}

async function loadCheckout() {
  try {
    const cart = await api.get("/api/cart");
    if (cart.items.length === 0) {
      window.location.href = "/cart.html";
      return;
    }
    cachedCart = cart;
    renderSummary(cart);
  } catch (err) {
    showToast("تعذر تحميل سلتك.", "error");
  }
}

async function submitOrder() {
  const form = document.getElementById("checkoutForm");
  const errorBox = document.getElementById("formError");
  errorBox.classList.remove("show");

  const fieldsToValidate = Object.keys(addressValidators);

  let allValid = true;
  fieldsToValidate.forEach((name) => {
    const input = form.elements[name];
    if (input && !validateField(name, input.value)) allValid = false;
  });

  if (!allValid) {
    errorBox.textContent = "من فضلك صحّح الحقول المظللة.";
    errorBox.classList.add("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const fd = new FormData(form);
  const payload = {
    address: {
      fullName: fd.get("fullName").trim(),
      phone: fd.get("phone").trim(),
      country: fd.get("country").trim(),
      city: fd.get("city").trim(),
      area: fd.get("area").trim(),
      street: fd.get("street").trim(),
      building: fd.get("building").trim(),
      floor: fd.get("floor").trim(),
      apartment: fd.get("apartment").trim(),
      notes: fd.get("notes").trim(),
    },
    payment: {
      method: "cash_on_delivery",
    },
  };

  const btn = document.getElementById("placeOrderBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> جارٍ تأكيد الطلب...`;

  try {
    const order = await api.post("/api/orders", payload);
    showToast("تم تأكيد طلبك بنجاح! شكراً لأختيارك Fettra _ فِطْره 🎀", "success");
    // Logged-in customers get their normal order-history page. Guests aren't authenticated
    // to view /orders.html, so show a confirmation right here instead of redirecting them
    // into a login wall.
    let isLoggedIn = true;
    try {
      await api.get("/api/auth/me");
    } catch {
      isLoggedIn = false;
    }
    if (isLoggedIn) {
      window.location.href = `/orders.html?justPlaced=${order.id}`;
    } else {
      showGuestOrderConfirmation(order);
    }
  } catch (err) {
    errorBox.textContent = err.message;
    errorBox.classList.add("show");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

function showGuestOrderConfirmation(order) {
  const main = document.querySelector("main.container");
  main.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="icon">✅</div>
      <h2 style="margin:8px 0 4px;">تم تأكيد طلبك بنجاح!</h2>
      <p>رقم طلبك هو <strong>#${order.id}</strong> — احتفظ به لأي استفسار.</p>
      <p style="color:var(--color-muted);font-size:14px;">سيصلك طلبك على عنوان "${escapeHtml(
        order.address.street
      )}, ${escapeHtml(order.address.area)}, ${escapeHtml(order.address.city)}" — الدفع عند الاستلام.</p>
      <p style="color:var(--color-accent-dark);font-weight:700;font-size:14px;margin-top:10px;">شكراً لأختيارك Fettra _ فِطْره 🎀</p>
      <a href="/index.html" class="btn btn-primary" style="margin-top:14px;">متابعة التسوق</a>
    </div>
  `;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  attachLiveValidation();
  loadCheckout();
});
