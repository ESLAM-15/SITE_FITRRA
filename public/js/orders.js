const statusLabel = {
  pending: "قيد الانتظار",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
};

const paymentMethodLabel = {
  online_card: "دفع أونلاين بالبطاقة",
  cash_on_delivery: "الدفع عند الاستلام",
};

function orderCardHtml(order) {
  const date = new Date(order.createdAt).toLocaleString("ar-EG");
  return `
    <div class="cart-item" style="grid-template-columns: 1fr auto;">
      <div>
        <h4>طلب رقم ${order.id} <span style="color:var(--color-muted);font-weight:400;font-size:12px;">— ${date}</span></h4>
        <div style="font-size:13px;color:var(--color-muted);margin-bottom:6px;">
          ${order.items.map((it) => `${escapeHtml(it.product_name)} × ${it.quantity}`).join("، ")}
        </div>
        <div style="font-size:13px;">
          الحالة: <strong>${statusLabel[order.status] || order.status}</strong> ·
          الدفع: <strong>${order.paymentStatus === "paid" ? "مدفوع" : "غير مدفوع"}</strong>
          (${paymentMethodLabel[order.paymentMethod] || order.paymentMethod})
        </div>
        <div style="font-size:12px;color:var(--color-muted);margin-top:4px;">
          التوصيل إلى: ${escapeHtml(order.address.street)}, ${escapeHtml(order.address.area)}, ${escapeHtml(order.address.city)}
        </div>
      </div>
      <div style="text-align:right;font-weight:800;">${formatMoney(order.total)}</div>
    </div>
  `;
}

async function loadOrders() {
  const container = document.getElementById("ordersList");

  const justPlacedId = new URLSearchParams(window.location.search).get("justPlaced");
  if (justPlacedId) {
    const banner = document.createElement("div");
    banner.className = "form-error show";
    banner.style.cssText =
      "background:#eef4ec;color:var(--color-primary-dark);border-color:var(--color-border);font-weight:700;text-align:center;";
    banner.textContent = `تم تأكيد طلبك رقم #${justPlacedId} بنجاح — شكراً لأختيارك Fettra _ فِطْره 🎀`;
    container.parentNode.insertBefore(banner, container);
    // Clean the URL so a page refresh doesn't keep showing the banner.
    window.history.replaceState({}, "", "/orders.html");
  }

  try {
    const orders = await api.get("/api/orders");
    if (orders.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📦</div>
          <p>لم تقم بأي طلبات بعد.</p>
          <a href="/index.html" class="btn btn-primary" style="margin-top:14px;">ابدأ التسوق</a>
        </div>`;
      return;
    }
    container.innerHTML = orders.map(orderCardHtml).join("");
  } catch (err) {
    if (err.status === 401) {
      window.location.href = "/login.html?next=/orders.html";
      return;
    }
    showToast("تعذر تحميل طلباتك.", "error");
  }
}

document.addEventListener("DOMContentLoaded", loadOrders);
