"use strict";

/* Homepage content is embedded locally so the storefront works without API data. */
const storefront = {
  categories: [
    { label: "Cakes", productCategories: ["Cakes"] }
  ],
  heroSlides: [
    { name: "Signature Celebration Cake", image: "cakes.jpg" },
    { name: "Chocolate Drip Cake", image: "signature-cake.jpg" },
    { name: "Cupcake Collection", image: "chocolate-cake.jpg" }
  ],
  products: [
    {
      id: "signature-cake",
      name: "Signature Celebration Cake",
      category: "Cakes",
      price: "₱1,850.00",
      image: "signature-cake.jpg",
      details: {
        description: "",
        classification: "Celebration cake",
        ingredients: "Contact the bakery for the current ingredient list.",
        allergens: "Contact the bakery to confirm allergen information before ordering.",
        customization: [
          { label: "Occasion", value: "Discuss with the bakery" },
          { label: "Theme", value: "Discuss with the bakery" },
          { label: "Color", value: "Discuss with the bakery" },
          { label: "Layer", value: "Discuss with the bakery" },
          { label: "Tier", value: "Discuss with the bakery" },
          { label: "Size (per tier)", value: "Discuss with the bakery" },
          { label: "Flavor", value: "Discuss with the bakery" },
          { label: "Frosting", value: "Discuss with the bakery" }
        ],
        reviews: []
      }
    },
    { id: "bento-cake", name: "Personalized Bento Cake", category: "Cakes", price: "₱650.00", image: "chocolate-cake.jpg" },
    { id: "berry-tart", name: "Fresh Berry Tart", category: "Pastries", price: "₱420.00", image: "pastry-selection.jpg" },
    { id: "chocolate-cup", name: "Chocolate Dessert Cup", category: "Desserts", price: "₱180.00", image: "chocolate-dessert.jpg" },
    { id: "artisan-bread", name: "Artisan Bread", category: "Foods", price: "Ask for pricing", image: "artisan-bread.jpg" },
    { id: "cafe-meal", name: "Cafe Meal", category: "Meals", price: "Ask for pricing", image: "meals.jpg" },
    { id: "signature-drink", name: "Signature Cafe Drink", category: "Beverages", price: "Ask for pricing", image: "coffee.jpg" },
    { id: "catering-package", name: "Celebration Catering", category: "Catering", price: "Ask for pricing", image: "catering.jpg" }
  ],
  favorites: ["signature-cake", "berry-tart"],
  services: [
    {
      id: "made-to-order",
      title: "Made to Order",
      description: "A thoughtful selection of handcrafted favorites, prepared fresh for your celebration.",
      image: "signature-cake.jpg",
      price: "To be confirmed",
      itemIds: ["signature-cake", "bento-cake", "berry-tart"]
    }
  ],
  gallery: [
    { name: "Signature Celebration Cake", category: "Cakes", image: "signature-cake.jpg" },
    { name: "Berry Tart", category: "Pastries", image: "pastry-selection.jpg" },
    { name: "Chocolate Dessert", category: "Desserts", image: "chocolate-dessert.jpg" },
    { name: "Artisan Bread", category: "Bakery", image: "artisan-bread.jpg" },
    { name: "Cafe Favorites", category: "Beverages", image: "coffee.jpg" },
    { name: "Celebration Catering", category: "Catering", image: "catering.jpg" }
  ],
  feedbacks: [
    { name: "test ting", comment: "testing testing", rating: 3 }
  ],
  location: {
    name: "Cabangan Branch",
    description: "Main Hub & Production Studio, Cabangan, Legazpi City",
    image: "location.jpg"
  },
  about: {
    name: "Angeliz Cakes Legazpi",
    description: "Owned and managed by Mrs. Maria Mae Angela Guiriba, Angeliz Cakes brings sweetness to every milestone in Albay with handcrafted custom cakes, delicate pastries, and delicious savory catering.",
    hours: "Mon-Sun: 8am - 8pm",
    availability: "Dine-in, Take-out & Online Delivery",
    location: "Legazpi City, Albay, Philippines",
    image: "bakery-about.jpg"
  },
  contact: {
    phone: "0917-187-8820",
    email: "mae_guiriba@yahoo.com",
    address: "Rizal Street, Legazpi City, Albay"
  }
};

