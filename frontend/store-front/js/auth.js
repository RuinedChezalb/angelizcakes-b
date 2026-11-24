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

  // Action alerts for UI demo
  root.querySelectorAll('[data-auth-action="forgot-password"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      alert("Password reset: Enter your email and a reset link will be sent.");
    });
  });

  root.querySelectorAll('[data-auth-action="google"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      alert("Google Social Login preview.");
    });
  });

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const user = usernameInput?.value.trim();
    const pass = passwordInput?.value;

    if (!user || !pass) {
      if (status) {
        status.textContent = "Please enter both email/username and password.";
        status.style.color = "#7b2d42";
      }
      return;
    }

    if (status) {
      status.textContent = "Signing in...";
      status.style.color = "#25633b";
      setTimeout(() => {
        status.textContent = `Welcome back, ${user}! (UI/UX Preview)`;
      }, 400);
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
      alert("Terms of Service preview.");
    });
  });

  root.querySelectorAll('[data-auth-action="privacy"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      alert("Privacy Policy preview.");
    });
  });

  root.querySelectorAll('[data-auth-action="google"]').forEach(el => {
    el.addEventListener("click", event => {
      event.preventDefault();
      alert("Google Social Sign-Up preview.");
    });
  });

  if (!form) return;

  form.addEventListener("submit", event => {
    event.preventDefault();
    const name = nameInput?.value.trim();
    const email = usernameInput?.value.trim();
    const pass = passInput?.value;
    const confirmPass = confirmPassInput?.value;
    const terms = termsCheckbox?.checked;

    if (!name || !email || !pass || !confirmPass) {
      if (status) {
        status.textContent = "Please fill in all required fields.";
        status.style.color = "#7b2d42";
      }
      return;
    }

    if (pass !== confirmPass) {
      if (status) {
        status.textContent = "Passwords do not match.";
        status.style.color = "#7b2d42";
      }
      return;
    }

    if (!terms) {
      if (status) {
        status.textContent = "Please agree to the Terms of Service and Privacy Policy.";
        status.style.color = "#7b2d42";
      }
      return;
    }

    if (status) {
      status.textContent = "Creating account...";
      status.style.color = "#25633b";
      setTimeout(() => {
        status.textContent = `Account created for ${name}! (UI/UX Preview)`;
      }, 500);
    }
  });
};
