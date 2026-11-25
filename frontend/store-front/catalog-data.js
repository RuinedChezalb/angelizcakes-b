"use strict";

/* Mock database records used by mock-api.js until a backend is connected. */
(function seedStorefrontDatabase() {
  const categories = [
    { id: "cakes", label: "Cakes", productCategories: ["Cakes"], sortOrder: 1 },
    { id: "pastries", label: "Pastries", productCategories: ["Pastries"], sortOrder: 2 },
    { id: "desserts", label: "Desserts", productCategories: ["Desserts"], sortOrder: 3 },
    { id: "bakery", label: "Bakery", productCategories: ["Bakery"], sortOrder: 4 },
    { id: "cafe", label: "Cafe", productCategories: ["Cafe"], sortOrder: 5 }
  ];

  const productSeeds = [
    [
      ["signature-cake", "Signature Celebration Cake", "1,850.00", "signature-cake.jpg"],
      ["bento-cake", "Personalized Bento Cake", "650.00", "chocolate-cake.jpg"],
      ["chocolate-drip-cake", "Chocolate Drip Cake", "1,550.00", "cakes.jpg"],
      ["berry-celebration-cake", "Berry Celebration Cake", "1,750.00", "signature-cake.jpg"],
      ["vanilla-layer-cake", "Vanilla Layer Cake", "1,400.00", "chocolate-cake.jpg"]
    ],
    [
      ["berry-tart", "Fresh Berry Tart", "420.00", "pastry-selection.jpg"],
      ["butter-croissant", "Butter Croissant", "120.00", "artisan-bread.jpg"],
      ["chocolate-eclair", "Chocolate Eclair", "160.00", "chocolate-dessert.jpg"],
      ["strawberry-danish", "Strawberry Danish", "145.00", "pastry-selection.jpg"],
      ["cinnamon-roll", "Cinnamon Roll", "135.00", "artisan-bread.jpg"]
    ],
    [
      ["chocolate-cup", "Chocolate Dessert Cup", "180.00", "chocolate-dessert.jpg"],
      ["mango-panna-cotta", "Mango Panna Cotta", "195.00", "cakes.jpg"],
      ["classic-cheesecake", "Classic Cheesecake Slice", "220.00", "chocolate-cake.jpg"],
      ["strawberry-shortcake", "Strawberry Shortcake Cup", "185.00", "pastry-selection.jpg"],
      ["caramel-flan", "Caramel Custard Flan", "150.00", "chocolate-dessert.jpg"]
    ],
    [
      ["artisan-bread", "Artisan Bread Loaf", "280.00", "artisan-bread.jpg"],
      ["garlic-cheese-roll", "Garlic Cheese Roll", "95.00", "meals.jpg"],
      ["ham-cheese-bun", "Ham and Cheese Bun", "115.00", "artisan-bread.jpg"],
      ["classic-sourdough", "Classic Sourdough", "320.00", "meals.jpg"],
      ["soft-milk-bread", "Soft Milk Bread", "240.00", "artisan-bread.jpg"]
    ],
    [
      ["cafe-meal", "Cafe Comfort Meal", "Ask for pricing", "meals.jpg"],
      ["signature-drink", "Signature Cafe Drink", "Ask for pricing", "coffee.jpg"],
      ["iced-chocolate", "Iced Chocolate", "Ask for pricing", "chocolate-dessert.jpg"],
      ["cafe-pasta", "Creamy Cafe Pasta", "Ask for pricing", "meals.jpg"],
      ["celebration-catering", "Celebration Catering Tray", "Ask for pricing", "catering.jpg"]
    ]
  ];

  const productDetailById = {
    "signature-cake": {
      description: "A celebration cake finished with chocolate frosting and piped rosettes, suited to birthdays and special gatherings.",
      classification: "Celebration cake · Signature design",
      ingredients: "Chocolate sponge, chocolate frosting, and decorative piping. Ask the bakery to confirm the current recipe before ordering.",
      allergens: "May contain wheat, eggs, milk, and soy. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Occasion", value: "Birthday, wedding, anniversary, christening, or other" }, { label: "Theme & Color", value: "Choose a theme and color palette with the bakery" }, { label: "Layers per tier", value: "Choose the number of sponge layers" }, { label: "Tiers & Size", value: "Choose tier count and specify height/width, or let the baker decide" }, { label: "Flavor", value: "Vanilla, chocolate, red velvet, ube, or confirm availability" }, { label: "Frosting", value: "Buttercream, whipped cream, fondant, or confirm availability" }]
    },
    "bento-cake": {
      description: "A petite personalized cake for a small celebration, presented with a simple decorative finish.",
      classification: "Bento cake · Small celebration cake",
      ingredients: "Cake sponge and frosting; flavor varies by selection. Ask the bakery to confirm the current recipe.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Occasion", value: "Birthday, wedding, anniversary, christening, or other" }, { label: "Theme & Color", value: "Choose a theme and color palette with the bakery" }, { label: "Layers per tier", value: "Choose the number of sponge layers" }, { label: "Tiers & Size", value: "Choose tier count and specify height/width, or let the baker decide" }, { label: "Flavor", value: "Vanilla, chocolate, red velvet, ube, or confirm availability" }, { label: "Frosting", value: "Buttercream, whipped cream, fondant, or confirm availability" }]
    },
    "chocolate-drip-cake": {
      description: "A layered chocolate cake finished with a glossy chocolate drip and piped decoration.",
      classification: "Layer cake · Chocolate",
      ingredients: "Chocolate cake layers, frosting, and chocolate topping. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, milk, and soy. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Occasion", value: "Birthday, wedding, anniversary, christening, or other" }, { label: "Theme & Color", value: "Choose a theme and color palette with the bakery" }, { label: "Layers per tier", value: "Choose the number of sponge layers" }, { label: "Tiers & Size", value: "Choose tier count and specify height/width, or let the baker decide" }, { label: "Flavor", value: "Vanilla, chocolate, red velvet, ube, or confirm availability" }, { label: "Frosting", value: "Buttercream, whipped cream, fondant, or confirm availability" }]
    },
    "berry-celebration-cake": {
      description: "A celebration cake with a fruit-inspired finish for birthdays, anniversaries, and gatherings.",
      classification: "Celebration cake · Fruit design",
      ingredients: "Cake sponge, frosting, and fruit decoration. Confirm the selected flavor and current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Occasion", value: "Birthday, wedding, anniversary, christening, or other" }, { label: "Theme & Color", value: "Choose a theme and color palette with the bakery" }, { label: "Layers per tier", value: "Choose the number of sponge layers" }, { label: "Tiers & Size", value: "Choose tier count and specify height/width, or let the baker decide" }, { label: "Flavor", value: "Vanilla, chocolate, red velvet, ube, or confirm availability" }, { label: "Frosting", value: "Buttercream, whipped cream, fondant, or confirm availability" }]
    },
    "vanilla-layer-cake": {
      description: "A classic vanilla layer cake with a smooth frosting finish for a simple, versatile celebration.",
      classification: "Layer cake · Vanilla",
      ingredients: "Vanilla cake layers and frosting. Ask the bakery to confirm the current recipe.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Occasion", value: "Birthday, wedding, anniversary, christening, or other" }, { label: "Theme & Color", value: "Choose a theme and color palette with the bakery" }, { label: "Layers per tier", value: "Choose the number of sponge layers" }, { label: "Tiers & Size", value: "Choose tier count and specify height/width, or let the baker decide" }, { label: "Flavor", value: "Vanilla, chocolate, red velvet, ube, or confirm availability" }, { label: "Frosting", value: "Buttercream, whipped cream, fondant, or confirm availability" }]
    },
    "berry-tart": {
      description: "A pastry tart topped with fresh berries, suitable for sharing or serving as an individual dessert.",
      classification: "Pastry · Fruit tart",
      ingredients: "Pastry shell, filling, and berry topping. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "butter-croissant": {
      description: "A flaky, layered croissant baked for a buttery pastry option at breakfast or snack time.",
      classification: "Bakery · Pastry",
      ingredients: "Wheat flour, butter, and other baking ingredients. Confirm the current recipe with the bakery.",
      allergens: "Contains or may contain wheat and milk. Confirm cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "chocolate-eclair": {
      description: "A pastry filled with cream and finished with a chocolate topping.",
      classification: "Pastry · Filled pastry",
      ingredients: "Choux pastry, cream filling, and chocolate topping. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, milk, and soy. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "strawberry-danish": {
      description: "A laminated Danish pastry with a strawberry-inspired topping.",
      classification: "Bakery · Danish pastry",
      ingredients: "Laminated pastry and strawberry topping. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "cinnamon-roll": {
      description: "A soft rolled pastry with cinnamon filling and a sweet finish.",
      classification: "Bakery · Sweet roll",
      ingredients: "Wheat dough, cinnamon filling, and sweet topping. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "chocolate-cup": {
      description: "A single-serve chocolate dessert layered in a convenient cup.",
      classification: "Dessert · Single serve",
      ingredients: "Chocolate dessert layers and toppings. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, milk, and soy. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Single serve" }]
    },
    "mango-panna-cotta": {
      description: "A chilled, creamy dessert with mango flavor and a soft-set texture.",
      classification: "Dessert · Chilled dessert",
      ingredients: "Cream-based dessert with mango flavor. Confirm the current recipe with the bakery.",
      allergens: "May contain milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Single serve" }]
    },
    "classic-cheesecake": {
      description: "A slice of creamy cheesecake with a crumb base.",
      classification: "Dessert · Cheesecake",
      ingredients: "Cream-cheese filling and crumb base. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Single slice" }]
    },
    "strawberry-shortcake": {
      description: "A layered single-serve dessert with cake, cream, and strawberry flavor.",
      classification: "Dessert · Single serve",
      ingredients: "Cake, cream, and strawberry components. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Single serve" }]
    },
    "caramel-flan": {
      description: "A smooth baked custard dessert finished with caramel.",
      classification: "Dessert · Custard",
      ingredients: "Egg custard, milk, and caramel. Confirm the current recipe with the bakery.",
      allergens: "Contains or may contain eggs and milk. Confirm cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "artisan-bread": {
      description: "A bakery loaf made for slicing and sharing alongside meals or spreads.",
      classification: "Bakery · Bread",
      ingredients: "Wheat flour, water, yeast, and other baking ingredients. Confirm the current recipe with the bakery.",
      allergens: "Contains or may contain wheat. Confirm cross-contact details with the bakery.",
      customization: [{ label: "Loaf quantity", value: "Ask about availability" }]
    },
    "garlic-cheese-roll": {
      description: "A savory bread roll with garlic and cheese flavors.",
      classification: "Bakery · Savory roll",
      ingredients: "Wheat dough, garlic, and cheese. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "ham-cheese-bun": {
      description: "A soft bun filled with ham and cheese for a savory snack.",
      classification: "Bakery · Filled bun",
      ingredients: "Wheat bun, ham, and cheese. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Ask about available quantities" }]
    },
    "classic-sourdough": {
      description: "A naturally leavened-style bread loaf for slicing and serving.",
      classification: "Bakery · Bread loaf",
      ingredients: "Wheat flour, water, and baking culture. Confirm the current recipe with the bakery.",
      allergens: "Contains or may contain wheat. Confirm cross-contact details with the bakery.",
      customization: [{ label: "Loaf quantity", value: "Ask about availability" }]
    },
    "soft-milk-bread": {
      description: "A soft, tender loaf with a lightly sweet milk-bread style.",
      classification: "Bakery · Soft bread",
      ingredients: "Wheat flour, milk, and other baking ingredients. Confirm the current recipe with the bakery.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Loaf quantity", value: "Ask about availability" }]
    },
    "cafe-meal": {
      description: "A cafe meal selection. Ask the bakery about today's menu and serving options.",
      classification: "Cafe · Meal",
      ingredients: "Menu varies. Ask the bakery for current ingredients before ordering.",
      allergens: "Menu varies. Ask the bakery to confirm allergen information before ordering.",
      customization: [{ label: "Today's selection", value: "Confirm with the bakery" }, { label: "Serving", value: "Ask about portions" }]
    },
    "signature-drink": {
      description: "A signature cafe drink prepared to order. Ask about current flavor and serving options.",
      classification: "Cafe · Beverage",
      ingredients: "Drink ingredients vary by selection. Confirm with the bakery.",
      allergens: "May contain milk or other allergens depending on selection. Confirm before ordering.",
      customization: [{ label: "Temperature", value: "Ask about hot or iced options" }, { label: "Milk", value: "Confirm available options" }]
    },
    "iced-chocolate": {
      description: "A chilled chocolate drink prepared by the cafe.",
      classification: "Cafe · Cold beverage",
      ingredients: "Chocolate drink base and milk or alternatives. Confirm the current recipe with the bakery.",
      allergens: "May contain milk and soy. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Sweetness", value: "Ask about available options" }, { label: "Milk", value: "Confirm available options" }]
    },
    "cafe-pasta": {
      description: "A creamy cafe pasta dish. Ask the bakery about today's availability and serving size.",
      classification: "Cafe · Savory meal",
      ingredients: "Recipe may vary. Ask the bakery to confirm current ingredients.",
      allergens: "May contain wheat, eggs, and milk. Confirm ingredients and cross-contact details with the bakery.",
      customization: [{ label: "Serving", value: "Confirm portion size with the bakery" }, { label: "Dietary needs", value: "Discuss with the bakery before ordering" }]
    },
    "celebration-catering": {
      description: "A catering tray intended for sharing at gatherings. Confirm selections and portions with the bakery.",
      classification: "Cafe · Catering tray",
      ingredients: "Contents depend on selected catering items. Confirm the final menu with the bakery.",
      allergens: "Allergens depend on selected items. Request the confirmed item-by-item allergen list.",
      customization: [{ label: "Selections", value: "Confirm menu and quantities with the bakery" }, { label: "Serving size", value: "Confirm portions with the bakery" }]
    }
  };

  const products = productSeeds.flatMap((rows, categoryIndex) => rows.map((row, index) => {
    const [id, name, amount, image] = row;
    const category = categories[categoryIndex].productCategories[0];
    const detail = productDetailById[id] || {
      description: `${name}, prepared by Angeliz Cakes. Ask the bakery about the current recipe and availability.`,
      classification: category,
      ingredients: "Ask the bakery to confirm the current recipe.",
      allergens: "Ask the bakery to confirm allergen information before ordering.",
      customization: [{ label: "Availability", value: "Confirm with the bakery" }]
    };
    return {
      id,
      name,
      category,
      price: amount === "Ask for pricing" ? amount : `₱${amount}`,
      image,
      description: detail.description,
      available: true,
      featured: categoryIndex === 0 && index === 0,
      details: { ...detail, reviews: [] }
    };
  }));

  const serviceCategories = [
    { id: "grazing", label: "Grazing Tables" },
    { id: "pastry", label: "Pastry Buffets" },
    { id: "party", label: "Party Packages" },
    { id: "bundle", label: "Food Bundles" }
  ];
  const services = [
    {
      id: "food-bundle-a", category: "bundle", title: "Food Bundle A",
      description: "A sharing bundle of Filipino party dishes and customized desserts.", image: "catering.jpg",
      pax: "20–30 Pax", price: "₱15,000",
      allowQuantityChanges: true,
      inclusions: ["Spaghetti Large Bilao", "Sotanghon Large", "Pasta White Sauce Medium", "Lumpia Shanghai (100 pcs)", "Puto Cheese (100 pcs)", "Beef Steak (2 kls)", "Fried Chicken (30 pcs)", "Graham de Leche (2 Tubs)", "Customized Cake according to theme (6\")", "1 Dozen Customized Cupcakes"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "food-bundle-c", category: "bundle", title: "Food Bundle C",
      description: "A large party bundle of savory favorites, drinks, cake, and desserts.", image: "meals.jpg",
      pax: "20–30 Pax", price: "₱20,000",
      allowQuantityChanges: true,
      inclusions: ["8\" Customized Cake", "1 Dozen Cupcakes", "1 Large Spaghetti", "1 Large Sotanghon", "1 Large Pasta White Sauce", "150 pcs. Lumpia Shanghai", "30 to 35 pcs. Fried Chicken", "100 pcs. Puto Cheese", "2 kls. Beef Steak", "35 pcs Barbecue", "Imperial Macau Milk Tea (30 pcs Small)", "2 Tubs Graham de Leche"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pinoy-pica-grazing-30", category: "grazing", title: "Pinoy Pica Foods Grazing Table · 30 Pax",
      description: "Booking-based Filipino pica-pica grazing table for 30 guests. Contact the bakery to confirm availability and price.", image: "catering.jpg",
      bookingOnly: true, pax: "30 Pax",
      inclusions: ["Mini Puto", "Kutsinta", "Biko", "Sapin-Sapin", "Mini Empanada", "Cassava", "Cheese Sticks", "Brownies", "Cookies", "Mini Cupcakes", "Assorted Fruits", "Assorted Biscuits", "Assorted Chips", "Mini Burgers", "Mini Sandwich", "Nuts", "Gelatin Shots", "Siomai", "Squidballs", "French Fries", "Fishballs", "Kikiam", "Kwek-Kwek", "2 Jars Juice in Jar (2 Flavors)"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pinoy-pica-grazing-50", category: "grazing", title: "Pinoy Pica Foods Grazing Table · 50 Pax",
      description: "Booking-based Filipino pica-pica grazing table for 50 guests. Contact the bakery to confirm availability and price.", image: "catering.jpg",
      bookingOnly: true, pax: "50 Pax",
      inclusions: ["Mini Puto", "Kutsinta", "Biko", "Sapin-Sapin", "Mini Empanada", "Cassava", "Cheese Sticks", "Brownies", "Cookies", "Mini Cupcakes", "Assorted Fruits", "Assorted Biscuits", "Assorted Chips", "Mini Burgers", "Mini Sandwich", "Nuts", "Gelatin Shots", "Siomai", "Squidballs", "French Fries", "Fishballs", "Kikiam", "Kwek-Kwek", "2 Jars Juice in Jar (2 Flavors)"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pinoy-pica-grazing-100", category: "grazing", title: "Pinoy Pica Foods Grazing Table · 100 Pax",
      description: "Booking-based Filipino pica-pica grazing table for 100 guests. Contact the bakery to confirm availability and price.", image: "catering.jpg",
      bookingOnly: true, pax: "100 Pax",
      inclusions: ["Mini Puto", "Kutsinta", "Biko", "Sapin-Sapin", "Mini Empanada", "Cassava", "Cheese Sticks", "Brownies", "Cookies", "Mini Cupcakes", "Assorted Fruits", "Assorted Biscuits", "Assorted Chips", "Mini Burgers", "Mini Sandwich", "Nuts", "Gelatin Shots", "Siomai", "Squidballs", "French Fries", "Fishballs", "Kikiam", "Kwek-Kwek", "2 Jars Juice in Jar (2 Flavors)"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pastry-buffet-24", category: "pastry", title: "Pastry Buffet · 24 Pax",
      description: "Booking-based themed pastry buffet for 24 guests. Contact the bakery to confirm availability and price.", image: "pastry-selection.jpg",
      bookingOnly: true, pax: "24 Pax",
      inclusions: ["1 Tiered Cake", "Cupcakes", "Cookies", "Cake Pops", "Doughnuts", "Swiss Meringue Giveaways", "Free use of tiers", "Setup of table according to theme"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pastry-buffet-30", category: "pastry", title: "Pastry Buffet · 30 Pax",
      description: "Booking-based themed pastry buffet for 30 guests. Contact the bakery to confirm availability and price.", image: "pastry-selection.jpg",
      bookingOnly: true, pax: "30 Pax",
      inclusions: ["2 Tiered Cake", "Cupcakes", "Cookies", "Cake Pops", "Doughnuts", "Swiss Meringue Giveaways", "Free use of tiers", "Setup of table according to theme"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "pastry-buffet-dessert-table", category: "pastry", title: "Pastry Buffet · Dessert Table",
      description: "Booking-based dessert buffet with set quantities. Contact the bakery to confirm availability and price.", image: "pastry-selection.jpg",
      bookingOnly: true,
      allowQuantityChanges: true,
      inclusions: ["50 pcs Cupcakes", "50 pcs Cookies", "50 pcs Cake Pops", "30 pcs Cake Jars", "Free use of tiers", "Free delivery according to theme"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "party-setup-a", category: "party", title: "Party Setup Package A",
      description: "A themed party setup with backdrop styling, balloons, and guest items.", image: "cakes.jpg",
      pax: "30 guests", price: "₱15,000",
      inclusions: ["Themed Backdrop according to theme", "Focal Table Styling with Center Piece", "Welcome Signage", "Balloon Towers", "Balloon Arc", "2 Kiddie Tables with Centerpiece", "30 pcs. Loot Bags", "30 pcs. Party Hats"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "party-package-15", category: "party", title: "Party Package",
      description: "A themed balloon focal area with cake, cupcakes, and loot bags.", image: "cakes.jpg",
      pax: "Pax to be confirmed", price: "₱15,000",
      inclusions: ["Balloon Decor Focal / Stage Area According to Theme", "1 Tier Cake", "2 Dozen Cupcakes", "20 pcs Lootbags"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "party-package-16", category: "party", title: "Party Package",
      description: "A themed party setup with cake, cupcakes, table centerpieces, and welcome arch.", image: "cakes.jpg",
      pax: "Pax to be confirmed", price: "₱16,000",
      inclusions: ["Balloon Decor Focal / Stage Area According to Theme", "1 Tier Cake", "2 Dozen Cupcakes", "Center Piece on Tables", "Welcome Arc Balloons with Welcome Banner"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "party-package-23", category: "party", title: "Party Package",
      description: "A larger themed party setup with a two-tier cake and cupcake selection.", image: "catering.jpg",
      pax: "Pax to be confirmed", price: "₱23,000",
      inclusions: ["Balloon Decor According to Theme", "2 Tier Cake", "3 Dozen Cupcakes", "Center Piece on Tables", "Welcome Arc Balloons with Welcome Banner"].map(name => ({ name, quantity: "1" }))
    },
    {
      id: "party-package-35", category: "party", title: "Party Package",
      description: "A full party package with themed decor, cake, loot bags, photo booth, and host.", image: "catering.jpg",
      pax: "Pax to be confirmed", price: "₱35,000",
      inclusions: ["Balloon Decor Focal / Stage Area According to Theme", "1 Tier Cake", "2 Dozen Cupcakes", "30 pcs Lootbags", "Center Piece on Tables", "Welcome Arc Balloons with Welcome Banner", "Photo Booth", "Clown Package", "Host Comedian"].map(name => ({ name, quantity: "1" }))
    }
  ];

  const gallery = [
    { name: "Signature Celebration Cake", category: "Cakes", image: "signature-cake.jpg" },
    { name: "Berry Tart", category: "Pastries", image: "pastry-selection.jpg" },
    { name: "Chocolate Dessert Cup", category: "Desserts", image: "chocolate-dessert.jpg" },
    { name: "Artisan Bread", category: "Bakery", image: "artisan-bread.jpg" },
    { name: "Cafe Favorites", category: "Cafe", image: "coffee.jpg" },
    { name: "Celebration Catering", category: "Catering", image: "catering.jpg" }
  ];

  const storefront = {
    settings: {
      brandName: "Angeliz Cakes",
      brandSubtitle: "Handcrafted cakes and sweets",
      logo: "brand-logo.jpg",
      heroSlides: [
        { name: "Signature Celebration Cake", image: "cakes.jpg" },
        { name: "Chocolate Drip Cake", image: "signature-cake.jpg" },
        { name: "Cupcake Collection", image: "chocolate-cake.jpg" }
      ],
      phone: "0917-187-8820",
      email: "mae_guiriba@yahoo.com",
      address: "Rizal Street, Legazpi City, Albay",
      hours: "Daily, 8:00 AM – 8:00 PM",
      availability: "Dine-in, Take-out & Online Delivery",
      socialLinks: [
        { name: "Facebook", url: "https://www.facebook.com/", image: "facebook.svg" },
        { name: "TikTok", url: "https://www.tiktok.com/", image: "tiktok.svg" }
      ]
    },
    categories,
    products,
    favorites: ["signature-cake", "berry-tart"],
    serviceCategories,
    services,
    gallery,
    feedbacks: [
      { id: "feedback-seed-1", name: "Maria L.", comment: "The cake was beautiful, fresh, and exactly what we ordered.", rating: 5 },
      { id: "feedback-seed-2", name: "Kevin R.", comment: "Lovely pastries and friendly service. We will be back.", rating: 5 },
      { id: "feedback-seed-3", name: "Ana P.", comment: "The chocolate cake was rich and perfect for our celebration.", rating: 4 },
      { id: "feedback-seed-4", name: "Joy C.", comment: "The dessert table made our family gathering extra special.", rating: 5 },
      { id: "feedback-seed-5", name: "Paolo M.", comment: "Fresh bakery treats and a cozy cafe experience.", rating: 4 }
    ],
    location: {
      name: "Cabangan Branch",
      description: "Main Hub & Production Studio, Cabangan, Legazpi City",
      image: "location.jpg",
      mapUrl: "https://maps.google.com/?q=Cabangan+Legazpi+City"
    },
    locations: [
      { name: "Cabangan Branch", address: "Cabangan, Legazpi City, Albay", phone: "0917-187-8820", hours: "Daily, 8:00 AM – 8:00 PM" },
      { name: "Rizal Street Studio", address: "Rizal Street, Legazpi City, Albay", phone: "0917-187-8820", hours: "Daily, 8:00 AM – 8:00 PM" }
    ],
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
    },
    paymentMethods: [
      { id: "gcash", name: "GCash", image: "payment-gcash.svg", enabled: true },
      { id: "maya", name: "Maya", image: "payment-maya.svg", enabled: true },
      { id: "qrph", name: "QRPh", image: "payment-qrph.svg", enabled: true },
      { id: "tonik", name: "Tonik", image: "payment-tonik.png", enabled: true },
      { id: "bpi", name: "BPI", image: "payment-bpi.svg", enabled: true },
      { id: "gotyme", name: "GoTyme", image: "payment-gotyme.svg", enabled: true },
      { id: "maribank", name: "MariBank", image: "payment-maribank.png", enabled: true }
    ],
    customization: {
      options: [
        { id: "occasion", label: "Occasion", values: ["Birthday", "Wedding", "Anniversary", "Christening", "Other"] },
        { id: "theme", label: "Theme & Color", values: ["Floral Elegance · Pink & White", "Minimalist · Ivory & Gold", "Garden Party · Pastel", "Custom theme"] },
        { id: "layers", label: "Layers per tier", values: ["1 layer per tier", "2 layers per tier", "3 layers per tier"] },
        { id: "tiers", label: "Cake tiers", values: ["1 tier", "2 tiers", "3 tiers"] },
        { id: "flavor", label: "Flavor", values: ["Vanilla", "Chocolate", "Red velvet", "Ube"] },
        { id: "frosting", label: "Frosting", values: ["Buttercream", "Whipped cream", "Fondant"] }
      ],
      maxReferenceImages: 3,
      maxReferenceImageBytes: 524288,
      defaultPickupLocationId: "cabangan-branch"
    },
    settings: {
      brandName: "Angeliz Cakes",
      brandSubtitle: "Handcrafted cakes and sweets",
      logo: "brand-logo.jpg",
      heroSlides: [
        { name: "Signature Celebration Cake", image: "cakes.jpg" },
        { name: "Chocolate Drip Cake", image: "signature-cake.jpg" },
        { name: "Cupcake Collection", image: "chocolate-cake.jpg" }
      ],
      phone: "0917-187-8820",
      email: "mae_guiriba@yahoo.com",
      address: "Rizal Street, Legazpi City, Albay",
      hours: "Daily, 8:00 AM – 8:00 PM",
      availability: "Dine-in, Take-out & Online Delivery",
      socialLinks: [
        { name: "Facebook", url: "https://www.facebook.com/", image: "facebook.svg" },
        { name: "TikTok", url: "https://www.tiktok.com/", image: "tiktok.svg" }
      ],
      favoritesEnabled: true,
      customCakeBuilderEnabled: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      currency: "PHP",
      locale: "en-PH",
      timezone: "Asia/Manila"
    },
    profiles: [
      { fullName: "Jamie Reyes", email: "jamie.reyes@example.test", phone: "09171234567", birthday: "1995-06-14", address: "Legazpi City, Albay", notes: "Prefers chocolate cakes.", emailVerified: true, phoneVerified: true, updatedAt: "2026-01-15T08:30:00.000Z" },
      { fullName: "Alex Santos", email: "alex.santos@example.test", phone: "09179876543", birthday: "1990-11-02", address: "Daraga, Albay", notes: "Please call before delivery.", emailVerified: true, phoneVerified: false, updatedAt: "2026-02-03T04:10:00.000Z" }
    ],
    orders: [
      {
        id: "order-seed-menu-2001", orderNumber: "AC-002001", referenceNumber: "AC-REF-2001", type: "product",
        title: "Signature Celebration Cake", productId: "signature-cake", status: "completed-preview",
        productionStatus: "Received", received: true, paymentStatus: "paid-preview",
        customerName: "Jamie Reyes", customerEmail: "jamie.reyes@example.test", customerPhone: "09171234567",
        createdAt: "2026-02-12T03:15:00.000Z", requestedFor: "2026-03-02 08:00",
        fulfillment: "pickup", paymentMethod: "GCash", total: "₱1,850.00",
        dedicationName: "Happy Birthday", cakeCharacter: "Chocolate cake", additionalInformation: "Please add pink piping."
      },
      {
        id: "order-seed-custom-2002", orderNumber: "AC-002002", referenceNumber: "AC-REF-2002", type: "custom-cake",
        title: "Fully Custom Cake", status: "in-production-preview", productionStatus: "In production", received: false,
        paymentStatus: "pending-preview", customerName: "Jamie Reyes", customerEmail: "jamie.reyes@example.test",
        contactNumber: "09171234567", createdAt: "2026-02-18T06:45:00.000Z", requestedFor: "2026-03-08 10:00",
        fulfillment: "delivery", deliveryAddress: "Legazpi City, Albay", paymentMethod: "Maya", total: "To be confirmed",
        dedication: "Happy 30th Birthday", notes: "Handle carefully.",
        selections: [
          { label: "Occasion", value: "Birthday" },
          { label: "Theme & Color", value: "Floral Elegance · Pink & White" },
          { label: "Layers per tier", value: "2 layers per tier" },
          { label: "Tiers", value: "2 tiers", letBakerDecideSizes: false, sizes: [{ tier: 1, height: "4", width: "8" }, { tier: 2, height: "4", width: "6" }] },
          { label: "Flavor", value: "Chocolate" },
          { label: "Frosting", value: "Buttercream" }
        ],
        referenceImages: [{ name: "Signature Celebration Cake", type: "image/jpeg", size: 32000, assetUrl: "../assets/signature-cake.jpg" }]
      },
      {
        id: "order-seed-package-2003", orderNumber: "AC-002003", referenceNumber: "AC-REF-2003", type: "package",
        title: "Garden Pastry Buffet", packageId: "garden-pastry-buffet", status: "in-production-preview",
        productionStatus: "In production", received: false, paymentStatus: "pending-preview",
        customerName: "Jamie Reyes", customerEmail: "jamie.reyes@example.test", customerPhone: "09171234567",
        createdAt: "2026-02-20T01:00:00.000Z", requestedFor: "2026-03-10 09:30",
        fulfillment: "delivery", deliveryAddress: "Legazpi City, Albay", paymentMethod: "GCash", total: "₱6,800.00",
        packageOffering: { id: "garden-pastry-buffet", title: "Garden Pastry Buffet", description: "A colorful pastry spread with tarts, croissants, and petite sweets." },
        items: [{ productId: "berry-tart", quantity: 12 }, { productId: "strawberry-danish", quantity: 12 }]
      }
    ],
    inquiries: [
      { id: "inquiry-seed-1", name: "Jamie Reyes", email: "jamie.reyes@example.test", subject: "Birthday cake inquiry", details: "Please share options for a chocolate birthday cake.", status: "replied-preview", createdAt: "2026-02-20T05:00:00.000Z" },
      { id: "inquiry-seed-2", name: "Alex Santos", email: "alex.santos@example.test", subject: "Catering availability", details: "Is catering available for a family gathering?", status: "new-preview", createdAt: "2026-02-22T08:20:00.000Z" }
    ],
    reviews: [
      { id: "customer-review-1", orderId: "order-seed-menu-2001", productId: "signature-cake", email: "jamie.reyes@example.test", name: "Jamie Reyes", rating: 5, comment: "Beautiful cake and fresh flavor.", status: "approved-preview", createdAt: "2026-02-10T05:00:00.000Z" },
      { id: "customer-review-2", productId: "berry-tart", name: "Alex Santos", rating: 4, comment: "Delicious tart with fresh berries.", status: "approved-preview", createdAt: "2026-02-16T02:45:00.000Z" }
    ],
    savedDesigns: [
      { id: "design-seed-1", name: "Pink floral birthday cake", selections: [{ label: "Occasion", value: "Birthday" }, { label: "Theme & Color", value: "Floral Elegance · Pink & White" }, { label: "Layers per tier", value: "2 layers per tier" }, { label: "Tiers", value: "2 tiers", letBakerDecideSizes: false, sizes: [{ tier: 1, height: "4", width: "6" }, { tier: 2, height: "4", width: "4" }] }, { label: "Flavor", value: "Vanilla" }, { label: "Frosting", value: "Buttercream" }], referenceImages: [{ name: "signature-cake.jpg", type: "image/jpeg", size: 32000, assetUrl: "../assets/signature-cake.jpg" }], createdAt: "2026-02-11T01:30:00.000Z" }
    ],
    packageSelections: []
  };

  window.angelizStorefrontDatabase = storefront;
  window.angelizStorefrontProducts = products;
  window.angelizStorefrontServices = services;
})();