if (!window.storefrontFavorites) {
  const favoritesStorageKey = "angeliz_header_favorites";
  const productIds = new Set(storefront.products.map(product => product.id));
  let standaloneFavorites = [...storefront.favorites];

  try {
    const saved = localStorage.getItem(favoritesStorageKey);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new TypeError("Saved favorites must be an array.");
      standaloneFavorites = [...new Set(parsed.filter(id => typeof id === "string" && productIds.has(id)))];
    }
  } catch (error) {
    console.error("Could not read saved customer favorites.", error);
    standaloneFavorites = [];
  }

  window.storefrontFavorites = Object.freeze({
    isFavorite(productId) {
      return standaloneFavorites.includes(productId);
    },
    toggle(productId) {
      if (!productIds.has(productId)) throw new RangeError(`Unknown favorite product ID: ${productId}`);
      standaloneFavorites = standaloneFavorites.includes(productId)
        ? standaloneFavorites.filter(id => id !== productId)
        : [...standaloneFavorites, productId];
      try {
        localStorage.setItem(favoritesStorageKey, JSON.stringify(standaloneFavorites));
      } catch (error) {
        console.error("Could not save customer favorites.", error);
      }
      document.dispatchEvent(new CustomEvent("storefront:favorites-changed", {
        detail: { favorites: [...standaloneFavorites] }
      }));
      return standaloneFavorites.includes(productId);
    }
  });
}

