// Renders the "آراء عميلاتنا" (customer reviews) section shared by the homepage and the
// product page. Reviews are storefront-wide (not tied to a single product): one text
// review per logged-in customer, plus admin-curated screenshot reviews.

function starString(rating) {
  const r = Math.max(0, Math.min(5, Number(rating) || 0));
  return "★".repeat(r) + "☆".repeat(5 - r);
}

function reviewCardHtml(r) {
  if (r.type === "screenshot") {
    return `
      <div class="review-card review-card-screenshot" onclick="openReviewImage('${r.image}')" style="cursor: pointer;">
        <img src="${r.image}" alt="رأي عميلة عن Fettra _ فِطْره" loading="lazy" />
        ${r.comment ? `<p class="review-caption">${escapeHtml(r.comment)}</p>` : ""}
      </div>`;
  }
  return `
    <div class="review-card">
      <div class="review-stars">${starString(r.rating)}</div>
      <p class="review-comment">${escapeHtml(r.comment)}</p>
      <div class="review-name">${escapeHtml(r.customerName || "عميلة فِطْره")}</div>
    </div>`;
}

function renderReviewsList(reviews) {
  const list = document.getElementById("reviewsList");
  if (!list) return;
  if (!reviews || reviews.length === 0) {
    list.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--color-muted);">كوني أول من تشارك رأيها في Fettra _ فِطْره 🎀</p>`;
    return;
  }
  list.innerHTML = reviews.map(reviewCardHtml).join("");
}

async function setupReviewForm() {
  const formWrap = document.getElementById("reviewFormWrap");
  if (!formWrap) return;

  try {
    await api.get("/api/auth/me");
  } catch {
    formWrap.innerHTML = `
      <p style="font-size:14px;color:var(--color-muted);margin-bottom:12px;">سجّلي الدخول لمشاركة رأيكِ معنا</p>
      <a href="/login.html?next=${encodeURIComponent(window.location.pathname + window.location.search)}" class="btn btn-outline btn-sm">تسجيل الدخول</a>
    `;
    return;
  }

  try {
    const status = await api.get("/api/reviews/me");
    if (status.hasReviewed) {
      formWrap.innerHTML = `<p style="color:var(--color-muted);font-size:14px;">شكراً لكِ! لقد شاركتِ رأيك بالفعل معنا 💚</p>`;
      return;
    }
  } catch {
    // If we can't determine status, still offer the form; the server enforces one-per-customer anyway.
  }

  formWrap.innerHTML = `
    <h3 style="margin:0 0 14px;font-size:16px;text-align:center;">شاركينا رأيكِ في Fettra _ فِطْره 🎀</h3>
    <div class="form-error" id="reviewFormError"></div>
    <form id="reviewForm">
      <div class="field">
        <label>تقييمكِ</label>
        <select name="rating" required>
          <option value="5">★★★★★ ممتاز</option>
          <option value="4">★★★★☆ جيد جداً</option>
          <option value="3">★★★☆☆ جيد</option>
          <option value="2">★★☆☆☆ مقبول</option>
          <option value="1">★☆☆☆☆ ضعيف</option>
        </select>
      </div>
      <div class="field">
        <label>رأيكِ</label>
        <textarea name="comment" rows="3" maxlength="1000" required placeholder="شاركينا تجربتكِ مع Fettra _ فِطْره 🎀"></textarea>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="submitReviewBtn">إرسال رأيكِ</button>
    </form>
  `;

  document.getElementById("reviewForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("reviewFormError");
    errorBox.classList.remove("show");

    const fd = new FormData(e.target);
    const comment = String(fd.get("comment") || "").trim();
    if (comment.length < 2) {
      errorBox.textContent = "من فضلك اكتبي رأيك.";
      errorBox.classList.add("show");
      return;
    }

    const btn = document.getElementById("submitReviewBtn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;

    try {
      await api.post("/api/reviews", { rating: Number(fd.get("rating")), comment });
      showToast("شكراً لرأيكِ! 💚", "success");
      
      // إخفاء النموذج واستبداله برسالة شكر مباشرة دون طلبات إضافية من السيرفر
      formWrap.innerHTML = `<p style="color:var(--color-muted);font-size:14px;text-align:center;">شكراً لكِ! تم إرسال رأيكِ بنجاح 💚</p>`;
      
      // إعادة جلب الآراء لتحديث القائمة فوراً
      const { reviews } = await api.get("/api/reviews");
      renderReviewsList(reviews);

    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

// دالة مكبرة لعرض اسكرين شوت آراء العملاء بحجم كامل عند الضغط عليها
function openReviewImage(imgUrl) {
  let overlay = document.getElementById("reviewImageOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "reviewImageOverlay";
    overlay.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.88); display: flex; align-items: center; justify-content: center;
      z-index: 99999; cursor: pointer; opacity: 0; transition: opacity 0.25s ease;
    `;
    overlay.onclick = () => {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 250);
    };
    document.body.appendChild(overlay);
  }

  overlay.innerHTML = `
    <div style="position: relative; max-width: 90vw; max-height: 90vh;">
      <img src="${imgUrl}" style="max-width: 85vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" />
    </div>
  `;

  setTimeout(() => (overlay.style.opacity = "1"), 10);
}

async function loadReviewsSection() {
  const section = document.getElementById("reviewsSection");
  if (!section) return;
  try {
    const { reviews } = await api.get("/api/reviews");
    renderReviewsList(reviews);
  } catch {
    const list = document.getElementById("reviewsList");
    if (list) list.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--color-muted);">تعذر تحميل آراء العملاء حاليًا.</p>`;
  }
  setupReviewForm();
}

document.addEventListener("DOMContentLoaded", loadReviewsSection);