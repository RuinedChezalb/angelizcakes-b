"use strict";

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
