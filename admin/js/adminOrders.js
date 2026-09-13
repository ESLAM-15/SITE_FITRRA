let allOrders = [];

const STATUS_OPTIONS = ["pending", "processing", "shipped", "delivered", "cancelled"];

function orderRowHtml(o) {
  const itemsSummary = o.items.map((it) => `${adminEscapeHtml(it.product_name)} × ${it.quantity}`).join(", ");
  const address = `${adminEscapeHtml(o.address.street)}, ${adminEscapeHtml(o.address.area)}, ${adminEscapeHtml(o.address.city)}, ${adminEscapeHtml(o.address.country)}`;
  return `
    <tr>
      <td>#${o.id}</td>
      <td>${adminEscapeHtml(o.address.fullName)}<br/><span style="color:var(--color-muted);font-size:12px;">${adminEscapeHtml(o.address.phone)}</span></td>
      <td style="max-width:220px;font-size:12.5px;color:var(--color-muted);">${address}</td>
      <td style="max-width:220px;font-size:12.5px;">${itemsSummary}</td>
      <td>${adminFormatMoney(o.total)}</td>
      <td>${o.paymentStatus === "paid" ? '<span class="status-pill status-delivered">مدفوع</span>' : '<span class="status-pill status-pending">غير مدفوع</span>'}</td>
      <td>
        <select onchange="updateStatus(${o.id}, this.value)" style="padding:6px 10px;border-radius:8px;border:1.5px solid var(--color-border);">
          ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${adminStatusLabel[s] || s}</option>`).join("")}
        </select>
      </td>
      <td style="white-space:nowrap;font-size:12.5px;color:var(--color-muted);">${new Date(o.createdAt).toLocaleString("ar-EG")}</td>
    </tr>
  `;
}

function renderOrders() {
  const filter = document.getElementById("statusFilter").value;
  const filtered = filter ? allOrders.filter((o) => o.status === filter) : allOrders;
  const body = document.getElementById("ordersBody");
  const empty = document.getElementById("ordersEmpty");

  if (filtered.length === 0) {
    body.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  body.innerHTML = filtered.map(orderRowHtml).join("");
}

async function loadOrders() {
  try {
    allOrders = await adminApi.get("/api/admin/orders");
    renderOrders();
  } catch {
    adminToast("تعذر تحميل الطلبات.", "error");
  }
}

async function updateStatus(orderId, status) {
  try {
    await adminApi.patch(`/api/admin/orders/${orderId}/status`, { status });
    const order = allOrders.find((o) => o.id === orderId);
    if (order) order.status = status;
    adminToast(`تم تحديث الطلب #${orderId} إلى "${adminStatusLabel[status] || status}".`, "success");
  } catch (err) {
    adminToast(err.message, "error");
    loadOrders();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAdminAuth("orders");
  document.getElementById("statusFilter").addEventListener("change", renderOrders);
  loadOrders();
});
