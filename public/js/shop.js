function productCardHtml(p, index) {
  const img = p.images[0] || "/images/placeholder.svg";
  const hasDiscount = p.discountAmount > 0;
  return `
    <div class="product-card" style="animation-delay:${Math.min(index * 0.04, 0.4)}s">
      <a href="/product.html?id=${p.id}">
        <div class="product-thumb">
          ${hasDiscount ? `<span class="badge">-${formatMoney(p.discountAmount)}</span>` : ""}
          <img src="${img}" alt="${escapeHtml(p.name)}" loading="lazy" />
          ${!p.inStock ? `<div class="badge-out">نفدت الكمية</div>` : ""}
        </div>
      </a>
      <div class="product-info">
        <h3><a href="/product.html?id=${p.id}">${escapeHtml(p.name)}</a></h3>
        <div class="price-row">
          <span class="price-final">${formatMoney(p.finalPrice)}</span>
          ${hasDiscount ? `<span class="price-original">${formatMoney(p.price)}</span>` : ""}
        </div>
        <div class="stock-note">
          ${p.inStock ? "متوفر" : "غير متوفر حاليًا"}
        </div>
        <button class="btn btn-primary btn-block btn-sm" ${!p.inStock ? "disabled" : ""} onclick="quickAdd(${p.id}, this)">
          ${p.inStock ? "أضف إلى السلة" : "نفدت الكمية"}
        </button>
      </div>
    </div>
  `;
}

async function quickAdd(productId, btn) {
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>`;
  try {
    await api.post("/api/cart/items", { productId, quantity: 1 });
    showToast("تمت الإضافة إلى السلة", "success");
    refreshCartBadge();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function loadProducts() {
  const grid = document.getElementById("productGrid");
  const empty = document.getElementById("emptyState");
  const params = new URLSearchParams(window.location.search);
  const search = params.get("search") || "";

  document.getElementById("gridTitle").textContent = search ? `نتائج البحث عن "${search}"` : "منتجاتنا";

  try {
    const query = search ? `?search=${encodeURIComponent(search)}&limit=24` : "?limit=24";
    const data = await api.get(`/api/products${query}`);
    document.getElementById("resultCount").textContent = `${data.total} منتج`;

    if (data.products.length === 0) {
      grid.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    grid.innerHTML = data.products.map(productCardHtml).join("");
  } catch (err) {
    grid.innerHTML = "";
    showToast("تعذر تحميل المنتجات.", "error");
  }
}

document.addEventListener("DOMContentLoaded", loadProducts);