/* Render the page's static menu, services, gallery, and business details. */
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderHomepage() {
  const categoryTabs = document.getElementById("menuCategoryTabs");
  const menuProducts = document.getElementById("menuProducts");
  const serviceRail = document.getElementById("serviceRail");
  const gallery = document.getElementById("gallerySixGrid");
  const locationCard = document.getElementById("locationCard");
  const testimonialCards = document.getElementById("testimonialCards");
  const testimonialStatus = document.getElementById("testimonialStatus");

  if (
    !categoryTabs
    || !menuProducts
    || !serviceRail
    || !gallery
    || !locationCard
    || !testimonialCards
    || !testimonialStatus
  ) {
    throw new Error("A homepage content container is missing.");
  }

  function renderMenuCategory(categoryIndex) {
    const category = storefront.categories[categoryIndex];
    if (!category) throw new RangeError(`Unknown menu category index: ${categoryIndex}`);

    categoryTabs.querySelectorAll(".menu-category-tab").forEach((tab, index) => {
      const selected = index === categoryIndex;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    menuProducts.setAttribute("aria-labelledby", `menu-tab-${categoryIndex}`);
    menuProducts.innerHTML = storefront.products
      .filter(product => category.productCategories.includes(product.category))
      .slice(0, 1)
      .map(product => `
        <article class="menu-card home-product-card">
          <div class="home-product-image">
            <img src="../assets/${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy">
          </div>
          <div class="home-product-copy">
            <h3 class="card-title">${escapeHTML(product.name)}</h3>
            <p class="card-desc">${escapeHTML(product.price)}</p>
            <button class="home-product-view" type="button" data-view-product="${escapeHTML(product.id)}">View</button>
          </div>
        </article>
      `).join("") || '<p class="catalog-status" role="status">No menu items are available in this category.</p>';
  }

  categoryTabs.innerHTML = storefront.categories.map((category, index) => `
    <button class="menu-category-tab${index === 0 ? " is-active" : ""}" id="menu-tab-${index}"
            type="button" role="tab" aria-controls="menuProducts" aria-selected="${index === 0}"
            tabindex="${index === 0 ? "0" : "-1"}" data-menu-category="${index}">
      ${escapeHTML(category.label)}
    </button>
  `).join("");
  categoryTabs.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest(".menu-category-tab");
    if (tab) renderMenuCategory(Number(tab.dataset.menuCategory));
  });
  categoryTabs.addEventListener("keydown", event => {
    if (!(event.target instanceof Element) || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = [...categoryTabs.querySelectorAll(".menu-category-tab")];
    const currentIndex = tabs.indexOf(event.target.closest(".menu-category-tab"));
    if (currentIndex < 0) return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    renderMenuCategory(nextIndex);
  });
  renderMenuCategory(0);

  async function loadStandaloneProductDetail(product, imageUrl) {
    const homepage = document.getElementById("storefrontHome");
    const response = await fetch("product-detail.html");
    if (!response.ok) throw new Error(`product-detail.html request failed with status ${response.status}.`);

    const documentFragment = new DOMParser().parseFromString(await response.text(), "text/html");
    const detailMain = documentFragment.querySelector("main#storefrontProductDetail");
    if (!homepage || !detailMain) throw new Error("The product detail fragment is missing.");
    const importedMain = document.importNode(detailMain, true);
    importedMain.querySelector("[data-storefront-back]").href = "../index.html#menu";

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "../css/product-detail.css";
    const stylesheetPromise = new Promise((resolve, reject) => {
      stylesheet.addEventListener("load", resolve, { once: true });
      stylesheet.addEventListener("error", () => reject(new Error("Could not load css/product-detail.css.")), { once: true });
      document.head.append(stylesheet);
    });

    const script = document.createElement("script");
    script.src = "../js/product-detail.js";
    const scriptPromise = new Promise((resolve, reject) => {
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error("Could not load js/product-detail.js.")), { once: true });
      document.body.append(script);
    });
    await Promise.all([stylesheetPromise, scriptPromise]);

    if (typeof window.initializeProductDetailFragment !== "function") {
      throw new Error("js/product-detail.js did not expose initializeProductDetailFragment.");
    }
    homepage.replaceWith(importedMain);
    window.initializeProductDetailFragment(importedMain, product, imageUrl);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  // Keep the standalone homepage usable without loading checkout assets until they are requested.
  async function loadStandaloneCheckout(product, imageUrl) {
    const productDetail = document.getElementById("storefrontProductDetail");
    const response = await fetch("checkout.html");
    if (!response.ok) throw new Error(`checkout.html request failed with status ${response.status}.`);

    const documentFragment = new DOMParser().parseFromString(await response.text(), "text/html");
    const checkoutMain = documentFragment.querySelector("main#storefrontCheckout");
    if (!productDetail || !checkoutMain) throw new Error("The checkout fragment is missing.");
    const importedMain = document.importNode(checkoutMain, true);
    importedMain.querySelector("[data-storefront-back]").href = "../index.html#menu";

    const stylesheetId = "standaloneCheckoutStylesheet";
    if (!document.getElementById(stylesheetId)) {
      const stylesheet = document.createElement("link");
      stylesheet.id = stylesheetId;
      stylesheet.rel = "stylesheet";
      stylesheet.href = "../css/checkout.css";
      await new Promise((resolve, reject) => {
        stylesheet.addEventListener("load", resolve, { once: true });
        stylesheet.addEventListener("error", () => reject(new Error("Could not load css/checkout.css.")), { once: true });
        document.head.append(stylesheet);
      });
    }

    if (typeof window.initializeCheckoutFragment !== "function") {
      const script = document.createElement("script");
      script.src = "../js/checkout.js";
      await new Promise((resolve, reject) => {
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", () => reject(new Error("Could not load js/checkout.js.")), { once: true });
        document.body.append(script);
      });
    }

    if (typeof window.initializeCheckoutFragment !== "function") {
      throw new Error("js/checkout.js did not expose initializeCheckoutFragment.");
    }
    window.initializeCheckoutFragment(importedMain, product, imageUrl);
    productDetail.replaceWith(importedMain);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  document.addEventListener("storefront:show-checkout", event => {
    const detail = event.detail;
    if (!detail?.product || typeof detail.imageUrl !== "string" || !detail.imageUrl) {
      const error = new TypeError("The selected product is missing checkout information.");
      console.error("Could not display checkout.", error);
      return;
    }
    loadStandaloneCheckout(detail.product, detail.imageUrl).catch(error => {
      console.error("Could not display checkout.", error);
      const status = document.createElement("p");
      status.setAttribute("role", "alert");
      status.textContent = "Checkout could not be loaded. Please reload the page.";
      document.getElementById("storefrontProductDetail")?.prepend(status);
    });
  });

  menuProducts.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const opener = event.target.closest("[data-view-product]");
    if (!opener) return;
    const product = storefront.products.find(item => item.id === opener.dataset.viewProduct);
    if (!product) throw new RangeError(`Unknown product ID: ${opener.dataset.viewProduct}`);
    const image = opener.closest(".home-product-card")?.querySelector(".home-product-image img");
    if (!image) throw new Error(`Product ${product.id} is missing its menu image.`);
    loadStandaloneProductDetail(product, image.src).catch(error => {
      console.error("Could not display the product details.", error);
      const status = document.createElement("p");
      status.setAttribute("role", "alert");
      status.textContent = "The product details could not be loaded. Please reload the page.";
      document.getElementById("storefrontHome")?.prepend(status);
    });
  });

  async function loadStandaloneServicePackage(packageOffering, imageUrl) {
    const homepage = document.getElementById("storefrontHome");
    const response = await fetch("service-package.html");
    if (!response.ok) throw new Error(`service-package.html request failed with status ${response.status}.`);
    const fragmentDocument = new DOMParser().parseFromString(await response.text(), "text/html");
    const packageMain = fragmentDocument.querySelector("main#storefrontServicePackage");
    if (!homepage || !packageMain) throw new Error("The service package fragment is missing.");

    const importedMain = document.importNode(packageMain, true);
    importedMain.querySelector("[data-storefront-back]").href = "../index.html#services";
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "../css/service-package.css";
    const stylesheetPromise = new Promise((resolve, reject) => {
      stylesheet.addEventListener("load", resolve, { once: true });
      stylesheet.addEventListener("error", () => reject(new Error("Could not load css/service-package.css.")), { once: true });
      document.head.append(stylesheet);
    });

    if (typeof window.initializeServicePackageFragment !== "function") {
      const script = document.createElement("script");
      script.src = "../js/service-package.js";
      await new Promise((resolve, reject) => {
        script.addEventListener("load", resolve, { once: true });
        script.addEventListener("error", () => reject(new Error("Could not load js/service-package.js.")), { once: true });
        document.body.append(script);
      });
    }
    await stylesheetPromise;
    if (typeof window.initializeServicePackageFragment !== "function") {
      throw new Error("js/service-package.js did not expose initializeServicePackageFragment.");
    }
    homepage.replaceWith(importedMain);
    window.initializeServicePackageFragment(importedMain, packageOffering, storefront.products, imageUrl);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  serviceRail.innerHTML = storefront.services.map(service => `
    <article class="home-service-card">
      <div class="home-package-image">
        <img src="../assets/${escapeHTML(service.image)}" alt="${escapeHTML(service.title)}" loading="lazy">
      </div>
      <div class="home-package-copy">
        <span class="home-package-label">What We Offer</span>
        <h3>${escapeHTML(service.title)}</h3>
        <p>${escapeHTML(service.description)}</p>
        <button class="home-package-view" type="button" data-view-package="${escapeHTML(service.id)}">View</button>
      </div>
    </article>
  `).join("");
  serviceRail.classList.toggle("is-single-package", storefront.services.length === 1);
  const serviceRailControls = serviceRail.parentElement?.querySelector("[data-rail-controls]");
  if (serviceRailControls) serviceRailControls.hidden = storefront.services.length < 2;
  serviceRail.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const opener = event.target.closest("[data-view-package]");
    if (!opener) return;
    const packageOffering = storefront.services.find(service => service.id === opener.dataset.viewPackage);
    if (!packageOffering) throw new RangeError(`Unknown package offering: ${opener.dataset.viewPackage}`);
    const image = opener.closest(".home-service-card")?.querySelector(".home-package-image img");
    if (!image) throw new Error(`Package offering ${packageOffering.id} is missing its image.`);
    loadStandaloneServicePackage(packageOffering, image.src).catch(error => {
      console.error("Could not display the service package.", error);
      const status = document.createElement("p");
      status.setAttribute("role", "alert");
      status.textContent = "The package details could not be loaded. Please reload the page.";
      document.getElementById("storefrontHome")?.prepend(status);
    });
  });

  const galleryPage = `
    <div class="gallery-page">
      ${storefront.gallery.map((item, index) => `
        <div class="gallery-slot interactive-card slot-size-${index + 1}">
          <img src="../assets/${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="gallery-slot-img" loading="lazy">
          <div class="gallery-overlay">
            <span class="gallery-cat-label">${escapeHTML(item.name)}</span>
            <small>${escapeHTML(item.category)}</small>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  gallery.innerHTML = `<div class="gallery-track">${galleryPage}${galleryPage}</div>`;

  locationCard.innerHTML = `
    <article class="branch-card interactive-card">
      <div class="branch-img-wrap">
        <img src="../assets/${escapeHTML(storefront.location.image)}" alt="${escapeHTML(storefront.location.name)}">
      </div>
      <div class="branch-content">
        <h3>${escapeHTML(storefront.location.name)}</h3>
        <p>${escapeHTML(storefront.location.description)}</p>
      </div>
      <button class="btn btn-pink-hero full-width view-map-btn" type="button">View Map</button>
    </article>
  `;

  document.getElementById("aboutName").textContent = storefront.about.name;
  document.getElementById("aboutDescription").textContent = storefront.about.description;
  document.getElementById("aboutHours").textContent = storefront.about.hours;
  document.getElementById("aboutAvailability").textContent = storefront.about.availability;
  document.getElementById("aboutLocation").textContent = storefront.about.location;
  const aboutImage = document.getElementById("aboutImage");
  aboutImage.src = `../assets/${storefront.about.image}`;
  aboutImage.alt = `${storefront.about.name} bakery`;

  document.getElementById("contactCards").innerHTML = `
    <div class="contact-card-item">
      <div class="contact-icon" aria-hidden="true"><i class="fa-solid fa-headset"></i></div>
      <div><h4>Customer Support Hotline</h4><p>${escapeHTML(storefront.contact.phone)}</p></div>
    </div>
    <div class="contact-card-item">
      <div class="contact-icon" aria-hidden="true"><i class="fa-regular fa-paper-plane"></i></div>
      <div><h4>Inquiries &amp; Partnerships</h4><p>${escapeHTML(storefront.contact.email)}</p></div>
    </div>
    <div class="contact-card-item">
      <div class="contact-icon" aria-hidden="true"><i class="fa-solid fa-map-location-dot"></i></div>
      <div><h4>Main Hub &amp; Studio</h4><p>${escapeHTML(storefront.contact.address)}</p></div>
    </div>
  `;

  const contactForm = document.getElementById("contactForm");
  const contactStatus = document.getElementById("contactStatus");
  if (!contactForm || !contactStatus) throw new Error("The contact form is missing.");
  contactForm.addEventListener("submit", event => {
    event.preventDefault();
    const fields = new FormData(contactForm);
    const subject = String(fields.get("subject") || "Angeliz Cakes inquiry");
    const inquiry = {
      name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      subject: String(fields.get("subject") || "Angeliz Cakes inquiry").trim(),
      details: String(fields.get("details") || "").trim()
    };
    contactStatus.textContent = "Sending your inquiry…";
    window.storefrontApi.post("/api/storefront/inquiries", inquiry)
      .then(saved => {
        contactStatus.textContent = `Inquiry ${saved.id} saved to this browser's mock inbox.`;
        contactForm.reset();
      })
      .catch(error => {
        console.error("Could not save the storefront inquiry:", error);
        contactStatus.textContent = "Your inquiry could not be saved. Please try again.";
      });
  });

  testimonialCards.classList.toggle("is-single-review", storefront.feedbacks.length === 1);
  testimonialCards.innerHTML = storefront.feedbacks.map(feedback => {
    const stars = Array.from({ length: 5 }, (_, index) => (
      `<i class="fa-${index < feedback.rating ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`
    )).join("");
    return `
      <article class="testimonial-card-stretched feedback-record">
        <div class="feedback-fields">
          <span class="feedback-name">${escapeHTML(feedback.name)}</span>
          <span class="feedback-rating-stars" role="img" aria-label="${feedback.rating} out of 5 stars">${stars}</span>
        </div>
        <p class="feedback-comment">${escapeHTML(feedback.comment)}</p>
      </article>
    `;
  }).join("");
  testimonialStatus.hidden = storefront.feedbacks.length > 0;
  testimonialStatus.textContent = storefront.feedbacks.length ? "" : "There are no customer reviews yet.";
}

