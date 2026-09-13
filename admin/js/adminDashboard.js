const dashStatusPill = (status) => `<span class="status-pill status-${status}">${adminStatusLabel[status] || status}</span>`;

async function loadDashboard() {
  try {
    const [productsData, orders] = await Promise.all([
      adminApi.get("/api/admin/products?limit=1"),
      adminApi.get("/api/admin/orders"),
    ]);

    document.getElementById("statProducts").textContent = productsData.total;
    document.getElementById("statOrders").textContent = orders.length;
    document.getElementById("statPending").textContent = orders.filter((o) => o.status === "pending" || o.status === "processing").length;

    const revenue = orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.total, 0);
    document.getElementById("statRevenue").textContent = adminFormatMoney(revenue);

    const recent = orders.slice(0, 8);
    document.getElementById("recentOrdersBody").innerHTML = recent
      .map(
        (o) => `
      <tr>
        <td>#${o.id}</td>
        <td>${adminEscapeHtml(o.address.fullName)}</td>
        <td>${adminFormatMoney(o.total)}</td>
        <td>${dashStatusPill(o.status)}</td>
        <td>${o.paymentStatus === "paid" ? "مدفوع" : "غير مدفوع"}</td>
        <td>${new Date(o.createdAt).toLocaleDateString("ar-EG")}</td>
      </tr>`
      )
      .join("") || `<tr><td colspan="6" style="text-align:center;color:var(--color-muted);">لا توجد طلبات بعد.</td></tr>`;
  } catch (err) {
    adminToast("تعذر تحميل بيانات لوحة القيادة.", "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAdminAuth("dashboard");
  loadDashboard();
});
