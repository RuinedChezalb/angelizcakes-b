(() => {
  const isLocalHost = ["localhost", "127.0.0.1"].includes(location.hostname);
  const defaultBackendUrl = isLocalHost
    ? `${location.protocol}//${location.hostname}:8080`
    : location.origin;
  const backendUrl = String(
    window.ANGELIZ_BACKEND_URL || defaultBackendUrl
  ).replace(/\/+$/, "");
  const baseUrl = String(
    window.ANGELIZ_API_BASE_URL || `${backendUrl}/api/v1`
  ).replace(/\/+$/, "");
  let csrfToken = "";
  let connectionBanner;
  let apiUnavailable = false;

  function showConnectionBanner(message) {
    if (!connectionBanner) {
      connectionBanner = document.createElement("div");
      connectionBanner.setAttribute("role", "status");
      connectionBanner.setAttribute("aria-live", "polite");
      connectionBanner.style.cssText = "position:fixed;inset:0 0 auto;z-index:10000;display:flex;align-items:center;justify-content:center;gap:12px;padding:12px 16px;background:#312b27;color:#fff;font:14px/1.4 system-ui,sans-serif;box-shadow:0 2px 12px #0003";
      connectionBanner.hidden = true;
      connectionBanner.style.display = "none";
      const text = document.createElement("span");
      text.dataset.connectionMessage = "true";
      const retryButton = document.createElement("button");
      retryButton.type = "button";
      retryButton.textContent = "Check connection";
      retryButton.style.cssText = "border:1px solid #fff8;border-radius:4px;padding:6px 10px;background:transparent;color:inherit;font:inherit;cursor:pointer";
      retryButton.addEventListener("click", async () => {
        retryButton.disabled = true;
        retryButton.textContent = "CheckingΓÇª";
        await checkConnection();
        retryButton.disabled = false;
        retryButton.textContent = "Check connection";
      });
      connectionBanner.append(text, retryButton);
      document.body.append(connectionBanner);
    }
    connectionBanner.querySelector("[data-connection-message]").textContent = message;
    connectionBanner.hidden = false;
    connectionBanner.style.display = "flex";
  }

  async function checkConnection() {
    if (!navigator.onLine) {
      showConnectionBanner("You are offline. Reconnect to continue; unsent changes may need to be retried.");
      return;
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`, { cache: "no-store" });
      if (!response.ok) throw new Error("Backend health check failed.");
      apiUnavailable = false;
      if (connectionBanner) {
        connectionBanner.hidden = true;
        connectionBanner.style.display = "none";
      }
    } catch {
      apiUnavailable = true;
      showConnectionBanner("The service is unreachable. Check your connection, then retry the action.");
    }
  }

  function markApiUnavailable() {
    apiUnavailable = true;
    showConnectionBanner(
      navigator.onLine
        ? "The service is unreachable. Check your connection, then retry the action."
        : "You are offline. Reconnect to continue; unsent changes may need to be retried."
    );
  }

  function markApiAvailable() {
    if (!apiUnavailable) return;
    apiUnavailable = false;
    if (connectionBanner) {
      connectionBanner.querySelector("[data-connection-message]").textContent = "Connection restored.";
      connectionBanner.hidden = false;
      connectionBanner.style.display = "flex";
      window.setTimeout(() => {
        if (!apiUnavailable && navigator.onLine) {
          connectionBanner.hidden = true;
          connectionBanner.style.display = "none";
        }
      }, 2500);
    }
  }

  async function fetchWithRecovery(url, options, method) {
    const canRetry = ["GET", "HEAD", "OPTIONS"].includes(method);
    for (let attempt = 0; ; attempt += 1) {
      let response;
      try {
        response = await fetch(url, options);
      } catch (cause) {
        markApiUnavailable();
        if (canRetry && attempt === 0 && navigator.onLine) {
          await new Promise(resolve => window.setTimeout(resolve, 600));
          continue;
        }
        const error = new Error(
          canRetry
            ? "Network connection failed. Please retry."
            : "Network connection failed. The request outcome may be unknown; check before retrying."
        );
        error.cause = cause;
        error.isNetworkError = true;
        throw error;
      }

      if (canRetry && attempt === 0 && [502, 503, 504].includes(response.status)) {
        markApiUnavailable();
        await new Promise(resolve => window.setTimeout(resolve, 600));
        continue;
      }
      if (response.status < 500 || ![502, 503, 504].includes(response.status)) {
        markApiAvailable();
      } else {
        markApiUnavailable();
      }
      return response;
    }
  }

  window.addEventListener("offline", markApiUnavailable);
  window.addEventListener("online", checkConnection);
  if (!navigator.onLine) markApiUnavailable();

  async function getCsrfToken() {
    const response = await fetchWithRecovery(`${baseUrl}/auth/csrf`, {
      credentials: "include",
      headers: { Accept: "application/json" }
    }, "GET");
    const payload = await response.json();
    if (!response.ok || typeof payload.csrfToken !== "string") {
      throw new Error(payload.error || "Could not start a secure API session.");
    }
    csrfToken = payload.csrfToken;
  }

  async function request(path, options = {}) {
    const method = String(options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    headers.set("Accept", "application/json");
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (options.body !== undefined && !isFormData) headers.set("Content-Type", "application/json");
    if (!csrfToken) await getCsrfToken();
    headers.set("X-CSRF-Token", csrfToken);

    const response = await fetchWithRecovery(`${baseUrl}${path}`, {
      ...options,
      method,
      headers,
      credentials: "include"
    }, method);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 403) csrfToken = "";
      const uncertainWrite = !["GET", "HEAD", "OPTIONS"].includes(method)
        && [502, 503, 504].includes(response.status);
      const error = new Error(uncertainWrite
        ? "The service timed out. The request may have completed; check its status before trying again."
        : payload.error || `API request failed (${response.status}).`);
      error.status = response.status;
      if (uncertainWrite) error.outcomeUnknown = true;
      throw error;
    }
    if (typeof payload.csrfToken === "string") csrfToken = payload.csrfToken;
    return payload;
  }

  window.angelizApi = Object.freeze({
    request,
    backendUrl,
    oauthUrl: provider => {
      if (!["facebook", "google"].includes(provider)) {
        throw new TypeError("Unsupported social login provider.");
      }
      return new URL(`/login/${provider}`, new URL(baseUrl).origin).href;
    },
    login: (email, password) => request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
    register: (name, email, password, phone) => request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password, phone })
    }),
    currentUser: () => request("/auth/me"),
    logout: async () => {
      const result = await request("/auth/logout", { method: "POST" });
      csrfToken = "";
      return result;
    }
  });
})();
