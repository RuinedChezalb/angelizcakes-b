(function () {
  const views = {
    dashboard: {
      fragment: "html/dashboard.html",
      stylesheet: "css/dashboard.css",
      script: "js/dashboard.js",
    },
    "order-management": {
      fragment: "html/order-management.html",
      stylesheet: "css/order-management.css",
      script: "js/order-management.js",
      onShow: "refreshBranchOrders",
    },
    "customer-records": {
      fragment: "html/customer-records.html",
      stylesheet: "css/customer-records.css",
      script: "js/customer-records.js",
      onShow: "refreshCustomerRecords",
    },
    "branch-inventory": {
      fragment: "html/branch-inventory.html",
      stylesheet: "css/branch-inventory.css",
      script: "js/branch-inventory.js",
      onShow: "refreshBranchInventory",
    },
    "sales-financial-reports": {
      fragment: "html/sales-financial-reports.html",
      stylesheet: "css/sales-financial-reports.css",
      script: "js/sales-financial-reports.js",
      onShow: "refreshSalesFinancialReports",
    },
    "daily-branch-report": {
      fragment: "html/daily-branch-report.html",
      stylesheet: "css/daily-branch-report.css",
      script: "js/daily-branch-report.js",
    },
    "staff-shift-management": {
      fragment: "html/staff-shift-management.html",
      stylesheet: "css/staff-shift-management.css",
      script: "js/staff-shift-management.js",
    },
    "support-center": {
      fragment: "html/support-center.html",
      stylesheet: "css/support-center.css",
    },
    communication: {
      fragment: "../owner-admin/html/communication.html",
      stylesheet: "../owner-admin/css/communication.css",
      script: "../owner-admin/js/communication.js",
    },
    "pos-terminal": {
      fragment: "html/pos-terminal.html",
      stylesheet: "css/pos-terminal.css",
      script: "js/pos-terminal.js",
      onShow: "refreshPosInventoryStock",
    },
  };

  const sidebarMount = document.getElementById("ownerAdminSidebarMount");
  const viewMount = document.getElementById("ownerAdminViewMount");
  const status = document.getElementById("ownerAdminStatus");
  const sidebar = document.getElementById("ac-sidebar");
  const sidebarToggle = document.getElementById("acToggle");
  const sidebarBackdrop = document.getElementById("acSidebarBackdrop");
  const app = document.getElementById("ownerAdminApp");
  const toastElement = document.getElementById("acToast");
  const currentDate = document.getElementById("ownerAdminCurrentDate");
  const mobileBreakpoint = window.matchMedia("(max-width: 1024px)");
  const compactDesktopBreakpoint = window.matchMedia("(min-width: 1025px) and (max-width: 1200px)");
  const cachedViews = new Map();
  let activeStylesheet = null;
  let activeStylesheetPath = "";
  let navigationQueue = Promise.resolve();
  let toastTimer;

  function setStatus(message) {
    status.textContent = message;
  }

  function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastElement.classList.remove("show"), 2200);
  }

  function setMobileOpen(isOpen) {
    sidebar.classList.toggle("open", isOpen);
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    sidebarToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    sidebarToggle.removeAttribute("title");
    sidebarBackdrop.hidden = !isOpen;
    document.body.style.overflow = isOpen ? "hidden" : "";
    sidebarToggle.innerHTML = isOpen
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  }

  function updateDesktopToggle() {
    const expanded = sidebar.classList.contains("pinned");
    const label = expanded ? "Collapse sidebar" : "Expand sidebar";
    sidebarToggle.setAttribute("aria-expanded", String(expanded));
    sidebarToggle.setAttribute("aria-label", label);
    sidebarToggle.title = label;
    sidebarToggle.innerHTML = expanded
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
  }

  function syncLayout() {
    if (mobileBreakpoint.matches) {
      setMobileOpen(false);
      return;
    }

    setMobileOpen(false);
    const expanded = !compactDesktopBreakpoint.matches;
    sidebar.classList.toggle("pinned", expanded);
    app.classList.toggle("sidebar-expanded", expanded);
    updateDesktopToggle();
  }

  sidebarToggle.addEventListener("click", () => {
    if (mobileBreakpoint.matches) {
      setMobileOpen(sidebarToggle.getAttribute("aria-expanded") !== "true");
      return;
    }

    const expanded = sidebar.classList.toggle("pinned");
    app.classList.toggle("sidebar-expanded", expanded);
    updateDesktopToggle();
  });

  sidebarBackdrop.addEventListener("click", () => setMobileOpen(false));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && sidebar.classList.contains("open")) {
      setMobileOpen(false);
      sidebarToggle.focus();
    }
  });

  mobileBreakpoint.addEventListener("change", syncLayout);
  compactDesktopBreakpoint.addEventListener("change", syncLayout);
  syncLayout();

  const dateFormatter = new Intl.DateTimeFormat("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  function updateCurrentDate() {
    const now = new Date();
    const localDate = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    currentDate.textContent = dateFormatter.format(now);
    currentDate.dateTime = localDate;
  }

  updateCurrentDate();
  window.setInterval(updateCurrentDate, 60_000);

  for (const trigger of document.querySelectorAll("[data-header-tooltip]")) {
    const tooltip = document.getElementById(trigger.getAttribute("aria-describedby"));
    let tooltipTimer;

    const showTooltipAfterDelay = () => {
      window.clearTimeout(tooltipTimer);
      tooltipTimer = window.setTimeout(() => {
        tooltip.hidden = false;
      }, 2000);
    };

    const hideTooltip = () => {
      window.clearTimeout(tooltipTimer);
      tooltip.hidden = true;
    };

    trigger.addEventListener("mouseenter", showTooltipAfterDelay);
    trigger.addEventListener("mouseleave", hideTooltip);
    trigger.addEventListener("focus", showTooltipAfterDelay);
    trigger.addEventListener("blur", hideTooltip);
  }

  async function fetchDocument(path) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
    }
    return new DOMParser().parseFromString(await response.text(), "text/html");
  }

  async function loadViewFragment(viewName, view) {
    const documentFragment = await fetchDocument(view.fragment);
    if (!documentFragment.body.querySelector("main.page")) {
      throw new Error(`The ${viewName} page does not contain a main.page element.`);
    }

    const viewRoot = document.createElement("div");
    viewRoot.className = "branch-admin-view";
    viewRoot.dataset.adminView = viewName;
    for (const child of documentFragment.body.childNodes) {
      if (child.nodeType === Node.ELEMENT_NODE && child.matches("script, link")) {
        continue;
      }
      viewRoot.append(document.importNode(child, true));
    }
    return viewRoot;
  }

  function loadStylesheet(path) {
    if (activeStylesheetPath === path) {
      return Promise.resolve();
    }

    const nextStylesheet = document.createElement("link");
    nextStylesheet.rel = "stylesheet";
    nextStylesheet.href = path;
    nextStylesheet.id = "branchAdminPageStyles";

    return new Promise((resolve, reject) => {
      nextStylesheet.addEventListener("load", () => {
        if (activeStylesheet) {
          activeStylesheet.remove();
        }
        activeStylesheet = nextStylesheet;
        activeStylesheetPath = path;
        resolve();
      }, { once: true });
      nextStylesheet.addEventListener("error", () => {
        nextStylesheet.remove();
        reject(new Error(`Could not load stylesheet ${path}.`));
      }, { once: true });
      document.head.append(nextStylesheet);
    });
  }

  function captureGlobalFunctions() {
    const functions = new Map();
    for (const name of Object.getOwnPropertyNames(window)) {
      if (typeof window[name] === "function") {
        functions.set(name, window[name]);
      }
    }
    return functions;
  }

  function collectChangedFunctions(previousFunctions) {
    const changedFunctions = new Map();
    for (const name of Object.getOwnPropertyNames(window)) {
      if (typeof window[name] === "function" && previousFunctions.get(name) !== window[name]) {
        changedFunctions.set(name, window[name]);
      }
    }
    return changedFunctions;
  }

  function restoreViewFunctions(functions) {
    for (const [name, handler] of functions) {
      window[name] = handler;
    }
  }

  function loadScript(path) {
    return new Promise((resolve, reject) => {
      const previousFunctions = captureGlobalFunctions();
      const script = document.createElement("script");
      script.src = path;
      script.addEventListener("load", () => {
        resolve(collectChangedFunctions(previousFunctions));
      }, { once: true });
      script.addEventListener("error", () => {
        script.remove();
        reject(new Error(`Could not load script ${path}.`));
      }, { once: true });
      document.body.append(script);
    });
  }

  function setActiveNavigation(viewName) {
    for (const link of sidebarMount.querySelectorAll("[data-admin-view]")) {
      const isActive = link.dataset.adminView === viewName;
      link.classList.toggle("active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    }
  }

  async function renderView(viewName) {
    const view = views[viewName];
    if (!view) {
      throw new Error(`Unknown branch-admin view: ${viewName}.`);
    }
    if (viewMount.dataset.activeView === viewName) {
      return;
    }

    viewMount.setAttribute("aria-busy", "true");
    setStatus("");

    try {
      let cachedView = cachedViews.get(viewName);
      if (!cachedView) {
        cachedView = {
          root: await loadViewFragment(viewName, view),
          functions: new Map(),
          scriptLoaded: false,
        };
        cachedViews.set(viewName, cachedView);
      }

      if (view.stylesheet) {
        await loadStylesheet(view.stylesheet);
      } else if (activeStylesheet) {
        activeStylesheet.remove();
        activeStylesheet = null;
        activeStylesheetPath = "";
      }
      if (window.AngelizApiData && viewName !== "support-center") {
        await window.AngelizApiData.preload("branch", viewName);
      }
      viewMount.replaceChildren(cachedView.root);
      if (view.script && !cachedView.scriptLoaded) {
        cachedView.functions = await loadScript(view.script);
        cachedView.scriptLoaded = true;
      }
      restoreViewFunctions(cachedView.functions);
      if (view.onShow && typeof window[view.onShow] === "function") {
        await window[view.onShow]();
      }
      viewMount.dataset.activeView = viewName;
      setActiveNavigation(viewName);
      window.scrollTo(0, 0);
    } catch (error) {
      console.error("Branch-admin view navigation failed:", error);
      setStatus(error.message || "The requested branch-admin page could not be loaded.");
    } finally {
      viewMount.setAttribute("aria-busy", "false");
    }
  }

  function navigateToView(viewName) {
    navigationQueue = navigationQueue.then(() => renderView(viewName)).catch(error => {
      console.error("Branch-admin navigation failed:", error);
      setStatus(error.message || "Branch-admin navigation failed.");
    });
    return navigationQueue;
  }

  document.getElementById("branchAdminCommunicationButton").addEventListener("click", () => {
    const viewName = "communication";
    if (window.location.hash !== `#${viewName}`) {
      window.history.pushState({ view: viewName }, "", `#${viewName}`);
    }
    navigateToView(viewName);
    if (mobileBreakpoint.matches) {
      setMobileOpen(false);
    }
  });

  sidebarMount.addEventListener("click", event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const quickAction = target.closest(".ac-quick-btn");
    if (quickAction && sidebarMount.contains(quickAction)) {
      const action = quickAction.dataset.action;
      const actions = {
        "custom-cake": {
          view: "order-management",
          message: "Opening Create Cake Order…",
        },
        "request-stock": {
          view: "branch-inventory",
          message: "Opening Request Stock…",
        },
        "submit-report": {
          view: "daily-branch-report",
          message: "Opening Daily Branch Report…",
        },
      };
      const selectedAction = actions[action];
      if (!selectedAction) {
        showToast("Quick action unavailable.");
        return;
      }

      const viewName = selectedAction.view;
      if (window.location.hash !== `#${viewName}`) {
        window.history.pushState({ view: viewName }, "", `#${viewName}`);
      }
      showToast(selectedAction.message);
      navigateToView(viewName).then(() => {
        if (viewMount.dataset.activeView === viewName) {
          document.dispatchEvent(new CustomEvent("ac:quickaction", { detail: { action } }));
        }
      });
      if (mobileBreakpoint.matches) {
        setMobileOpen(false);
      }
      return;
    }

    const link = target.closest("a[data-admin-view]");
    if (!link || !sidebarMount.contains(link)) {
      return;
    }
    event.preventDefault();
    const viewName = link.dataset.adminView;
    if (window.location.hash !== `#${viewName}`) {
      window.history.pushState({ view: viewName }, "", `#${viewName}`);
    }
    navigateToView(viewName);
    if (mobileBreakpoint.matches) {
      setMobileOpen(false);
    }
  });

  window.addEventListener("popstate", () => {
    const viewName = window.location.hash.slice(1) || "dashboard";
    navigateToView(views[viewName] ? viewName : "dashboard");
  });

  const initialView = window.location.hash.slice(1) || "dashboard";
  navigateToView(views[initialView] ? initialView : "dashboard");
})();