renderHomepage();

/* Keep the reference before-and-after comparison draggable and keyboard accessible. */
const cakeComparison = document.getElementById("baBox");
const cakeComparisonHandle = document.getElementById("baHandle");
const cakeBeforeLabel = document.getElementById("baLabelL");
const cakeAfterLabel = document.getElementById("baLabelR");

if (!cakeComparison || !cakeComparisonHandle || !cakeBeforeLabel || !cakeAfterLabel) {
  throw new Error("The cake comparison slider is missing required elements.");
}

let cakeComparisonPosition = 50;
let cakeComparisonPointer = null;

function setCakeComparisonPosition(value) {
  cakeComparisonPosition = Math.max(0, Math.min(100, value));
  const roundedPosition = Math.round(cakeComparisonPosition);
  cakeComparison.style.setProperty("--pos", cakeComparisonPosition.toFixed(2));
  cakeComparisonHandle.setAttribute("aria-valuenow", String(roundedPosition));
  cakeComparisonHandle.setAttribute(
    "aria-valuetext",
    roundedPosition >= 66
      ? "Mostly the before cake"
      : roundedPosition <= 34
        ? "Mostly the after cake"
        : "Halfway between before and after"
  );
  cakeBeforeLabel.classList.toggle("is-hidden", cakeComparisonPosition < 22);
  cakeAfterLabel.classList.toggle("is-hidden", cakeComparisonPosition > 78);
}

