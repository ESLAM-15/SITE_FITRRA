let screenshotFile = null;

function adminStarString(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function reviewRowHtml(r) {
  const dateStr = new Date(r.createdAt).toLocaleString("ar-EG");
  const typeLabel =
    r.type === "screenshot"
      ? '<span class="status-pill status-processing">سكرين شوت</span>'
      : '<span class="status-pill status-delivered">تقييم نصي</span>';

  const content =
    r.type === "screenshot"
      ? `<img class="thumb-mini" src="${r.image}" alt="" style="width:56px;height:56px;" /> ${
          r.comment ? adminEscapeHtml(r.comment) : ""
        }`
      : adminEscapeHtml(r.comment || "");

  return `
    <tr>
      <td>${typeLabel}</td>
      <td style="max-width:320px;">${content}</td>
      <td>${r.rating ? adminStarString(r.rating) : "—"}</td>
      <td>${adminEscapeHtml(r.customerName || "—")}</td>
      <td style="white-space:nowrap;font-size:12px;color:var(--color-muted);">${dateStr}</td>
      <td><button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})">حذف</button></td>
    </tr>
  `;
}

async function loadReviews() {
  try {
    const { reviews } = await adminApi.get("/api/admin/reviews");
    const body = document.getElementById("reviewsBody");
    const empty = document.getElementById("reviewsEmpty");
    if (reviews.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    body.innerHTML = reviews.map(reviewRowHtml).join("");
  } catch {
    adminToast("تعذر تحميل آراء العملاء.", "error");
  }
}

async function deleteReview(id) {
  if (!confirm("هل تريدين حذف هذا الرأي نهائيًا؟")) return;
  try {
    await adminApi.del(`/api/admin/reviews/${id}`);
    adminToast("تم حذف الرأي.", "success");
    loadReviews();
  } catch (err) {
    adminToast(err.message, "error");
  }
}

function resetScreenshotForm() {
  const form = document.getElementById("screenshotForm");
  form.reset();
  document.getElementById("screenshotPreview").innerHTML = "";
  document.getElementById("f-screenshot").classList.remove("invalid");
  document.getElementById("screenshotModalError").classList.remove("show");
  screenshotFile = null;
}

function openScreenshotModal() {
  resetScreenshotForm();
  document.getElementById("screenshotModalOverlay").classList.add("open");
}

function closeScreenshotModal() {
  document.getElementById("screenshotModalOverlay").classList.remove("open");
}

function setupScreenshotInput() {
  document.getElementById("screenshotInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    screenshotFile = file || null;
    const preview = document.getElementById("screenshotPreview");
    preview.innerHTML = file
      ? `<div class="thumb"><img src="${URL.createObjectURL(file)}" alt="" /></div>`
      : "";
  });
}

function setupScreenshotForm() {
  const form = document.getElementById("screenshotForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("screenshotModalError");
    errorBox.classList.remove("show");

    if (!screenshotFile) {
      document.getElementById("f-screenshot").classList.add("invalid");
      errorBox.textContent = "من فضلك اختاري صورة السكرين شوت.";
      errorBox.classList.add("show");
      return;
    }

    const fd = new FormData();
    fd.append("screenshot", screenshotFile);
    const caption = form.elements.caption.value.trim();
    if (caption) fd.append("caption", caption);

    const btn = document.getElementById("saveScreenshotBtn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;

    try {
      await adminApi.post("/api/admin/reviews", fd, true);
      adminToast("تمت إضافة السكرين شوت.", "success");
      closeScreenshotModal();
      loadReviews();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAdminAuth("reviews");
  setupScreenshotInput();
  setupScreenshotForm();
  loadReviews();
});
