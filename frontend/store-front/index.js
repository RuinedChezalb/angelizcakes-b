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
  products: window.angelizStorefrontProducts,
  favorites: ["signature-cake", "berry-tart"],
  serviceCategories: [
    { id: "grazing", label: "Grazing Tables" },
    { id: "pastry", label: "Pastry Buffets" },
    { id: "party", label: "Party Packages" },
    { id: "bundle", label: "Food Bundles" }
  ],
  services: window.angelizStorefrontServices,
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

/* Owner-managed products can introduce menu categories beyond the static "Cakes" tab. */
storefront.products
  .filter(product => product.managed)
  .forEach(product => {
    if (!storefront.categories.some(category => category.productCategories.includes(product.category))) {
      storefront.categories.push({ label: product.category, productCategories: [product.category] });
    }
  });

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

function imageSource(image) {
  return /^(data:|https?:)/.test(image) ? image : `assets/${image}`;
}

function renderHomepage() {
  const categoryTabs = document.getElementById("menuCategoryTabs");
  const menuProducts = document.getElementById("menuProducts");
  const serviceCategoryTabs = document.getElementById("serviceCategoryTabs");
  const serviceRail = document.getElementById("serviceRail");
  const gallery = document.getElementById("gallerySixGrid");
  const locationCard = document.getElementById("locationCard");
  const testimonialCards = document.getElementById("testimonialCards");
  const testimonialStatus = document.getElementById("testimonialStatus");

  if (
    !categoryTabs
    || !menuProducts
    || !serviceCategoryTabs
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
      .map(product => `
        <article class="menu-card home-product-card">
          <div class="home-product-image">
            <img src="${escapeHTML(imageSource(product.image))}" alt="${escapeHTML(product.name)}" loading="lazy">
          </div>
          <div class="home-product-copy">
            <h3 class="card-title">${escapeHTML(product.name)}</h3>
            <p class="card-desc">${escapeHTML(product.price)}</p>
            <button class="home-product-view" type="button" data-view-product="${escapeHTML(product.id)}">View</button>
          </div>
        </article>
      `).join("") || '<p class="catalog-status" role="status">No menu items are available in this category.</p>';
  }

  categoryTabs.classList.toggle("is-scrollable", storefront.categories.length > 4);
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

  menuProducts.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const opener = event.target.closest("[data-view-product]");
    if (!opener) return;
    const product = storefront.products.find(item => item.id === opener.dataset.viewProduct);
    if (!product) throw new RangeError(`Unknown product ID: ${opener.dataset.viewProduct}`);
    const image = opener.closest(".home-product-card")?.querySelector(".home-product-image img");
    if (!image) throw new Error(`Product ${product.id} is missing its menu image.`);
    document.dispatchEvent(new CustomEvent("storefront:show-product-detail", {
      detail: { product, imageUrl: image.src }
    }));
  });

  function renderServiceCategory(categoryIndex) {
    const category = storefront.serviceCategories[categoryIndex];
    if (!category) throw new RangeError(`Unknown package category index: ${categoryIndex}`);

    serviceCategoryTabs.querySelectorAll(".menu-category-tab").forEach((tab, index) => {
      const selected = index === categoryIndex;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    serviceRail.setAttribute("aria-labelledby", `service-tab-${categoryIndex}`);
    const categoryServices = storefront.services.filter(service => service.category === category.id);
    serviceRail.classList.toggle("is-single-package", categoryServices.length === 1);
    serviceRail.innerHTML = categoryServices.map(service => `
      <article class="home-service-card">
        <div class="home-package-image">
          <img src="${escapeHTML(imageSource(service.image))}" alt="${escapeHTML(service.title)}" loading="lazy">
        </div>
        <div class="home-package-copy">
          <span class="home-package-label">${escapeHTML(category.label)}</span>
          <h3>${escapeHTML(service.title)}</h3>
          <p>${escapeHTML(service.description)}</p>
          <p class="home-package-price">${escapeHTML(service.price || "To be confirmed")}</p>
          <button class="home-package-view" type="button" data-view-package="${escapeHTML(service.id)}">View</button>
        </div>
      </article>
    `).join("") || '<p class="catalog-status service-category-empty" role="status">No packages are available in this category yet.</p>';
  }

  serviceCategoryTabs.classList.toggle("is-scrollable", storefront.serviceCategories.length > 4);
  serviceCategoryTabs.innerHTML = storefront.serviceCategories.map((category, index) => `
    <button class="menu-category-tab${index === 0 ? " is-active" : ""}" id="service-tab-${index}"
            type="button" role="tab" aria-controls="serviceRail" aria-selected="${index === 0}"
            tabindex="${index === 0 ? "0" : "-1"}" data-service-category="${index}">
      ${escapeHTML(category.label)}
    </button>
  `).join("");
  serviceCategoryTabs.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const tab = event.target.closest(".menu-category-tab");
    if (tab) renderServiceCategory(Number(tab.dataset.serviceCategory));
  });
  serviceCategoryTabs.addEventListener("keydown", event => {
    if (!(event.target instanceof Element) || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    const tabs = [...serviceCategoryTabs.querySelectorAll(".menu-category-tab")];
    const currentIndex = tabs.indexOf(event.target.closest(".menu-category-tab"));
    if (currentIndex < 0) return;
    event.preventDefault();
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + offset + tabs.length) % tabs.length;
    tabs[nextIndex].focus();
    renderServiceCategory(nextIndex);
  });
  renderServiceCategory(0);

  serviceRail.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;
    const opener = event.target.closest("[data-view-package]");
    if (!opener) return;
    const packageOffering = storefront.services.find(service => service.id === opener.dataset.viewPackage);
    if (!packageOffering) throw new RangeError(`Unknown package offering: ${opener.dataset.viewPackage}`);
    const image = opener.closest(".home-service-card")?.querySelector(".home-package-image img");
    if (!image) throw new Error(`Package offering ${packageOffering.id} is missing its image.`);
    document.dispatchEvent(new CustomEvent("storefront:show-service-package", {
      detail: { packageOffering, imageUrl: image.src, products: storefront.products }
    }));
  });

  const galleryPage = `
    <div class="gallery-page">
      ${storefront.gallery.map((item, index) => `
        <div class="gallery-slot interactive-card slot-size-${index + 1}">
          <img src="assets/${escapeHTML(item.image)}" alt="${escapeHTML(item.name)}" class="gallery-slot-img" loading="lazy">
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
        <img src="assets/${escapeHTML(storefront.location.image)}" alt="${escapeHTML(storefront.location.name)}">
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
  aboutImage.src = `assets/${storefront.about.image}`;
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
    const name = String(fields.get("name") || "").trim();
    const email = String(fields.get("email") || "").trim();
    const subject = String(fields.get("subject") || "Angeliz Cakes inquiry");
    const details = String(fields.get("details") || "").trim();
    const storageKey = "angelizCakes.storefrontInquiries.v1";
    let savedToInbox = false;
    try {
      const inquiries = JSON.parse(window.localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(inquiries)) {
        throw new TypeError("Storefront inquiry storage must contain an array.");
      }
      inquiries.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        email,
        subject,
        details,
        submittedAt: new Date().toISOString()
      });
      window.localStorage.setItem(storageKey, JSON.stringify(inquiries));
      savedToInbox = true;
    } catch (error) {
      console.error("Could not save the storefront inquiry for the owner inbox:", error);
    }

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      details
    ].join("\n");
    contactStatus.textContent = savedToInbox
      ? "Your message is in the owner inbox. Opening your email app as well."
      : "Your message could not be saved to the owner inbox. Opening your email app instead.";
    window.location.href = `mailto:${storefront.contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

if (document.getElementById("storefrontHome")) {
renderHomepage();

const startCustomizingButton = document.getElementById("startCustomizingBtn");
if (!startCustomizingButton) throw new Error("The customization wizard button is missing.");
startCustomizingButton.addEventListener("click", event => {
  event.preventDefault();
  document.dispatchEvent(new CustomEvent("storefront:show-customization-wizard"));
});

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
  image.src = `assets/${slide.image}`;
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
}

/* Preserve header, search, favorites, and account interactions without a homepage body. */
const navHeader = document.querySelector(".navbar");
const navMenu = document.getElementById("navMenu");
const navToggle = document.getElementById("navToggle");
const navSearchBox = document.getElementById("navSearchBox");
const navSearchToggle = document.getElementById("navSearchToggle");
const headerSearch = document.getElementById("headerSearch");
const searchResults = document.getElementById("searchResults");
const favoritesTrigger = document.getElementById("navFavIcon");
const favoritesOverlay = document.getElementById("favOverlay");
const favoritesList = document.getElementById("favItemsList");
const favoritesBadge = document.getElementById("favCount");
const profileTrigger = document.getElementById("profileIcon");
const favoritesStorageKey = "angeliz_header_favorites";

if (
  !navHeader || !navMenu || !navToggle || !navSearchBox || !navSearchToggle
  || !headerSearch || !searchResults || !favoritesTrigger || !favoritesOverlay
  || !favoritesList || !favoritesBadge || !profileTrigger
) {
  throw new Error("A header interaction element is missing.");
}

function setNavigationOpen(isOpen) {
  navMenu.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
  navToggle.querySelector("i").className = isOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars";
}

navToggle.addEventListener("click", () => {
  const isOpening = !navMenu.classList.contains("is-open");
  if (isOpening) closeHeaderSearch();
  setNavigationOpen(isOpening);
});

navMenu.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", () => setNavigationOpen(false));
});

const sectionLinks = [...navMenu.querySelectorAll(".nav-link")]
  .map(link => ({
    link,
    section: document.getElementById(new URL(link.href, location.href).hash.slice(1))
  }))
  .filter(item => item.section);

function updateActiveNavigation() {
  const activeLine = navHeader.getBoundingClientRect().bottom + 40;
  let activeItem;
  sectionLinks.forEach(item => {
    if (item.section.isConnected && item.section.getBoundingClientRect().top <= activeLine) activeItem = item;
  });
  sectionLinks.forEach(({ link }) => {
    const active = activeItem && link === activeItem.link;
    link.classList.toggle("active", Boolean(active));
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}

window.addEventListener("scroll", updateActiveNavigation, { passive: true });
window.addEventListener("resize", updateActiveNavigation);
window.addEventListener("hashchange", updateActiveNavigation);
document.addEventListener("storefront:view-changed", updateActiveNavigation);
updateActiveNavigation();

let favoritesStorageError = "";
function readStoredFavorites() {
  try {
    const saved = localStorage.getItem(favoritesStorageKey);
    if (saved === null) {
      favoritesStorageError = "";
      return [...storefront.favorites];
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError("Saved favorites must be an array.");
    const productIds = new Set(storefront.products.map(product => product.id));
    favoritesStorageError = "";
    return [...new Set(parsed.filter(id => typeof id === "string" && productIds.has(id)))];
  } catch (error) {
    console.error("Could not read saved customer favorites.", error);
    favoritesStorageError = "Saved favorites could not be loaded.";
    return [];
  }
}

let favorites = readStoredFavorites();
function notifyFavoritesChanged() {
  document.dispatchEvent(new CustomEvent("storefront:favorites-changed", {
    detail: { favorites: [...favorites] }
  }));
}

function saveFavorites() {
  try {
    localStorage.setItem(favoritesStorageKey, JSON.stringify(favorites));
    favoritesStorageError = "";
  } catch (error) {
    console.error("Could not save customer favorites.", error);
    favoritesStorageError = "Favorite changes could not be saved.";
  }
  notifyFavoritesChanged();
}

function renderFavorites() {
  favoritesBadge.textContent = String(favorites.length);
  const storageNotice = favoritesStorageError
    ? `<p class="favorites-storage-message" role="status">${escapeHTML(favoritesStorageError)}</p>`
    : "";
  if (favorites.length === 0) {
    favoritesList.innerHTML = `${storageNotice}
      <div class="favorites-empty">
        <i class="fa-regular fa-heart" aria-hidden="true"></i>
        <strong>${favoritesStorageError ? "Favorites unavailable" : "No favorites yet"}</strong>
        <span>${favoritesStorageError ? "Please try again later." : "Save a treat you love and it will appear here."}</span>
      </div>`;
    return;
  }

  favoritesList.innerHTML = storageNotice + favorites.map(id => {
    const product = storefront.products.find(item => item.id === id);
    if (!product) return "";
    return `
      <article class="favorite-row">
        <span class="favorite-mark"><img src="${escapeHTML(imageSource(product.image))}" alt=""></span>
        <div class="favorite-info"><strong>${escapeHTML(product.name)}</strong><span>${escapeHTML(product.price)}</span></div>
        <div class="favorite-actions">
          <a class="favorite-view" href="#menu">View</a>
          <button class="favorite-remove" type="button" data-remove-favorite="${escapeHTML(product.id)}">Remove</button>
        </div>
      </article>`;
  }).join("");
}

function renderSearchResults() {
  const query = headerSearch.value.trim().toLowerCase();
  searchResults.replaceChildren();
  if (!query) {
    searchResults.hidden = true;
    return;
  }

  const matches = storefront.products.filter(product => (
    `${product.name} ${product.category}`.toLowerCase().includes(query)
  ));
  searchResults.hidden = false;
  if (matches.length === 0) {
    searchResults.classList.add("is-message");
    searchResults.textContent = "No matching treats found.";
    return;
  }

  searchResults.classList.remove("is-message");
  matches.forEach(product => {
    const isFavorite = favorites.includes(product.id);
    const row = document.createElement("div");
    row.className = "search-result";
    row.setAttribute("role", "listitem");
    row.innerHTML = `
      <a class="search-result-details" href="#menu">
        <strong>${escapeHTML(product.name)}</strong>
        <span>${escapeHTML(product.category)} · ${escapeHTML(product.price)}</span>
      </a>
      <button class="search-favorite" type="button" data-toggle-favorite="${escapeHTML(product.id)}"
        aria-label="${isFavorite ? "Remove" : "Add"} ${escapeHTML(product.name)} ${isFavorite ? "from" : "to"} favorites"
        aria-pressed="${isFavorite}">
        <i class="fa-${isFavorite ? "solid" : "regular"} fa-heart" aria-hidden="true"></i>
      </button>`;
    searchResults.append(row);
  });
}

function toggleFavorite(productId) {
  if (!storefront.products.some(product => product.id === productId)) {
    throw new RangeError(`Unknown favorite product ID: ${productId}`);
  }
  favorites = favorites.includes(productId)
    ? favorites.filter(id => id !== productId)
    : [...favorites, productId];
  saveFavorites();
  renderFavorites();
  renderSearchResults();
  return favorites.includes(productId);
}

window.storefrontFavorites = Object.freeze({
  isFavorite(productId) {
    return favorites.includes(productId);
  },
  toggle: toggleFavorite
});

function closeHeaderSearch(restoreFocus = false) {
  if (!navSearchBox.classList.contains("is-open")) return;
  navSearchBox.classList.remove("is-open");
  navSearchToggle.setAttribute("aria-expanded", "false");
  navSearchToggle.setAttribute("aria-label", "Open search");
  navHeader.classList.remove("search-expanded");
  searchResults.hidden = true;
  if (restoreFocus) navSearchToggle.focus();
}

navSearchToggle.addEventListener("click", () => {
  if (navSearchBox.classList.contains("is-open")) {
    closeHeaderSearch();
    return;
  }
  navSearchBox.classList.add("is-open");
  navSearchToggle.setAttribute("aria-expanded", "true");
  navSearchToggle.setAttribute("aria-label", "Close search");
  navHeader.classList.add("search-expanded");
  headerSearch.focus();
  renderSearchResults();
});
headerSearch.addEventListener("input", renderSearchResults);
navSearchBox.addEventListener("focusout", event => {
  if (event.relatedTarget && navSearchBox.contains(event.relatedTarget)) return;
  closeHeaderSearch();
});
headerSearch.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  headerSearch.value = "";
  renderSearchResults();
  closeHeaderSearch(true);
});
document.addEventListener("pointerdown", event => {
  if (navSearchBox.classList.contains("is-open") && !navSearchBox.contains(event.target)) {
    closeHeaderSearch();
  }
});

let lastPanelTrigger = null;
function openPanel(panel, trigger) {
  lastPanelTrigger = trigger;
  panel.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  trigger.setAttribute("aria-expanded", "true");
  document.body.classList.add("panel-open");
  panel.querySelector("[data-close-panel]").focus();
}

function closePanel(panel) {
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  favoritesTrigger.setAttribute("aria-expanded", "false");
  if (!document.querySelector(".panel-overlay.is-open")) {
    document.body.classList.remove("panel-open");
  }
  if (lastPanelTrigger) lastPanelTrigger.focus();
}

favoritesTrigger.addEventListener("click", () => {
  renderFavorites();
  openPanel(favoritesOverlay, favoritesTrigger);
});
profileTrigger.addEventListener("click", () => {
  document.dispatchEvent(new CustomEvent("storefront:show-login"));
});
document.querySelectorAll(".panel-overlay").forEach(panel => {
  panel.addEventListener("click", event => {
    if (
      event.target === panel
      || event.target.closest("[data-close-panel]")
      || event.target.closest('a[href^="#"]')
    ) closePanel(panel);
  });
});
favoritesList.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-favorite]");
  if (!removeButton) return;
  favorites = favorites.filter(id => id !== removeButton.dataset.removeFavorite);
  saveFavorites();
  renderFavorites();
  renderSearchResults();
});
searchResults.addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-toggle-favorite]");
  if (favoriteButton) {
    toggleFavorite(favoriteButton.dataset.toggleFavorite);
  } else if (event.target.closest("a")) {
    closeHeaderSearch();
  }
});
window.addEventListener("storage", event => {
  if (event.key !== favoritesStorageKey) return;
  favorites = readStoredFavorites();
  renderFavorites();
  renderSearchResults();
  notifyFavoritesChanged();
});
document.addEventListener("header:mock-favorites-updated", event => {
  const updatedFavorites = event.detail?.favorites;
  if (!Array.isArray(updatedFavorites)) {
    throw new TypeError("Favorite update event must include a favorites array.");
  }
  const productIds = new Set(storefront.products.map(product => product.id));
  favorites = [...new Set(updatedFavorites.filter(id => (
    typeof id === "string" && productIds.has(id)
  )))];
  renderFavorites();
  renderSearchResults();
  notifyFavoritesChanged();
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (navMenu.classList.contains("is-open")) setNavigationOpen(false);
  document.querySelectorAll(".panel-overlay.is-open").forEach(closePanel);
});

renderFavorites();
