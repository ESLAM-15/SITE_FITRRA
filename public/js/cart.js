function cartItemHtml(item) {
  return `
    <div class="cart-item" data-product-id="${item.productId}">
      <img src="${item.image || "/images/placeholder.svg"}" alt="${escapeHtml(item.name)}" />
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <div class="price">${formatMoney(item.finalPrice)}</div>
        <div class="qty-control" style="margin-top:8px;">
          <button onclick="changeCartQty(${item.productId}, ${item.quantity - 1})">-</button>
          <span>${item.quantity}</span>
          <button onclick="changeCartQty(${item.productId}, ${item.quantity + 1})" ${item.quantity >= item.stock ? "disabled" : ""}>+</button>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-weight:800;margin-bottom:10px;">${formatMoney(item.lineTotal)}</div>
        <button class="btn btn-outline btn-sm" onclick="removeCartItem(${item.productId})">إزالة</button>
      </div>
    </div>
  `;
}

function renderCart(cart) {
  const layout = document.getElementById("cartLayout");
  if (cart.items.length === 0) {
    layout.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="icon">🛒</div>
        <p>سلتك فارغة.</p>
        <a href="/index.html" class="btn btn-primary" style="margin-top:14px;">تصفح المنتجات</a>
      </div>
    `;
    return;
  }

  layout.innerHTML = `
    <div id="cartItemsList">${cart.items.map(cartItemHtml).join("")}</div>
    <div class="summary-card">
      <div class="summary-row"><span>عدد العناصر</span><span>${cart.itemCount}</span></div>
      <div class="summary-row total"><span>الإجمالي</span><span>${formatMoney(cart.total)}</span></div>
      <a href="/checkout.html" class="btn btn-primary btn-block" style="margin-top:16px;">إتمام الطلب</a>
    </div>
  `;
}

async function loadCart() {
  try {
    const cart = await api.get("/api/cart");
    renderCart(cart);
    refreshCartBadge();
  } catch (err) {
    showToast("تعذر تحميل سلتك.", "error");
  }
}

async function changeCartQty(productId, newQty) {
  if (newQty < 1) return;
  try {
    const cart = await api.put(`/api/cart/items/${productId}`, { quantity: newQty });
    renderCart(cart);
    refreshCartBadge();
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function removeCartItem(productId) {
  try {
    const cart = await api.del(`/api/cart/items/${productId}`);
    renderCart(cart);
    refreshCartBadge();
    showToast("تمت إزالة المنتج", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", loadCart);
