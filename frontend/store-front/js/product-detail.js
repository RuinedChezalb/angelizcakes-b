"use strict";

function updateProductFavoriteButton(button, isFavorite) {
  const productName = button.dataset.productName;
  button.setAttribute("aria-pressed", String(isFavorite));
  button.setAttribute(
    "aria-label",
    `${isFavorite ? "Remove" : "Add"} ${productName} ${isFavorite ? "from" : "to"} favorites`
  );
  button.querySelector("i").className = `fa-${isFavorite ? "solid" : "regular"} fa-heart`;
}

document.addEventListener("storefront:favorites-changed", event => {
  const favoriteIds = event.detail?.favorites;
  if (!Array.isArray(favoriteIds)) throw new TypeError("Favorite updates must include a favorites array.");
  document.querySelectorAll("[data-product-favorite]").forEach(button => {
    updateProductFavoriteButton(button, favoriteIds.includes(button.dataset.productId));
  });
});

window.initializeProductDetailFragment = function initializeProductDetailFragment(root, product, imageUrl, settings = {}) {
  if (!(root instanceof HTMLElement)) throw new TypeError("The product detail fragment is missing.");
  if (!product || typeof product.id !== "string" || !product.details) {
    throw new TypeError("The selected product is missing static detail data.");
  }
  if (typeof imageUrl !== "string" || !imageUrl) {
    throw new TypeError("The selected product image is missing.");
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new TypeError("Product detail options must be an object.");
  }

  const view = root.querySelector(".product-detail-view");
  if (!view) throw new TypeError("The product detail layout is missing.");
  const favoriteButton = view.querySelector("[data-product-favorite]");
  const checkoutButton = view.querySelector("[data-product-checkout]");
  const favoriteManager = window.storefrontFavorites;
  const favoritesEnabled = settings.favoritesEnabled !== false;
  if (!favoriteButton || !checkoutButton) {
    throw new Error("The product detail controls are unavailable.");
  }
  if (
    favoritesEnabled
    && (!favoriteManager || typeof favoriteManager.isFavorite !== "function" || typeof favoriteManager.toggle !== "function")
  ) {
    throw new Error("The shared favorites controls are unavailable.");
  }

  if (favoritesEnabled) {
    favoriteButton.dataset.productId = product.id;
    favoriteButton.dataset.productName = product.name;
    updateProductFavoriteButton(favoriteButton, favoriteManager.isFavorite(product.id));
    favoriteButton.addEventListener("click", () => favoriteManager.toggle(product.id));
  } else {
    favoriteButton.remove();
  }
  checkoutButton.addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("storefront:show-checkout", {
      detail: { product, imageUrl }
    }));
  });

  const details = product.details;
  if (!Array.isArray(details.customization) || !Array.isArray(details.reviews)) {
    throw new TypeError("The product detail lists must be arrays.");
  }

  view.querySelector("[data-product-image]").src = imageUrl;
  view.querySelector("[data-product-image]").alt = product.name;
  view.querySelector("[data-product-category]").textContent = product.category;
  view.querySelector("[data-product-name]").textContent = product.name;
  view.querySelector("[data-product-price]").textContent = product.price || "Ask for pricing";
  const description = view.querySelector("[data-product-description]");
  description.textContent = details.description;
  description.hidden = !details.description;
  view.querySelector("[data-product-ingredients]").textContent = details.ingredients;
  view.querySelector("[data-product-allergens]").textContent = details.allergens;
  view.querySelector("[data-product-classification]").textContent =
    [...new Set([product.category, details.classification].filter(Boolean))].join(", ");

  const options = view.querySelector("[data-product-options]");
  options.replaceChildren();
  details.customization.forEach(option => {
    const row = document.createElement("div");
    const label = document.createElement("dt");
    const value = document.createElement("dd");
    label.textContent = option.label;
    value.textContent = option.value;
    row.append(label, value);
    options.append(row);
  });
  view.querySelector("[data-product-options-note]").hidden = details.customization.length > 0;

  const reviews = view.querySelector("[data-product-reviews]");
  reviews.replaceChildren();
  if (details.reviews.length === 0) {
    const emptyState = document.createElement("p");
    emptyState.className = "product-detail-note";
    emptyState.textContent = "There are no customer reviews yet.";
    reviews.append(emptyState);
  } else {
    details.reviews.forEach(review => {
      const card = document.createElement("article");
      card.className = "product-review-card";
      const quote = document.createElement("p");
      quote.textContent = review.quote;
      const author = document.createElement("strong");
      author.textContent = review.author;
      card.append(quote, author);
      reviews.append(card);
    });
  }

  const tabs = [...view.querySelectorAll("[data-product-tab]")];
  if (tabs.length === 0) throw new TypeError("The product information tabs are missing.");

  function activateTab(activeTab) {
    tabs.forEach(tab => {
      const selected = tab === activeTab;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = view.querySelector(`[data-product-panel="${tab.dataset.productTab}"]`);
      if (!panel) throw new TypeError(`The product detail panel ${tab.dataset.productTab} is missing.`);
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
    });
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateTab(tab));
    tab.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const offset = event.key === "ArrowRight" ? 1 : -1;
      const nextTab = tabs[(index + offset + tabs.length) % tabs.length];
      nextTab.focus();
      activateTab(nextTab);
    });
  });

  root.querySelector("[data-product-name]").focus({ preventScroll: true });
};