function setCakeComparisonFromPointer(clientX) {
  const bounds = cakeComparison.getBoundingClientRect();
  if (bounds.width <= 0) return;
  setCakeComparisonPosition(((clientX - bounds.left) / bounds.width) * 100);
}

cakeComparison.addEventListener("pointerdown", event => {
  if (!event.isPrimary || event.button !== 0) return;
  cakeComparisonPointer = event.pointerId;
  cakeComparison.classList.add("is-touched", "is-dragging");
  cakeComparison.setPointerCapture(event.pointerId);
  setCakeComparisonFromPointer(event.clientX);
});

cakeComparison.addEventListener("pointermove", event => {
  if (event.pointerId === cakeComparisonPointer) {
    setCakeComparisonFromPointer(event.clientX);
  }
});

function endCakeComparisonDrag(event) {
  if (event.pointerId !== cakeComparisonPointer) return;
  cakeComparisonPointer = null;
  cakeComparison.classList.remove("is-dragging");
}

cakeComparison.addEventListener("pointerup", endCakeComparisonDrag);
cakeComparison.addEventListener("pointercancel", endCakeComparisonDrag);

cakeComparisonHandle.addEventListener("keydown", event => {
  const step = event.shiftKey ? 10 : 2;
  let nextPosition;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    nextPosition = cakeComparisonPosition - step;
  } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    nextPosition = cakeComparisonPosition + step;
  } else if (event.key === "Home") {
    nextPosition = 0;
  } else if (event.key === "End") {
    nextPosition = 100;
  } else {
    return;
  }
  event.preventDefault();
  cakeComparison.classList.add("is-touched");
  setCakeComparisonPosition(nextPosition);
});

