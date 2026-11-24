"use strict";

/* Add future injected views here with their fragment, assets, initializer, and lifecycle hooks. */
(async function initializeStorefront() {
  const mount = document.getElementById("storefrontBodyMount");
  const profileTrigger = document.getElementById("profileIcon");
  if (!mount || !profileTrigger) throw new Error("The storefront body mount or profile button is missing.");

  const fragmentViews = {
    profile: {
      event: "storefront:show-profile",
      label: "the customer profile",
      fragment: { path: "html/profile.html", selector: "main#storefrontProfile" },
      stylesheet: { path: "css/profile.css", id: "storefrontProfileStylesheet" },
      script: {
        path: "js/profile.js",
        id: "storefrontProfileScript",
        initializer: "initializeProfileFragment"
      },
      errorMessage: "The customer profile could not be loaded. Please try again.",
      toggleToPrevious: true,
      backFallbackHash: "#home",
      homeNavigation: "restore",
      onEnter(root) {
        root.querySelector("h1")?.focus();
        profileTrigger.setAttribute("aria-expanded", "true");
        profileTrigger.setAttribute("aria-label", "Close customer profile");
      },
      onError: closeProfileTrigger,
      onLeave: closeProfileTrigger
    },
    "product-detail": {
      event: "storefront:show-product-detail",
      label: "the product details",
      fragment: { path: "html/product-detail.html", selector: "main#storefrontProductDetail" },
      stylesheet: { path: "css/product-detail.css", id: "storefrontProductDetailStylesheet" },
      script: {
        path: "js/product-detail.js",
        id: "storefrontProductDetailScript",
        initializer: "initializeProductDetailFragment"
      },
      errorMessage: "The product details could not be loaded. Please try again.",
      homeNavigation: "restore",
      backFallbackHash: "#menu",
      canOpen(activeView) {
        return activeView === "home";
      },
      validate(detail) {
        if (!detail?.product || typeof detail.product.id !== "string" || !detail.product.details) {
          throw new TypeError("The selected product is missing static detail data.");
        }
        if (typeof detail.imageUrl !== "string" || !detail.imageUrl) {
          throw new TypeError("The selected product image is missing.");
        }
      },
      initialize(root, detail) {
        window.initializeProductDetailFragment(root, detail.product, detail.imageUrl);
      }
    },
    "customization-wizard": {
      event: "storefront:show-customization-wizard",
      label: "the cake customization wizard",
      fragment: { path: "html/customization.html", selector: "main#storefrontCustomizationWizard" },
      stylesheet: { path: "css/customization.css", id: "storefrontCustomizationStylesheet" },
      script: {
        path: "js/customization.js",
        id: "storefrontCustomizationScript",
        initializer: "initializeCustomizationWizard"
      },
      errorMessage: "The cake customization wizard could not be loaded. Please try again.",
      homeNavigation: "restore",
      backFallbackHash: "#customize",
      canOpen(activeView) {
        return activeView === "home";
      }
    },
    "service-package": {
      event: "storefront:show-service-package",
      label: "the service package",
      fragment: { path: "html/service-package.html", selector: "main#storefrontServicePackage" },
      stylesheet: { path: "css/service-package.css", id: "storefrontServicePackageStylesheet" },
      script: {
        path: "js/service-package.js",
        id: "storefrontServicePackageScript",
        initializer: "initializeServicePackageFragment"
      },
      errorMessage: "The package details could not be loaded. Please try again.",
      homeNavigation: "restore",
      backFallbackHash: "#services",
      canOpen(activeView) {
        return activeView === "home";
      },
      validate(detail) {
        const offering = detail?.packageOffering;
        const hasProductItems = Array.isArray(offering?.itemIds) && offering.itemIds.length > 0;
        const hasFixedInclusions = Array.isArray(offering?.inclusions) && offering.inclusions.length > 0;
        if (
          !offering
          || typeof offering.id !== "string"
          || typeof offering.title !== "string"
          || (!hasProductItems && !hasFixedInclusions)
          || !Array.isArray(detail.products)
        ) {
          throw new TypeError("The selected package is missing static package data.");
        }
        if (typeof detail.imageUrl !== "string" || !detail.imageUrl) {
          throw new TypeError("The selected package image is missing.");
        }
      },
      initialize(root, detail) {
        window.initializeServicePackageFragment(root, detail.packageOffering, detail.products, detail.imageUrl);
      }
    },
    login: {
      event: "storefront:show-login",
      label: "the sign-in page",
      fragment: { path: "html/login.html", selector: "main#storefrontLogin" },
      stylesheet: { path: "css/auth-ui.css", id: "storefrontAuthStylesheet" },
      script: {
        path: "js/auth.js",
        id: "storefrontAuthScript",
        initializer: "initializeLoginFragment"
      },
      errorMessage: "The sign-in page could not be loaded. Please try again.",
      toggleToPrevious: true,
      backFallbackHash: "#home",
      homeNavigation: "restore"
    },
    register: {
      event: "storefront:show-register",
      label: "the registration page",
      fragment: { path: "html/register.html", selector: "main#storefrontRegister" },
      stylesheet: { path: "css/auth-ui.css", id: "storefrontAuthStylesheet" },
      script: {
        path: "js/auth.js",
        id: "storefrontAuthScript",
        initializer: "initializeRegisterFragment"
      },
      errorMessage: "The registration page could not be loaded. Please try again.",
      backFallbackHash: "#home",
      homeNavigation: "restore"
    },
    checkout: {
      event: "storefront:show-checkout",
      label: "checkout",
      fragment: { path: "html/checkout.html", selector: "main#storefrontCheckout" },
      stylesheet: { path: "css/checkout.css", id: "storefrontCheckoutStylesheet" },
      script: {
        path: "js/checkout.js",
        id: "storefrontCheckoutScript",
        initializer: "initializeCheckoutFragment"
      },
      errorMessage: "Checkout could not be loaded. Please try again.",
      homeNavigation: "restore",
      backFallbackHash: "#menu",
      canOpen(activeView) {
        return activeView === "product-detail";
      },
      validate(detail) {
        if (!detail?.product || typeof detail.product.id !== "string" || typeof detail.product.name !== "string") {
          throw new TypeError("The selected product is missing checkout information.");
        }
        if (typeof detail.imageUrl !== "string" || !detail.imageUrl) {
          throw new TypeError("The selected product image is missing.");
        }
      },
      initialize(root, detail) {
        window.initializeCheckoutFragment(root, detail.product, detail.imageUrl);
      }
    }
  };

  let activeView = "home";
  let activeViewDetail = null;
  let homepageMain = null;
  let viewRequest = null;
  const viewHistory = [];
  const stylesheetPromises = new Map();
  const scriptPromises = new Map();

  function closeProfileTrigger() {
    profileTrigger.setAttribute("aria-expanded", "false");
    profileTrigger.setAttribute("aria-label", "Open customer profile");
  }

  function announceViewChange() {
    document.dispatchEvent(new CustomEvent("storefront:view-changed", {
      detail: { view: activeView }
    }));
  }

  function normalizeAssetPaths(root) {
    root.querySelectorAll("[src], [href], [poster]").forEach(element => {
      ["src", "href", "poster"].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value && value.startsWith("../assets/")) {
          element.setAttribute(attribute, value.replace(/^\.\.\//, ""));
        }
      });
    });
  }

  async function fetchMain(path, selector) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`${path} request failed with status ${response.status}.`);

    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    const main = page.querySelector(selector);
    if (!main) throw new Error(`${path} is missing ${selector}.`);

    const importedMain = document.importNode(main, true);
    normalizeAssetPaths(importedMain);
    return importedMain;
  }

  function loadStylesheet(asset) {
    if (stylesheetPromises.has(asset.id)) return stylesheetPromises.get(asset.id);
    const existing = document.getElementById(asset.id);
    if (existing) return Promise.resolve(existing);

    const stylesheet = document.createElement("link");
    stylesheet.id = asset.id;
    stylesheet.rel = "stylesheet";
    stylesheet.href = asset.path;

    const request = new Promise((resolve, reject) => {
      stylesheet.addEventListener("load", () => resolve(stylesheet), { once: true });
      stylesheet.addEventListener("error", () => reject(new Error(`Could not load ${asset.path}.`)), { once: true });
      document.head.append(stylesheet);
    }).catch(error => {
      stylesheet.remove();
      stylesheetPromises.delete(asset.id);
      throw error;
    });

    stylesheetPromises.set(asset.id, request);
    return request;
  }

  function loadScript(asset) {
    if (typeof window[asset.initializer] === "function") return Promise.resolve();
    if (scriptPromises.has(asset.id)) return scriptPromises.get(asset.id);

    const script = document.createElement("script");
    script.id = asset.id;
    script.src = asset.path;
    const request = new Promise((resolve, reject) => {
      script.addEventListener("load", () => resolve(), { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${asset.path}.`)), { once: true });
      document.body.append(script);
    }).then(() => {
      if (typeof window[asset.initializer] !== "function") {
        throw new Error(`${asset.path} did not expose ${asset.initializer}.`);
      }
    }).catch(error => {
      script.remove();
      scriptPromises.delete(asset.id);
      throw error;
    });

    scriptPromises.set(asset.id, request);
    return request;
  }

  function showViewError(name, error) {
    const view = fragmentViews[name];
    console.error(`Could not display ${view.label}.`, error);
    activeView = "home";
    activeViewDetail = null;
    viewHistory.length = 0;
    mount.setAttribute("aria-busy", "false");
    if (homepageMain) mount.replaceChildren(homepageMain);
    announceViewChange();

    const status = document.createElement("p");
    status.setAttribute("role", "alert");
    status.textContent = view.errorMessage;
    mount.append(status);

    if (view.stylesheet) {
      document.getElementById(view.stylesheet.id)?.remove();
      stylesheetPromises.delete(view.stylesheet.id);
    }
    view.onError?.();
  }

  async function injectView(name, detail, recordHistory = true) {
    const view = fragmentViews[name];
    if (!view) throw new RangeError(`Unknown storefront view: ${name}`);

    try {
      view.validate?.(detail);
      mount.setAttribute("aria-busy", "true");

      const assets = [
        fetchMain(view.fragment.path, view.fragment.selector),
        view.stylesheet ? loadStylesheet(view.stylesheet) : Promise.resolve(),
        view.script ? loadScript(view.script) : Promise.resolve()
      ];
      const [fragment] = await Promise.all(assets);
      const previousView = {
        name: activeView,
        detail: activeViewDetail,
        hash: window.location.hash || "#home",
        scrollY: window.scrollY
      };
      fragmentViews[activeView]?.onLeave?.();
      mount.replaceChildren(fragment);
      window.scrollTo({ top: 0, behavior: "instant" });

      if (view.initialize) view.initialize(fragment, detail);
      else if (view.script) window[view.script.initializer](fragment, detail);
      view.onEnter?.(fragment, detail);
      if (recordHistory) viewHistory.push(previousView);
      activeView = name;
      activeViewDetail = detail;
      mount.setAttribute("aria-busy", "false");
      announceViewChange();
    } catch (error) {
      showViewError(name, error);
    }
  }

  function restoreHomepage(hash, scrollY) {
    if (!homepageMain) throw new Error("The original storefront homepage is unavailable.");
    fragmentViews[activeView]?.onLeave?.();
    mount.replaceChildren(homepageMain);
    activeView = "home";
    activeViewDetail = null;
    viewHistory.length = 0;
    mount.setAttribute("aria-busy", "false");
    const destinationHash = hash || "#home";
    window.location.hash = destinationHash;
    if (Number.isFinite(scrollY)) {
      window.scrollTo({ top: scrollY, behavior: "instant" });
    } else {
      document.getElementById(destinationHash.slice(1))?.scrollIntoView();
    }
    announceViewChange();
  }

  function restorePreviousView(fallbackHash) {
    if (viewRequest) return;
    const previousView = viewHistory.pop();
    if (!previousView || previousView.name === "home") {
      restoreHomepage(previousView?.hash || fallbackHash, previousView?.scrollY);
      return;
    }

    viewRequest = injectView(previousView.name, previousView.detail, false).finally(() => {
      viewRequest = null;
    });
  }

  Object.entries(fragmentViews).forEach(([name, view]) => {
    document.addEventListener(view.event, event => {
      if (view.toggleToPrevious && activeView === name) {
        restorePreviousView(view.backFallbackHash);
        return;
      }
      if (view.canOpen && !view.canOpen(activeView, event.detail)) return;
      if (viewRequest) return;

      viewRequest = injectView(name, event.detail).finally(() => {
        viewRequest = null;
      });
    });
  });

  document.addEventListener("click", event => {
    if (!(event.target instanceof Element) || activeView === "home") return;
    const view = fragmentViews[activeView];
    const backLink = event.target.closest("[data-storefront-back]");
    if (backLink) {
      event.preventDefault();
      restorePreviousView(view.backFallbackHash || "#home");
      return;
    }
    const hashLink = event.target.closest('a[href^="#"]');
    const destinationHash = hashLink?.getAttribute("href");
    if (!destinationHash) return;

    event.preventDefault();
    if (view.homeNavigation === "restore") {
      restoreHomepage(destinationHash);
    } else {
      window.location.href = `index.html${destinationHash}`;
    }
  });

  try {
    mount.setAttribute("aria-busy", "true");
    homepageMain = await fetchMain("html/homepage.html", "main#storefrontHome");
    mount.replaceChildren(homepageMain);
    mount.setAttribute("aria-busy", "false");
  } catch (error) {
    console.error("Could not inject the storefront homepage.", error);
    const status = document.createElement("p");
    status.setAttribute("role", "alert");
    status.textContent = "The homepage could not be loaded. Please reload the page.";
    mount.replaceChildren(status);
    mount.setAttribute("aria-busy", "false");
    return;
  }

  try {
    const homepageInteractions = { path: "index.js", id: "storefrontInteractionsScript" };
    const script = document.createElement("script");
    script.id = homepageInteractions.id;
    script.src = homepageInteractions.path;
    await new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Could not load ${homepageInteractions.path}.`)), { once: true });
      document.body.append(script);
    });
  } catch (error) {
    console.error("Could not initialize storefront interactions.", error);
    const status = document.createElement("p");
    status.setAttribute("role", "alert");
    status.textContent = "Some homepage interactions could not be loaded. Please reload the page.";
    mount.append(status);
  }
})();
