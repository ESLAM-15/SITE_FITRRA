// TODO: replace with your own Google OAuth 2.0 Web Client ID (must match GOOGLE_CLIENT_ID
// in the server's .env file). Create one at https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

const authValidators = {
  name: (v) => v.trim().length >= 2 || "الاسم يجب أن يكون حرفين على الأقل.",
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || "أدخل بريدًا إلكترونيًا صحيحًا.",
  phone: (v) => v.trim() === "" || /^[0-9+\-\s]{7,20}$/.test(v.trim()) || "أدخل رقم هاتف صحيح.",
  password: (v) =>
    (v.length >= 8 && /[a-z]/.test(v) && /[A-Z]/.test(v) && /[0-9]/.test(v)) ||
    "8 أحرف على الأقل، تحتوي على حرف كبير وحرف صغير ورقم.",
};

function validateAuthField(form, name) {
  const rule = authValidators[name];
  const input = form.elements[name];
  if (!rule || !input) return true;
  const result = rule(input.value);
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

function getNextUrl() {
  return new URLSearchParams(window.location.search).get("next") || "/index.html";
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;
  ["email", "password"].forEach((n) => form.elements[n].addEventListener("blur", () => validateAuthField(form, n)));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("formError");
    errorBox.classList.remove("show");

    const valid = ["email", "password"].map((n) => validateAuthField(form, n)).every(Boolean);
    if (!valid) return;

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    try {
      await api.post("/api/auth/login", {
        email: form.elements.email.value.trim(),
        password: form.elements.password.value,
      });
      window.location.href = getNextUrl();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "تسجيل الدخول";
    }
  });
}

function setupRegisterForm() {
  const form = document.getElementById("registerForm");
  if (!form) return;
  ["name", "email", "phone", "password"].forEach((n) =>
    form.elements[n].addEventListener("blur", () => validateAuthField(form, n))
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorBox = document.getElementById("formError");
    errorBox.classList.remove("show");

    const valid = ["name", "email", "phone", "password"].map((n) => validateAuthField(form, n)).every(Boolean);
    if (!valid) return;

    const btn = document.getElementById("submitBtn");
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    try {
      await api.post("/api/auth/register", {
        name: form.elements.name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        password: form.elements.password.value,
      });
      window.location.href = getNextUrl();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.add("show");
      btn.disabled = false;
      btn.textContent = "إنشاء الحساب";
    }
  });
}

// Called by Google's script once the person picks an account.
async function handleGoogleCredentialResponse(response) {
  const errorBox = document.getElementById("formError");
  if (errorBox) errorBox.classList.remove("show");
  try {
    await api.post("/api/auth/google", { credential: response.credential });
    window.location.href = getNextUrl();
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || "تعذر تسجيل الدخول بواسطة جوجل.";
      errorBox.classList.add("show");
    }
  }
}

function setupGoogleSignIn() {
  const mount = document.getElementById("googleSignInBtn");
  if (!mount || !window.google || !window.google.accounts || !window.google.accounts.id) return;
  if (GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID")) {
    mount.innerHTML =
      '<p class="sub" style="text-align:center;">لتفعيل الدخول بجوجل، أضف Client ID في js/auth.js وملف .env</p>';
    return;
  }
  window.google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleGoogleCredentialResponse,
  });
  window.google.accounts.id.renderButton(mount, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "pill",
    locale: "ar",
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
  setupRegisterForm();
  // Google's script loads asynchronously — poll briefly until it's ready.
  let attempts = 0;
  const tryInit = () => {
    attempts += 1;
    if (window.google && window.google.accounts && window.google.accounts.id) {
      setupGoogleSignIn();
    } else if (attempts < 40) {
      setTimeout(tryInit, 150);
    }
  };
  tryInit();
});
