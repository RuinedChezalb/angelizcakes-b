"use strict";

/* Shared storefront mock data. Asset paths are relative to the storefront page. */
window.angelizStorefrontProducts = [
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
  {
    id: "bento-cake",
    name: "Personalized Bento Cake",
    category: "Cakes",
    price: "₱650.00",
    image: "chocolate-cake.jpg",
    details: {
      description: "",
      classification: "Bento cake",
      ingredients: "Contact the bakery for the current ingredient list.",
      allergens: "Contact the bakery to confirm allergen information before ordering.",
      customization: [
        { label: "Dedication", value: "Discuss with the bakery" },
        { label: "Flavor", value: "Discuss with the bakery" }
      ],
      reviews: []
    }
  },
  { id: "berry-tart", name: "Fresh Berry Tart", category: "Pastries", price: "₱420.00", image: "pastry-selection.jpg" },
  { id: "chocolate-cup", name: "Chocolate Dessert Cup", category: "Desserts", price: "₱180.00", image: "chocolate-dessert.jpg" },
  { id: "artisan-bread", name: "Artisan Bread", category: "Foods", price: "Ask for pricing", image: "artisan-bread.jpg" },
  { id: "cafe-meal", name: "Cafe Meal", category: "Meals", price: "Ask for pricing", image: "meals.jpg" },
  { id: "signature-drink", name: "Signature Cafe Drink", category: "Beverages", price: "Ask for pricing", image: "coffee.jpg" },
  { id: "catering-package", name: "Celebration Catering", category: "Catering", price: "Ask for pricing", image: "catering.jpg" }
];

window.angelizStorefrontServices = [
  {
    id: "sakura-grazing-table",
    category: "grazing",
    title: "Sakura Grazing Table",
    description: "A curated grazing spread with assorted cheeses and fresh fruit platters.",
    image: "catering.jpg",
    price: "₱8,500",
    inclusions: [
      { quantity: "1 set", name: "Assorted Cheeses" },
      { quantity: "2 platters", name: "Fresh Fruits" }
    ]
  }
];

window.angelizStorefrontData = {
  categories: [{ label: "Cakes", productCategories: ["Cakes"] }],
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
  feedbacks: [{ name: "test ting", comment: "testing testing", rating: 3 }],
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
