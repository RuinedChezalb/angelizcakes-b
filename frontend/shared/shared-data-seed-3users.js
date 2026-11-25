(() => {
  'use strict';

  const STORAGE_KEY = 'angeliz_three_user_shared_database_v1';
  const CHANGE_EVENT = 'angeliz-shared-database-changed';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const makeId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const categories = [
    { id: 'cakes', label: 'Cakes', productCategories: ['Cakes'], sortOrder: 1 },
    { id: 'pastries', label: 'Pastries', productCategories: ['Pastries'], sortOrder: 2 },
    { id: 'desserts', label: 'Desserts', productCategories: ['Desserts'], sortOrder: 3 },
    { id: 'bakery', label: 'Bakery', productCategories: ['Bakery'], sortOrder: 4 },
    { id: 'cafe', label: 'Cafe', productCategories: ['Cafe'], sortOrder: 5 }
  ];
  const productSeeds = [
    [['signature-cake','Signature Celebration Cake','₱1,850.00','signature-cake.jpg'],['bento-cake','Personalized Bento Cake','₱650.00','chocolate-cake.jpg'],['chocolate-drip-cake','Chocolate Drip Cake','₱1,550.00','cakes.jpg'],['berry-celebration-cake','Berry Celebration Cake','₱1,750.00','signature-cake.jpg'],['vanilla-layer-cake','Vanilla Layer Cake','₱1,400.00','chocolate-cake.jpg']],
    [['butter-croissant','Butter Croissant','₱95.00','pastry-selection.jpg'],['ensaymada','Cheese Ensaymada','₱85.00','artisan-bread.jpg'],['berry-tart','Berry Tart','₱145.00','pastry-selection.jpg'],['cookies','Chocolate Chip Cookies','₱60.00','chocolate-dessert.jpg'],['cinnamon-roll','Cinnamon Roll','₱110.00','artisan-bread.jpg']],
    [['chocolate-dessert','Chocolate Dessert Cup','₱120.00','chocolate-dessert.jpg'],['leche-flan','Leche Flan','₱100.00','chocolate-dessert.jpg'],['cheesecake-slice','Cheesecake Slice','₱150.00','cakes.jpg'],['brownie','Fudge Brownie','₱75.00','chocolate-dessert.jpg'],['fruit-cup','Fresh Fruit Cup','₱90.00','pastry-selection.jpg']],
    [['artisan-bread','Artisan Bread','₱120.00','artisan-bread.jpg'],['pandesal','Pandesal Pack','₱55.00','artisan-bread.jpg'],['garlic-loaf','Garlic Loaf','₱90.00','artisan-bread.jpg'],['milk-bread','Milk Bread','₱100.00','artisan-bread.jpg'],['bread-rolls','Dinner Rolls','₱80.00','artisan-bread.jpg']],
    [['coffee','Cafe Coffee','₱95.00','coffee.jpg'],['iced-latte','Iced Latte','₱120.00','coffee.jpg'],['tea','House Tea','₱80.00','coffee.jpg'],['frappe','Chocolate Frappe','₱150.00','chocolate-dessert.jpg'],['hot-chocolate','Hot Chocolate','₱110.00','coffee.jpg']]
  ];
  const products = productSeeds.flatMap((group, categoryIndex) => group.map(([id,name,price,image],index) => ({
    id,name,category:categories[categoryIndex].productCategories[0],price,image,available:true,featured:categoryIndex===0&&index===0,
    description:`${name}, prepared by Angeliz Cakes. Ask the bakery about current availability.`,
    details:{description:`${name}, prepared by Angeliz Cakes.`,classification:categories[categoryIndex].label,ingredients:'Contact the bakery for the current ingredient list.',allergens:'Confirm allergen information with the bakery.',customization:[]}
  })));

  const services = [
    {id:'food-bundle-a',category:'bundle',title:'Food Bundle A',description:'A sharing bundle of party dishes and desserts.',image:'catering.jpg',pax:'20–30 Pax',price:'₱15,000',itemIds:[],inclusions:[{name:'Spaghetti',quantity:'1 set'},{name:'Customized Cake',quantity:'1'}]},
    {id:'party-setup-a',category:'party',title:'Party Setup Package A',description:'Themed party setup with backdrop styling and guest items.',image:'cakes.jpg',pax:'30 guests',price:'₱15,000',itemIds:[],inclusions:[{name:'Themed Backdrop',quantity:'1'},{name:'Balloon Decor',quantity:'1 set'}]},
    {id:'pastry-buffet-30',category:'pastry',title:'Pastry Buffet · 30 Pax',description:'Booking-based themed pastry buffet; bakery confirms price.',image:'pastry-selection.jpg',bookingOnly:true,pax:'30 Pax',itemIds:[],inclusions:[{name:'Tiered Cake',quantity:'1'},{name:'Cupcakes',quantity:'1 dozen'},{name:'Cookies',quantity:'1 set'}]},
    {id:'grazing-table-30',category:'grazing',title:'Grazing Table · 30 Pax',description:'Booking-based grazing table; bakery confirms availability and price.',image:'catering.jpg',bookingOnly:true,pax:'30 Pax',itemIds:[],inclusions:[{name:'Cheese Selection',quantity:'1 set'},{name:'Fresh Fruit',quantity:'2 platters'}]}
  ];
  const serviceCategories = [
    {id:'bundle',label:'Food Bundles',sortOrder:1},{id:'party',label:'Party Packages',sortOrder:2},
    {id:'pastry',label:'Pastry Buffets',sortOrder:3},{id:'grazing',label:'Grazing Tables',sortOrder:4}
  ];
  const seedDatabase = {
    schemaVersion:1,
    users:[
      {id:'customer-demo',role:'customer',name:'Jamie Reyes',email:'jamie.reyes@example.test'},
      {id:'branch-admin-demo',role:'branch-admin',name:'Maria Santos',branchName:'Yashano Mall Branch',email:'branch@example.test'},
      {id:'owner-admin-demo',role:'owner-admin',name:'Owner Admin',email:'owner@example.test'}
    ],
    settings:{brandName:'Angeliz Cakes',brandSubtitle:'CAKES',logo:'brand-logo.jpg',hours:'Daily, 8:00 AM – 8:00 PM',currency:'PHP',locale:'en-PH',timezone:'Asia/Manila',favoritesEnabled:true,customCakeBuilderEnabled:true,deliveryEnabled:true,pickupEnabled:true,heroSlides:[{name:'Signature Celebration Cake',image:'cakes.jpg'}],socialLinks:[{name:'Facebook',url:'https://www.facebook.com/',image:'facebook.svg'},{name:'TikTok',url:'https://www.tiktok.com/',image:'tiktok.svg'}]},
    categories,products,services,serviceCategories,
    gallery:[{name:'Signature Celebration Cake',category:'Cakes',image:'signature-cake.jpg'},{name:'Artisan Bread',category:'Bakery',image:'artisan-bread.jpg'},{name:'Cafe Favorites',category:'Cafe',image:'coffee.jpg'},{name:'Celebration Catering',category:'Catering',image:'catering.jpg'},{name:'Pastry Selection',category:'Pastries',image:'pastry-selection.jpg'},{name:'Chocolate Dessert',category:'Desserts',image:'chocolate-dessert.jpg'}],
    feedbacks:[{id:'review-seed-1',name:'Jamie Reyes',rating:5,comment:'Beautiful cake and fresh flavor.',productId:'signature-cake'}],
    reviews:[],profiles:[{fullName:'Jamie Reyes',email:'jamie.reyes@example.test',phone:'09171234567',address:'Legazpi City, Albay'}],
    favorites:[],orders:[
      {id:'seed-booking-001',orderNumber:'AC-2001',referenceNumber:'AC-REF-2001',recordType:'booking',type:'package',title:'Pastry Buffet · 30 Pax',packageId:'pastry-buffet-30',bookingOnly:true,bookingStatus:'Confirmed',status:'confirmed-preview',productionStatus:'Confirmed',paymentStatus:'unpaid-booking',priceStatus:'confirmed-preview',confirmedPrice:'₱16,000',total:'₱16,000',customerName:'Jamie Reyes',customerEmail:'jamie.reyes@example.test',customerPhone:'09171234567',branchName:'Yashano Mall Branch',createdAt:'2026-02-21T03:20:00.000Z',requestedFor:'2026-03-12 10:00',deliveryDate:'2026-03-12',deliveryTime:'10:00',fulfillment:'delivery',deliveryAddress:'Legazpi City, Albay',packageOffering:{id:'pastry-buffet-30',title:'Pastry Buffet · 30 Pax',image:'pastry-selection.jpg'},items:[],inclusions:[{name:'Tiered Cake',quantity:'1'},{name:'Cupcakes',quantity:'1 dozen'}]},
      {id:'seed-order-001',orderNumber:'AC-2002',referenceNumber:'AC-REF-2002',recordType:'order',type:'product',title:'Signature Celebration Cake',status:'completed-preview',productionStatus:'Completed',paymentStatus:'paid-preview',paymentMethod:'GCash',total:'₱1,850.00',customerName:'Jamie Reyes',customerEmail:'jamie.reyes@example.test',branchName:'Main Branch',createdAt:'2026-02-12T03:15:00.000Z',requestedFor:'2026-03-02 08:00',fulfillment:'pickup',product:{name:'Signature Celebration Cake',image:'signature-cake.jpg'}}
    ],
    inquiries:[{id:'inquiry-seed-1',name:'Jamie Reyes',email:'jamie.reyes@example.test',subject:'Birthday cake inquiry',details:'Please share options for a chocolate birthday cake.',status:'new-preview',createdAt:'2026-02-20T05:00:00.000Z'}],
    savedDesigns:[],packageSelections:[],dailyBranchReports:[],deliveries:[],inventory:[],posTransactions:[],
    location:{name:'Angeliz Cakes Main Hub',description:'Main Hub & Production Studio, Cabangan, Legazpi City',image:'location.jpg',mapUrl:'https://maps.google.com/?q=Cabangan+Legazpi+City'},
    locations:[{name:'Cabangan Branch',address:'Cabangan, Legazpi City, Albay',phone:'0917-187-8820',hours:'Daily, 8:00 AM - 8:00 PM'},{name:'Yashano Mall Branch',address:'Legazpi City, Albay',phone:'0917-187-8820',hours:'Mall hours'}],
    about:{name:'Angeliz Cakes',description:'Handcrafted cakes, pastries, cafe favorites, and catering.',hours:'Daily, 8:00 AM – 8:00 PM',availability:'Custom orders by request.',location:'Legazpi City, Albay',image:'bakery-about.jpg'},
    contact:{phone:'0917-187-8820',email:'mae_guiriba@yahoo.com',address:'Rizal Street, Legazpi City, Albay'},
    paymentMethods:[{id:'gcash',name:'GCash',image:'payment-gcash.svg',enabled:true},{id:'maya',name:'Maya',image:'payment-maya.svg',enabled:true},{id:'qrph',name:'QRPh',image:'payment-qrph.svg',enabled:true},{id:'bpi',name:'BPI',image:'payment-bpi.svg',enabled:true}],
    customization:{options:[],defaultPickupLocationId:'cabangan-branch'}
  };

  const databaseKey = 'angeliz_shared_database_3users_v1';
  const changeEvent = 'angeliz-shared-database-change';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const idFor = collection => `${collection}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function validDatabase(value) {
    return value && value.schemaVersion === seedDatabase.schemaVersion
      && Array.isArray(value.users) && Array.isArray(value.products) && Array.isArray(value.orders)
      && Array.isArray(value.profiles) && Array.isArray(value.inquiries);
  }

  function persist() {
    try {
      localStorage.setItem(databaseKey, JSON.stringify(database));
      window.dispatchEvent(new CustomEvent(changeEvent, { detail:{ databaseKey } }));
    } catch (error) {
      console.error('Could not save shared mock database.', error);
      throw new Error('Shared mock database storage is unavailable.');
    }
  }

  function initialize() {
    try {
      const stored = JSON.parse(localStorage.getItem(databaseKey) || 'null');
      if (validDatabase(stored)) return stored;
      if (stored !== null) console.warn('Shared mock database has an unknown schema; starting with seed records.');
    } catch (error) {
      console.warn('Shared mock database storage is unreadable; starting with seed records.', error);
    }
    localStorage.setItem(databaseKey, JSON.stringify(seedDatabase));
    return seedDatabase;
  }

  const database = initialize();
  function list(collection, predicate = () => true) {
    if (!Array.isArray(database[collection])) throw new RangeError(`Unknown database collection: ${collection}`);
    return clone(database[collection].filter(predicate));
  }
  function get(collection, id) {
    const row = (database[collection] || []).find(item => item.id === id);
    return clone(row || null);
  }
  function create(collection, input) {
    if (!Array.isArray(database[collection])) throw new RangeError(`Unknown database collection: ${collection}`);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Create payload must be an object.');
    const row = { id:idFor(collection), createdAt:new Date().toISOString(), ...clone(input) };
    database[collection].unshift(row);
    persist();
    return clone(row);
  }
  function update(collection, id, patch) {
    if (!Array.isArray(database[collection])) throw new RangeError(`Unknown database collection: ${collection}`);
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw new TypeError('Update patch must be an object.');
    const index = database[collection].findIndex(item => item.id === id);
    if (index < 0) throw new RangeError(`${collection} record ${id} was not found.`);
    database[collection][index] = { ...database[collection][index], ...clone(patch), id, updatedAt:new Date().toISOString() };
    persist();
    return clone(database[collection][index]);
  }
  function remove(collection, id) {
    if (!Array.isArray(database[collection])) throw new RangeError(`Unknown database collection: ${collection}`);
    const index = database[collection].findIndex(item => item.id === id);
    if (index < 0) return false;
    database[collection].splice(index, 1);
    persist();
    return true;
  }
  function updateOrder(id, patch) {
    const index = database.orders.findIndex(order => order.id === id || order.orderNumber === id || order.referenceNumber === id);
    if (index < 0) throw new RangeError(`Order ${id} was not found.`);
    database.orders[index] = { ...database.orders[index], ...clone(patch), updatedAt:new Date().toISOString() };
    persist();
    return clone(database.orders[index]);
  }
  function readSession() {
    try { return JSON.parse(localStorage.getItem('angeliz_customer_session') || 'null'); }
    catch (error) { return null; }
  }

  const routes = {
    '/api/storefront/settings': () => database.settings,
    '/api/storefront/categories': () => database.categories,
    '/api/storefront/products': () => database.products,
    '/api/storefront/services': () => database.services,
    '/api/storefront/service-categories': () => database.serviceCategories,
    '/api/storefront/gallery': () => database.gallery,
    '/api/storefront/reviews': () => database.feedbacks,
    '/api/storefront/location': () => database.location,
    '/api/storefront/locations': () => database.locations,
    '/api/storefront/about': () => database.about,
    '/api/storefront/contact': () => database.contact,
    '/api/storefront/payment-methods': () => database.paymentMethods,
    '/api/storefront/favorites': () => database.favorites,
    '/api/storefront/profiles': () => database.profiles,
    '/api/storefront/orders': () => database.orders,
    '/api/storefront/inquiries': () => database.inquiries,
    '/api/storefront/reviews/customer': () => database.reviews,
    '/api/storefront/saved-designs': () => database.savedDesigns,
    '/api/storefront/packages': () => database.services,
    '/api/storefront/package-selections': () => database.packageSelections,
    '/api/storefront/customization-options': () => database.customization.options,
    '/api/storefront/session': () => readSession()
  };

  function post(path, payload = {}) {
    if (path === '/api/storefront/orders') {
      if (!payload || typeof payload.type !== 'string') throw new TypeError('Order type is required.');
      const bookingOnly = Boolean(payload.bookingOnly);
      const now = new Date();
      const order = {
        id:idFor('order'), orderNumber:`AC-${String(now.getTime()).slice(-8)}`, referenceNumber:`AC-REF-${now.getTime()}`,
        ...clone(payload), recordType:bookingOnly?'booking':'order', bookingOnly,
        status:bookingOnly?'booking-requested-preview':'in-production-preview',
        productionStatus:bookingOnly?'Booking Requested':'In production',
        bookingStatus:bookingOnly?'Booking Requested':'',
        paymentStatus:bookingOnly?'unpaid-booking':(payload.paymentStatus||'pending-preview'),
        priceStatus:payload.priceStatus||(bookingOnly?'pending-bakery-confirmation':'fixed-package-price'),
        createdAt:now.toISOString()
      };
      if (bookingOnly) { order.packagePrice=''; order.total='Price to be confirmed'; }
      database.orders.unshift(order); persist(); return order;
    }
    if (path === '/api/storefront/saved-designs') {
      const design=create('savedDesigns',payload); return design;
    }
    if (path === '/api/storefront/inquiries') {
      if (!String(payload.name||'').trim()||!String(payload.email||'').trim()||!String(payload.details||'').trim()) throw new TypeError('Inquiry name, email, and details are required.');
      return create('inquiries',{...payload,status:'new-preview'});
    }
    if (path === '/api/storefront/favorites') {
      if (!Array.isArray(payload.productIds)) throw new TypeError('Favorites must be an array.');
      database.favorites=[...new Set(payload.productIds.filter(id=>database.products.some(product=>product.id===id)))];persist();return {productIds:clone(database.favorites)};
    }
    if (path === '/api/storefront/profiles') {
      const profile=payload.profile||payload;if(!profile.email)throw new TypeError('Profile email is required.');
      const index=database.profiles.findIndex(item=>item.email.toLowerCase()===String(profile.email).toLowerCase());
      if(index<0)return create('profiles',profile);
      return update('profiles',database.profiles[index].id,profile);
    }
    if (path === '/api/storefront/package-selections') {
      const index=database.packageSelections.findIndex(item=>item.packageId===payload.packageId);
      if(index<0)return create('packageSelections',payload);
      return update('packageSelections',database.packageSelections[index].id,payload);
    }
    if (path === '/api/storefront/orders/confirm-booking') {
      const order=database.orders.find(item=>item.id===payload.orderId);if(!order||!order.bookingOnly)throw new RangeError('Booking order not found.');
      if(!String(payload.confirmedPrice||'').trim())throw new TypeError('A confirmed booking price is required.');
      Object.assign(order,{confirmedPrice:payload.confirmedPrice,priceStatus:'confirmed-preview',status:'confirmed-preview',productionStatus:'Confirmed',bookingStatus:'Confirmed',paymentStatus:order.paymentStatus==='paid-preview'?'paid-preview':'unpaid-booking'});persist();return clone(order);
    }
    if (path === '/api/storefront/orders/payment') {
      const order=database.orders.find(item=>item.id===payload.orderId);if(!order||!order.bookingOnly||order.status!=='confirmed-preview')throw new RangeError('Confirmed booking not found.');
      Object.assign(order,{paymentMethod:payload.paymentMethod,paymentStatus:'paid-preview',paidAt:new Date().toISOString()});persist();return clone(order);
    }
    throw new Error(`No POST route for ${path}`);
  }
  function put(path,payload={}) {
    const match=/^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);
    if(!match)throw new Error(`No PUT route for ${path}`);
    const collection={orders:'orders',products:'products',services:'services',inquiries:'inquiries'}[match[1]];
    if(collection==='orders')return updateOrder(decodeURIComponent(match[2]),payload);
    return update(collection,decodeURIComponent(match[2]),payload);
  }
  function del(path) {
    const match=/^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);
    if(!match)throw new Error(`No DELETE route for ${path}`);
    return remove(match[1],decodeURIComponent(match[2]));
  }
  const api={
    async get(path){if(path==='/api/storefront')return clone(database);const route=routes[path];if(route)return clone(route());const m=/^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);if(m){const collection=m[1];return get(collection,decodeURIComponent(m[2]));}throw new Error(`No GET route for ${path}`)},
    async post(path,payload){return clone(post(path,payload))},
    async put(path,payload){return clone(put(path,payload))},
    async patch(path,payload){return clone(put(path,payload))},
    async delete(path){return del(path)}
  };

  window.AngelizSharedDatabase={key:databaseKey,eventName:changeEvent,database,users:clone(database.users),list,get,create,update,delete:remove,updateOrder};
  window.storefrontApi=Object.freeze(api);
  window.storefrontDatabase=database;
  window.dispatchEvent(new CustomEvent(changeEvent,{detail:{initialized:true}}));
})();
