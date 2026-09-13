let allProducts = [];
let editingProductId = null;
let imagesToRemove = new Set();
let newImageFiles = [];

const productFieldValidators = {
  name: (v) => v.trim().length >= 2 || "الاسم يجب أن يكون حرفين على الأقل.",
  description: (v) => v.trim().length >= 1 || "الوصف مطلوب.",
  price: (v) => (v !== "" && Number(v) >= 0) || "أدخل سعرًا صحيحًا.",
  discountAmount: (v) => v === "" || Number(v) >= 0 || "قيمة الخصم يجب أن تكون رقمًا موجبًا.",
  stock: (v) => (v !== "" && Number.isInteger(Number(v)) && Number(v) >= 0) || "أدخل عدد مخزون صحيح.",
};

function validateProductField(name, value) {
  const rule = productFieldValidators[name];
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

function productRowHtml(p) {
  const img = p.images[0] || "/images/placeholder.svg";
  return `
    <tr>
      <td><img class="thumb-mini" src="${img}" alt="" /></td>
      <td>${adminEscapeHtml(p.name)}</td>
      <td>${adminFormatMoney(p.price)}</td>
      <td>${p.discountAmount > 0 ? adminFormatMoney(p.discountAmount) : "—"}</td>
      <td>${adminFormatMoney(p.finalPrice)}</td>
      <td>${p.stock}</td>
      <td>${p.isActive ? '<span class="status-pill status-delivered">مفعّل</span>' : '<span class="status-pill status-cancelled">مخفي</span>'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-outline btn-sm" onclick='openProductModal(${p.id})'>تعديل</button>
        <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">حذف</button>
      </td>
    </tr>
  `;
}

async function loadProducts(search = "") {
  try {
    const query = search ? `?search=${encodeURIComponent(search)}&limit=50` : "?limit=50";
    const data = await adminApi.get(`/api/admin/products${query}`);
    allProducts = data.products;
    const body = document.getElementById("productsBody");
    const empty = document.getElementById("productsEmpty");
    if (allProducts.length === 0) {
      body.innerHTML = "";
      empty.style.display = "block";
      return;
    }
    empty.style.display = "none";
    body.innerHTML = allProducts.map(productRowHtml).join("");
  } catch {
    adminToast("تعذر تحميل المنتجات.", "error");
  }
}

function resetProductForm() {
  const form = document.getElementById("productForm");
  form.reset();
  form.elements.discountAmount.value = 0;
  form.elements.isActive.checked = true;
  
  // 👈 ضبط الحالة الافتراضية لزر إظهار المخزون للعملاء
  if (form.elements.showStock) {
    form.elements.showStock.checked = true;
  }

  document.getElementById("existingImages").innerHTML = "";
  document.getElementById("newImagesPreview").innerHTML = "";
  document.querySelectorAll("#productForm .field").forEach((f) => f.classList.remove("invalid"));
  document.getElementById("modalError").classList.remove("show");
  imagesToRemove = new Set();
  newImageFiles = [];
}

function openProductModal(productId) {
  resetProductForm();
  editingProductId = productId || null;
  document.getElementById("modalTitle").textContent = productId ? "تعديل المنتج" : "إضافة منتج";
  document.getElementById("saveProductBtn").textContent = productId ? "حفظ التغييرات" : "إضافة المنتج";

  if (productId) {
    const p = allProducts.find((x) => x.id === productId);
    if (p) {
      const form = document.getElementById("productForm");
      form.elements.productId.value = p.id;
      form.elements.name.value = p.name;
      form.elements.description.value = p.description;
      form.elements.price.value = p.price;
      form.elements.discountAmount.value = p.discountAmount;
      form.elements.stock.value = p.stock;
      form.elements.isActive.checked = p.isActive;
      
      // 👈 تعيين حالة زر "إظهار المخزون للعملاء" من قاعدة البيانات عند فتح نافذة التعديل
      if (form.elements.showStock) {
        form.elements.showStock.checked = p.showStock !== false;
      }

      renderExistingImages(p);
    }
  }

  document.getElementById("productModalOverlay").classList.add("open");
}

function closeProductModal() {
  document.getElementById("productModalOverlay").classList.remove("open");
}

function renderExistingImages(product) {
  const wrap = document.getElementById("existingImages");
  wrap.innerHTML = product.images
    .map(
      (url) => `
      <div class="thumb" data-url="${url}">
        <img src="${url}" alt="" />
      </div>`
    )
    .join("");
}

function renderNewImagesPreview() {
  const wrap = document.getElementById("newImagesPreview");
  wrap.innerHTML = newImageFiles
    .map(
      (file, idx) => `
      <div class="thumb">
        <img src="${URL.createObjectURL(file)}" alt="" />
        <button type="button" onclick="removeNewImage(${idx})">&times;</button>
      </div>`
    )
    .join("");
}

function removeNewImage(idx) {
  newImageFiles.splice(idx, 1);
  renderNewImagesPreview();
}

function setupImageInput() {
  document.getElementById("imageInput").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    const combined = [...newImageFiles, ...files].slice(0, 6);
    newImageFiles = combined;
    renderNewImagesPreview();
    e.target.value = "";
  });
}

async function deleteProduct(productId) {
  if (!confirm("هل تريد حذف هذا المنتج نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.")) return;
  try {
    await adminApi.del(`/api/admin/products/${productId}`);
    adminToast("تم حذف المنتج.", "success");
    loadProducts(document.getElementById("searchInput").value.trim());
  } catch (err) {
    adminToast(err.message, "error");
  }
}

function setupProductForm() {
  const form = document.getElementById("productForm");
  ["name", "description", "price", "discountAmount", "stock"].forEach((n) =>
    form.elements[n].addEventListener("blur", () => validateProductField(n, form.elements[n].value))
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("modalError");
    errorBox.classList.remove("show");

    const fields = ["name", "description", "price", "discountAmount", "stock"];
    const valid = fields.map((n) => validateProductField(n, form.elements[n].value)).every(Boolean);
    if (!valid) {
      errorBox.textContent = "من فضلك صحّح الحقول المظللة.";
      errorBox.classList.add("show");
      return;
    }

    const fd = new FormData();
    fd.append("name", form.elements.name.value.trim());
    fd.append("description", form.elements.description.value.trim());
    fd.append("price", form.elements.price.value);
    fd.append("discountAmount", form.elements.discountAmount.value || "0");
    fd.append("stock", form.elements.stock.value);
    fd.append("isActive", form.elements.isActive.checked ? "true" : "false");
    
    // 👈 إرسال قيمة إظهار المخزون للعملاء إلى السيرفر
    if (form.elements.showStock) {
      fd.append("showStock", form.elements.showStock.checked ? "true" : "false");
    }

    newImageFiles.forEach((file) => fd.append("images", file));

    const btn = document.getElementById("saveProductBtn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;

    try {
      if (editingProductId) {
        await adminApi.put(`/api/admin/products/${editingProductId}`, fd, true);
        adminToast("تم تحديث المنتج.", "success");
      } else {
        await adminApi.post("/api/admin/products", fd, true);
        adminToast("تمت إضافة المنتج.", "success");
      }
      closeProductModal();
      loadProducts(document.getElementById("searchInput").value.trim());
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  });
}

function setupSearch() {
  const input = document.getElementById("searchInput");
  let debounce;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => loadProducts(input.value.trim()), 300);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireAdminAuth("products");
  setupImageInput();
  setupProductForm();
  setupSearch();
  loadProducts();
});