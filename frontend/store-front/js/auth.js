"use strict";

/**
 * Angeliz Cakes Storefront Auth Fragment Handlers (AJAX Injected Views)
 * Handles UI interactions for login and register fragments without full page reloads.
 */

window.initializeLoginFragment = function initializeLoginFragment(root) {
  const form = root.querySelector("#authLoginForm");
  const usernameInput = root.querySelector("#loginUsername");
  const passwordInput = root.querySelector("#loginPassword");
  const status = root.querySelector("#loginAuthStatus");

  // Switch to Register fragment via AJAX custom event
  root.querySelectorAll('[data-switch-auth="register"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("storefront:show-register"));
    });
  });

  root.querySelectorAll('[data-auth-action="forgot-password"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      const email = usernameInput?.value.trim();
      if (!email) {
        if (status) status.textContent = "Enter your email first, then choose Forgot Password.";
        usernameInput?.focus();
        return;
      }
      window.location.href = `../../customer_controls/pages/forgot-password.html?email=${encodeURIComponent(email)}`;
    });
  });

  root.querySelectorAll('[data-auth-action="google"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      window.location.assign(new URL("/login/google", window.angelizApi.backendUrl));
    });
  });

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const email = usernameInput?.value.trim();
    const password = passwordInput?.value;
    if (!email || !password) {
      if (status) status.textContent = "Enter your email and password.";
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    if (status) status.textContent = "Signing in…";
    try {
      const result = await window.angelizApi.login(email, password);
      const routes = {
        customer: "/store-front/#home",
        admin: "/branch-admin/",
        super_admin: "/owner-admin/"
      };
      const destination = routes[result.user?.role];
      if (!destination) throw new Error("This account cannot access an Angeliz Cakes workspace.");
      window.location.assign(destination);
    } catch (error) {
      if (status) status.textContent = error.message || "Sign-in failed. Check your details and try again.";
    } finally {
      if (submit) submit.disabled = false;
    }
  });
};

window.initializeRegisterFragment = function initializeRegisterFragment(root) {
  const form = root.querySelector("#authRegisterForm");
  const nameInput = root.querySelector("#regFullName");
  const usernameInput = root.querySelector("#regUsername");
  const passInput = root.querySelector("#regPassword");
  const confirmPassInput = root.querySelector("#regConfirmPassword");
  const termsCheckbox = root.querySelector("#regTermsAccepted");
  const status = root.querySelector("#regAuthStatus");

  // Switch to Login fragment via AJAX custom event
  root.querySelectorAll('[data-switch-auth="login"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      document.dispatchEvent(new CustomEvent("storefront:show-login"));
    });
  });

  root.querySelectorAll('[data-auth-action="terms"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      window.location.href = "../../customer_controls/pages/terms-of-service.html";
    });
  });

  root.querySelectorAll('[data-auth-action="privacy"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      window.location.href = "../../customer_controls/pages/privacy-policy.html";
    });
  });

  root.querySelectorAll('[data-auth-action="google"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      window.location.assign(new URL("/login/google", window.angelizApi.backendUrl));
    });
  });

  if (!form) return;

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const name = nameInput?.value.trim();
    const email = usernameInput?.value.trim();
    const password = passInput?.value;
    const terms = termsCheckbox?.checked;
    if (!name || !email || !password) {
      if (status) status.textContent = "Complete all required fields.";
      return;
    }
    if (password !== confirmPassInput?.value) {
      if (status) status.textContent = "Passwords do not match.";
      return;
    }
    if (!terms) {
      if (status) status.textContent = "Agree to the Terms of Service and Privacy Policy to continue.";
      return;
    }
    const submit = form.querySelector('[type="submit"]');
    if (submit) submit.disabled = true;
    if (status) status.textContent = "Creating your account…";
    try {
      await window.angelizApi.register(name, email, password);
      if (status) status.textContent = "Account created. Sign in to continue.";
      document.dispatchEvent(new CustomEvent("storefront:show-login"));
    } catch (error) {
      if (status) status.textContent = error.message || "Registration failed. Try another email or try again.";
    } finally {
      if (submit) submit.disabled = false;
    }
  });
};
