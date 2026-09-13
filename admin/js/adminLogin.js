document.addEventListener("DOMContentLoaded", () => {
  // If already logged in, skip straight to dashboard.
  adminApi
    .get("/api/admin/auth/me")
    .then(() => (window.location.href = "/admin/dashboard.html"))
    .catch(() => {});

  const form = document.getElementById("adminLoginForm");
  const errorBox = document.getElementById("formError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.classList.remove("show");

    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;

    if (username.length < 3) {
      errorBox.textContent = "أدخل اسم مستخدم صحيح.";
      errorBox.classList.add("show");
      return;
    }
    if (password.length < 1) {
      errorBox.textContent = "أدخل كلمة المرور.";
      errorBox.classList.add("show");
      return;
    }

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    try {
      await adminApi.post("/api/admin/auth/login", { username, password });
      window.location.href = "/admin/dashboard.html";
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }
  });
});