setCakeComparisonPosition(cakeComparisonPosition);

/* Wire the horizontal rail arrows to the matching menu and service tracks. */
document.querySelectorAll("[data-scroll-target]").forEach(button => {
  button.addEventListener("click", () => {
    const track = document.getElementById(button.dataset.scrollTarget);
    const direction = Number(button.dataset.scrollDirection);
    if (!track || ![-1, 1].includes(direction)) {
      throw new Error("A horizontal rail control has an invalid target or direction.");
    }
    track.scrollBy({ left: direction * Math.max(track.clientWidth * 0.75, 240), behavior: "smooth" });
  });
});

/* Move the featured images around the wheel, fading each one as it passes the focal point. */
const heroStage = document.getElementById("ahStage");
if (!heroStage) throw new Error("The hero carousel stage is missing.");

const heroWheel = document.getElementById("ahWheel");
const heroCaption = heroStage.parentElement.querySelector(".ah-cap-name");
const heroDots = [...heroStage.parentElement.querySelectorAll(".ah-dotbtn")];

if (!heroWheel || !heroCaption || !storefront.heroSlides.length || heroDots.length !== storefront.heroSlides.length) {
  throw new Error("The hero carousel is missing its wheel, slides, caption, or indicators.");
}

const heroItems = storefront.heroSlides.map((slide, index) => {
  const item = document.createElement("div");
  item.className = "ah-item";
  item.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.src = `../assets/${slide.image}`;
  image.alt = slide.name;
  image.draggable = false;
  image.loading = "eager";
  image.addEventListener("error", () => {
    image.hidden = true;
    console.error(`Could not load the hero image for ${slide.name}.`);
  });

  item.append(image);
  heroStage.append(item);
  return item;
});

