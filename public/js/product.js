let currentProduct = null;
let selectedQty = 1;
let currentImageIndex = 0; // تتبع مؤشر الصورة الحالية

function renderProduct(p) {
  // 👈 الإصلاح الرئيسي: حفظ بيانات المنتج الحالي لمنع فشل فتح Lightbox
  currentProduct = p; 

  const hasDiscount = p.discountAmount > 0;
  const images = p.images && p.images.length ? p.images : ["/images/placeholder.svg"];

  document.title = `${p.name} — Fettra _ فِطْره 🎀`;
  document.getElementById("pdContainer").innerHTML = `
    <div class="pd-layout">
      <div>
        <!-- حاوية الصورة الرئيسية مع ضبط التجاوب وأيقونة التكبير -->
        <div class="pd-main-image">
          <img id="mainImage" src="${images[0]}" alt="${escapeHtml(p.name)}" />
          <button class="zoom-btn" id="pdZoomBtn" onclick="openProductLightbox(currentImageIndex)" title="تكبير وفحص الصور">🔍</button>
        </div>
        
        ${images.length > 1 ? `
          <div class="pd-thumbs">
            ${images.map((img, i) => `
              <img src="${img}" class="${i === 0 ? "active" : ""}" onclick="switchImage('${img}', this, ${i})" />
            `).join("")}
          </div>` : ""}
      </div>
      
      <div class="pd-info">
        ${hasDiscount ? `<span class="badge" style="position:static;display:inline-block;margin-bottom:10px;">خصم ${formatMoney(p.discountAmount)}</span>` : ""}
        <h1>${escapeHtml(p.name)}</h1>
        <div class="pd-price">
          ${formatMoney(p.finalPrice)}
          ${hasDiscount ? `<span class="price-original" style="font-size:16px;margin-right:8px;">${formatMoney(p.price)}</span>` : ""}
        </div>
        <div class="stock-note" style="margin-top:10px;">
          ${p.inStock ? "متوفر" : "غير متوفر حاليًا"}
        </div>
        <p class="pd-desc">${escapeHtml(p.description)}</p>
        <div class="pd-actions">
          <div class="qty-control">
            <button onclick="changeQty(-1)">-</button>
            <span id="qtyDisplay">1</span>
            <button onclick="changeQty(1)">+</button>
          </div>
          <button class="btn btn-primary" id="addBtn" ${!p.inStock ? "disabled" : ""} onclick="addCurrentToCart()">
            ${p.inStock ? "أضف إلى السلة" : "نفدت الكمية"}
          </button>
        </div>
      </div>
    </div>
  `;
}

// دالة التبديل بين الصور وتحديث العرض والصورة المحددة
function switchImage(src, el, index) {
  currentImageIndex = index;
  const mainImg = document.getElementById("mainImage");
  if (mainImg) mainImg.src = src;

  document.querySelectorAll(".pd-thumbs img").forEach((img) => img.classList.remove("active"));
  if (el) el.classList.add("active");
}