let activeHeroSlide = 0;
let heroWheelRotation = 0;
let heroWheelRadius = 0;
let heroAnimationFrame = 0;
const reduceHeroMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function renderHeroWheel() {
  heroWheel.style.transform = `rotate(${heroWheelRotation}deg)`;
  const angleStep = 360 / heroItems.length;
  const fadeRange = Math.max(1, angleStep * 0.86 - 4);

  heroItems.forEach((item, index) => {
    const angle = ((heroWheelRotation - index * angleStep + 180) % 360 + 360) % 360 - 180;
    const radians = angle * Math.PI / 180;
    const visibility = Math.max(0, Math.min(1, 1 - Math.max(0, Math.abs(angle) - 4) / fadeRange));
    const x = -heroWheelRadius * Math.cos(radians);
    const y = -heroWheelRadius * Math.sin(radians);
    const scale = 0.72 + 0.28 * visibility;

    item.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`;
    item.style.opacity = visibility.toFixed(3);
    item.style.visibility = visibility < 0.01 ? "hidden" : "visible";
    item.style.zIndex = String(2 + Math.round(visibility * 10));
  });
}

function layoutHeroWheel() {
  heroWheelRadius = heroStage.offsetWidth / 2;
  heroStage.style.setProperty("--R", `${heroWheelRadius.toFixed(1)}px`);
  renderHeroWheel();
}

function showHeroSlide(index) {
  activeHeroSlide = (index + heroItems.length) % heroItems.length;
  const slide = storefront.heroSlides[activeHeroSlide];
  heroCaption.textContent = slide.name;
  heroStage.setAttribute("aria-label", slide.name);
  heroDots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === activeHeroSlide);
  });
}

function animateHeroWheelTo(target) {
  window.cancelAnimationFrame(heroAnimationFrame);
  if (reduceHeroMotion) {
    heroWheelRotation = target;
    renderHeroWheel();
    return;
  }

  const from = heroWheelRotation;
  const started = performance.now();
  const duration = 1150;

  function tick(now) {
    const progress = Math.min(1, (now - started) / duration);
    const eased = progress < 0.5
      ? 4 * progress ** 3
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    heroWheelRotation = from + (target - from) * eased;
    renderHeroWheel();
    if (progress < 1) heroAnimationFrame = window.requestAnimationFrame(tick);
  }

  heroAnimationFrame = window.requestAnimationFrame(tick);
}

function advanceHeroCarousel() {
  showHeroSlide(activeHeroSlide + 1);
  animateHeroWheelTo(heroWheelRotation + 360 / heroItems.length);
}

layoutHeroWheel();
showHeroSlide(0);

if ("ResizeObserver" in window) {
  const heroStageObserver = new ResizeObserver(layoutHeroWheel);
  heroStageObserver.observe(heroStage);
}
window.addEventListener("resize", layoutHeroWheel, { passive: true });

if (!reduceHeroMotion) {
  window.setInterval(advanceHeroCarousel, 5000);
}

/* Menu and service/package arrows reappear after five seconds without rail activity. */
document.querySelectorAll("[data-horizontal-rail]").forEach(rail => {
  const controls = rail.querySelector("[data-rail-controls]");
  if (!controls) return;

  let idleTimer = 0;
  const resetIdleTimer = () => {
    window.clearTimeout(idleTimer);
    controls.classList.remove("is-idle");
    idleTimer = window.setTimeout(() => controls.classList.add("is-idle"), 5000);
  };

  ["pointerdown", "pointermove", "touchstart", "wheel", "scroll", "keydown"].forEach(eventName => {
    rail.addEventListener(eventName, resetIdleTimer, {
      passive: eventName !== "keydown",
      capture: eventName === "scroll"
    });
  });
  controls.addEventListener("focusin", resetIdleTimer);
  controls.addEventListener("focusout", resetIdleTimer);
  resetIdleTimer();
});