// دالة التكبير واستكشاف تفاصيل الصورة
function openProductLightbox(startIndex = 0) {
  if (!currentProduct || !currentProduct.images || !currentProduct.images.length) return;

  const images = currentProduct.images;
  let activeIndex = startIndex;

  let overlay = document.getElementById("pdLightboxOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "pdLightboxOverlay";
    document.body.appendChild(overlay);
  }

  function renderLightboxContent() {
    const currentImgUrl = images[activeIndex];
    
    overlay.innerHTML = `
      <div class="lb-container" onclick="event.stopPropagation()">
        <button class="lb-close" onclick="closeProductLightbox()">&times;</button>
        
        <div class="lb-main-wrapper">
          ${images.length > 1 ? `<button class="lb-arrow prev" id="lbPrev">&#10095;</button>` : ""}
          
          <div class="lb-img-zoom-container" id="lbZoomContainer">
            <img src="${currentImgUrl}" alt="${escapeHtml(currentProduct.name)}" class="lb-image" id="lbMainImage" />
          </div>
          
          ${images.length > 1 ? `<button class="lb-arrow next" id="lbNext">&#10094;</button>` : ""}
        </div>

        ${images.length > 1 ? `
          <div class="lb-thumbs-strip">
            ${images.map((img, idx) => `
              <img src="${img}" 
                   class="lb-thumb-item ${idx === activeIndex ? 'active' : ''}" 
                   onclick="setLightboxIndex(${idx})" />
            `).join("")}
          </div>` : ""}
      </div>`;

    if (images.length > 1) {
      document.getElementById("lbPrev").onclick = (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex - 1 + images.length) % images.length;
        renderLightboxContent();
      };
      document.getElementById("lbNext").onclick = (e) => {
        e.stopPropagation();
        activeIndex = (activeIndex + 1) % images.length;
        renderLightboxContent();
      };
    }

    initZoomEffect();
    initTouchSwipe();
  }

  function initZoomEffect() {
    const container = document.getElementById("lbZoomContainer");
    const img = document.getElementById("lbMainImage");

    if (!container || !img) return;

    container.onmousemove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const xPercent = (x / rect.width) * 100;
      const yPercent = (y / rect.height) * 100;

      img.style.transformOrigin = `${xPercent}% ${yPercent}%`;
      img.style.transform = "scale(2.2)";
    };

    container.onmouseleave = () => {
      img.style.transform = "scale(1)";
      img.style.transformOrigin = "center center";
    };
  }

  function initTouchSwipe() {
    const container = document.getElementById("lbZoomContainer");
    if (!container || images.length <= 1) return;

    let touchStartX = 0;
    let touchEndX = 0;

    container.ontouchstart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    container.ontouchend = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    function handleSwipe() {
      const threshold = 40;
      if (touchEndX < touchStartX - threshold) {
        activeIndex = (activeIndex + 1) % images.length;
        renderLightboxContent();
      } else if (touchEndX > touchStartX + threshold) {
        activeIndex = (activeIndex - 1 + images.length) % images.length;
        renderLightboxContent();
      }
    }
  }

  window.setLightboxIndex = function (idx) {
    activeIndex = idx;
    renderLightboxContent();
  };

  window.closeProductLightbox = function () {
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    setTimeout(() => {
      overlay.style.display = "none";
    }, 250);
  };

  overlay.onclick = window.closeProductLightbox;
  
  renderLightboxContent();
  overlay.style.display = "flex";
  setTimeout(() => {
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
  }, 10);
}

document.addEventListener("keydown", (e) => {
  const overlay = document.getElementById("pdLightboxOverlay");
  if (!overlay || overlay.style.display !== "flex") return;

  if (e.key === "ArrowRight") {
    document.getElementById("lbPrev")?.click();
  } else if (e.key === "ArrowLeft") {
    document.getElementById("lbNext")?.click();
  } else if (e.key === "Escape") {
    closeProductLightbox();
  }
});

function changeQty(delta) {
  if (!currentProduct) return;
  const next = selectedQty + delta;
  if (next < 1 || next > currentProduct.stock) return;
  selectedQty = next;
  document.getElementById("qtyDisplay").textContent = selectedQty;
}

async function addCurrentToCart() {
  const btn = document.getElementById("addBtn");
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span>`;
  try {
    await api.post("/api/cart/items", { productId: currentProduct.id, quantity: selectedQty });
    showToast("تمت الإضافة إلى السلة", "success");
    refreshCartBadge();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
}

async function loadProduct() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    window.location.href = "/index.html";
    return;
  }
  try {
    const fetchedProduct = await api.get(`/api/products/${id}`);

    if (typeof fetchedProduct.images === "string") {
      try {
        fetchedProduct.images = JSON.parse(fetchedProduct.images);
      } catch {
        fetchedProduct.images = fetchedProduct.images.split(",").map((img) => img.trim());
      }
    }

    if (!Array.isArray(fetchedProduct.images) || fetchedProduct.images.length === 0) {
      if (fetchedProduct.image) {
        fetchedProduct.images = [fetchedProduct.image];
      } else {
        fetchedProduct.images = ["/images/placeholder.svg"];
      }
    }

    renderProduct(fetchedProduct);
  } catch (err) {
    console.error(err);
    document.getElementById("pdContainer").innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>المنتج غير موجود.</p></div>`;
  }
}

// حقن أنماط الـ CSS المعدلة لإصلاح أبعاد الصورة وعدم قصها
function injectPdStyles() {
  if (document.getElementById("pd-gallery-styles")) return;
  const style = document.createElement("style");
  style.id = "pd-gallery-styles";

  style.textContent = `
    /* حاوية الصورة الرئيسية مع ضبط الارتفاع والتناسب */
    .pd-main-image {
      position: relative;
      width: 100%;
      height: 500px;
      max-height: 70vh;
      background-color: #f8f9fa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .pd-main-image img {
      max-width: 100%;
      max-height: 100%;
      width: auto;
      height: auto;
      object-fit: contain !important; /* يضمن عرض الصورة كاملة بدون قص أي جزء */
    }

    .zoom-btn {
      position: absolute; 
      top: 12px; 
      left: 12px;
      background: rgba(255, 255, 255, 0.9); 
      border: none;
      border-radius: 50%; 
      width: 36px; 
      height: 36px;
      display: flex; 
      align-items: center; 
      justify-content: center;
      cursor: pointer; 
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: transform 0.2s, background 0.2s; 
      z-index: 5;
    }
    .zoom-btn:hover { transform: scale(1.1); background: #ffffff; }

    #pdLightboxOverlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.92); display: none; align-items: center; justify-content: center;
      z-index: 99999; opacity: 0; transition: opacity 0.25s ease; pointer-events: none;
      direction: ltr;
    }

    .lb-container {
      position: relative; max-width: 90vw; max-height: 95vh;
      display: flex; flex-direction: column; align-items: center;
      background: #000; border-radius: 8px; padding: 10px;
    }

    .lb-close {
      position: absolute; top: -40px; right: 0; background: none; border: none;
      color: #fff; font-size: 36px; cursor: pointer; z-index: 10;
    }

    .lb-main-wrapper {
      position: relative; display: flex; align-items: center; justify-content: center;
      width: 100%; height: 75vh; margin-bottom: 12px; overflow: hidden;
    }

    .lb-img-zoom-container {
      width: 100%; height: 100%; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      cursor: zoom-in; border-radius: 4px; touch-action: pan-y;
    }

    .lb-image {
      max-width: 100%; max-height: 100%; object-fit: contain;
      transition: transform 0.1s ease-out; transform-origin: center center;
    }

    .lb-arrow {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(255,255,255,0.15); border: none; color: #fff;
      font-size: 24px; width: 44px; height: 44px; border-radius: 50%;
      cursor: pointer; z-index: 5; transition: background 0.2s;
    }
    .lb-arrow:hover { background: rgba(255,255,255,0.35); }
    .lb-arrow.prev { right: 10px; }
    .lb-arrow.next { left: 10px; }

    .lb-thumbs-strip {
      display: flex; gap: 8px; overflow-x: auto; max-width: 80vw;
      padding: 5px; background: rgba(255,255,255,0.05); border-radius: 4px;
    }

    .lb-thumb-item {
      width: 50px; height: 50px; object-fit: cover; border-radius: 4px;
      cursor: pointer; border: 2px solid transparent; opacity: 0.5; transition: all 0.2s;
    }
    .lb-thumb-item.active { border-color: #fff; opacity: 1; transform: scale(1.08); }
    .lb-thumb-item:hover { opacity: 0.8; }

    @media (max-width: 768px) {
      .pd-main-image { height: 380px; }
    }
  `;
  document.head.appendChild(style);
}

document.addEventListener("DOMContentLoaded", () => {
  injectPdStyles();
  loadProduct();
});