
/* ---------- helpers ---------- */
function openModal(id){document.getElementById(id).classList.add('show');}
function closeModal(id){document.getElementById(id).classList.remove('show');}

/* ---------- Customization Steps (data-driven) ---------- */
let steps = [
  { id: 1, name: 'Occasion', options: [
    { label: 'Birthday', price: 2200 }, { label: 'Wedding', price: 6500 },
    { label: 'Anniversary', price: 2800 }, { label: 'Christening', price: 2500 }
  ] },
  { id: 2, name: 'Theme & Color', options: [
    { label: 'Floral Elegance · Pink & White', price: 2800 },
    { label: 'Minimalist', price: 2200 }, { label: 'Classic', price: 2800 },
    { label: 'Themed', price: 3200 }
  ] },
  { id: 3, name: 'Layers per tier', options: [
    { label: '1 layer per tier', price: 1950 }, { label: '2 layers per tier', price: 2200 },
    { label: '3 layers per tier', price: 2800 }, { label: '4 layers per tier', price: 3500 }
  ] },
  { id: 4, name: 'Tiers', options: [
    { label: '1 tier', price: 2200 }, { label: '2 tiers', price: 4500 },
    { label: '3 tiers', price: 6500 }
  ] },
  { id: 5, name: 'Flavor', options: [
    { label: 'Vanilla', price: 2200 }, { label: 'Chocolate', price: 1950 },
    { label: 'Red Velvet', price: 2200 }, { label: 'Ube', price: 2300 }
  ] },
  { id: 6, name: 'Frosting', options: [
    { label: 'Buttercream', price: 2200 }, { label: 'Fondant', price: 2800 },
    { label: 'Fresh Cream', price: 2200 }
  ] }
];

const escapeStepText = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function renderSteps() {
  const container = document.getElementById('stepRows');
  container.className = 'steps-grid';
  container.innerHTML = steps.map((s, i) => `
    <div class="step-chip">
      <div class="step-chip-top">
        <span class="tag">Step ${i+1}</span>
        <button class="btn btn-outline btn-sm" onclick="openManageStepsModal(${s.id})">Edit</button>
      </div>
      <div class="strong" style="font-size:13px;margin:6px 0 2px;">${escapeStepText(s.name)}</div>
    </div>
  `).join('');
}

let draftOptions = [];

function openManageStepsModal(stepId) {
  const select = document.getElementById('stepSelect');
  select.innerHTML = steps.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  if (stepId) select.value = stepId;
  loadStepOptions();
  openModal('manageStepsModal');
}

function loadStepOptions() {
  const id = Number(document.getElementById('stepSelect').value);
  const step = steps.find(s => s.id === id);
  draftOptions = step ? step.options.map(option => ({ ...option })) : [];
  document.getElementById('newOptionInput').value = '';
  document.getElementById('newOptionPrice').value = '';
  renderOptionsList();
}

function renderOptionsList() {
  const box = document.getElementById('optionList');
  if (!draftOptions.length) {
    box.innerHTML = '<span class="muted" style="font-size:12px;text-align:center;">No options yet.</span>';
    return;
  }
  box.innerHTML = draftOptions.map((option, i) =>
    `<div class="option-item">
      <span>${escapeStepText(option.label)}</span>
      <input type="number" min="0" step="0.01" value="${option.price ?? ''}" placeholder="Set price" aria-label="Price in PHP for ${escapeStepText(option.label)}" onchange="updateOptionPrice(${i}, this.value)">
      <button type="button" onclick="removeOption(${i})" title="Delete option"><i class="fa-solid fa-trash"></i></button>
    </div>`
  ).join('');
}

function updateOptionPrice(i, value) {
  const option = draftOptions[i];
  if (!option) return;
  const amount = value.trim();
  if (!amount) {
    option.price = null;
    return;
  }
  const price = Number(amount);
  if (!Number.isFinite(price) || price < 0) {
    alert('Enter a non-negative sample price.');
    renderOptionsList();
    return;
  }
  option.price = price;
}

function removeOption(i) {
  draftOptions.splice(i, 1);
  renderOptionsList();
}

function addOption() {
  const input = document.getElementById('newOptionInput');
  const priceInput = document.getElementById('newOptionPrice');
  const val = input.value.trim();
  if (!val) return;
  if (draftOptions.some(option => option.label.toLowerCase() === val.toLowerCase())) {
    alert('Option already exists.');
    return;
  }
  const priceText = priceInput.value.trim();
  const price = priceText ? Number(priceText) : null;
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    alert('Enter a non-negative sample price.');
    return;
  }
  draftOptions.push({ label: val, price });
  input.value = '';
  priceInput.value = '';
  renderOptionsList();
}

function saveStepOptions() {
  const id = Number(document.getElementById('stepSelect').value);
  const step = steps.find(s => s.id === id);
  if (!step) return;
  step.options = draftOptions.map(option => ({ ...option }));
  renderSteps();
  closeModal('manageStepsModal');
}

/* ---------- Cake presets (data-driven) ---------- */
const placeholderImg = 'https://placehold.co/80x80/FCE4EA/B85A7A?text=Cake';

const DETAIL_KEYS = ['occasion','canvas','layers','flavor','frosting','theme','personalize'];
const DETAIL_INPUTS = {
  occasion:'d-occasion', canvas:'d-canvas', layers:'d-layers',
  flavor:'d-flavor', frosting:'d-frosting', theme:'d-theme', personalize:'d-personalize'
};

let cakes = [
  {
    id: 1, name: 'Sakura Tier Cake', price: 2800, status: 'Active', image: placeholderImg, classification: 'Buttercream Cake',
    details: { occasion: 'Birthday', canvas: '8" round, two tiers', layers: '3 layers of vanilla sponge', flavor: 'Vanilla with strawberry cream filling', frosting: 'Soft pastel buttercream, sakura flowers', theme: 'Spring garden with gold accents', personalize: '“Happy 16th, Mia!”' },
    ingredients: 'Flour, sugar, eggs, butter, milk, vanilla extract, food coloring', allergens: 'Milk, Eggs, Wheat, Soy'
  },
  {
    id: 2, name: 'Wedding Elegance', price: 6500, status: 'Active', image: placeholderImg, classification: 'Fondant Cake',
    details: { occasion: 'Wedding', canvas: '10" round, three tiers', layers: '3 layers of chocolate sponge', flavor: 'Chocolate with mocha buttercream', frosting: 'Ivory fondant with lace and fresh roses', theme: 'Classic elegance, all-white', personalize: '“Mr. & Mrs. Dela Cruz”' },
    ingredients: 'Flour, sugar, eggs, butter, milk, cocoa, fondant, edible lace', allergens: 'Milk, Eggs, Wheat, Soy'
  },
  {
    id: 3, name: 'Pastel Buttercream', price: 2200, status: 'Active', image: placeholderImg, classification: 'Buttercream Cake',
    details: { occasion: 'Celebration', canvas: '8" round, single tier', layers: '3 layers of red velvet sponge', flavor: 'Red velvet with cream cheese filling', frosting: 'Pastel buttercream swirls and sprinkles', theme: 'Pastel party', personalize: '“Congratulations!”' },
    ingredients: 'Flour, sugar, eggs, butter, milk, cocoa, cream cheese, food coloring', allergens: 'Milk, Eggs, Wheat'
  },
  {
    id: 4, name: 'Chocolate Drip', price: 1950, status: 'Draft', image: placeholderImg, classification: 'Drip Cake',
    details: { occasion: 'Birthday', canvas: '6" round, single tier', layers: '3 layers of chocolate sponge', flavor: 'Dark chocolate with ganache filling', frosting: 'Glossy chocolate drip with shards', theme: 'Chocolate lover', personalize: '“Happy Birthday, Josh!”' },
    ingredients: 'Flour, sugar, eggs, butter, cocoa powder, milk, chocolate', allergens: 'Milk, Eggs, Wheat, Soy'
  }
];

/* Presets, packages, and products are saved to the shared local database that the storefront reads. */
cakes = window.AngelizDB.catalog.readPresets(cakes);

function persistPresets() {
  if (!window.AngelizDB.catalog.savePresets(cakes)) {
    alert('The cake presets could not be saved. Browser storage may be full; try a smaller image.');
  }
}

let editingCakeId = null;
let pendingImageData = null;

function renderCakeTable() {
  const tbody = document.getElementById('cakeSelectionRows');
  tbody.innerHTML = cakes.map(c => {
    const badge = c.status === 'Active' ? 'badge-teal' : 'badge-gray';
    return `<tr>
      <td><img class="table-img" src="${c.image || placeholderImg}" alt="${c.name}"></td>
      <td class="strong">${c.name}</td>
      <td>₱${Number(c.price).toLocaleString()}</td>
      <td><span class="badge ${badge}">${c.status}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-sm" onclick="editCake(${c.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCake(${c.id})">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('kpiCakes').textContent = cakes.length;
}

function deleteCake(id) {
  if (!confirm('Are you sure you want to delete this cake preset selection?')) return;
  cakes = cakes.filter(c => c.id !== id);
  persistPresets();
  renderCakeTable();
}

function previewCakeImage(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    pendingImageData = ev.target.result;
    document.getElementById('cakeImgPreview').innerHTML = `<img src="${pendingImageData}" alt="Preview">`;
  };
  reader.readAsDataURL(file);
}

function fillDetails(details) {
  DETAIL_KEYS.forEach(k => {
    document.getElementById(DETAIL_INPUTS[k]).value = details && details[k] ? details[k] : '';
  });
}

function readDetails() {
  const out = {};
  DETAIL_KEYS.forEach(k => { out[k] = document.getElementById(DETAIL_INPUTS[k]).value.trim(); });
  return out;
}

function openCakeModal() {
  document.getElementById('cakeModalTitle').textContent = 'Add Custom Cake Preset Selection';
  editingCakeId = null;
  pendingImageData = null;
  document.getElementById('cakeImgPreview').innerHTML = 'No image selected';
  document.getElementById('cakeImage').value = '';
  document.getElementById('cakeName').value = 'Sakura Tier Cake';
  document.getElementById('cakePrice').value = '2800';
  document.getElementById('cakeClassification').value = 'Buttercream Cake';
  fillDetails({
    occasion: 'Birthday', canvas: '8" round, two tiers', layers: '3 layers of vanilla sponge',
    flavor: 'Vanilla with strawberry cream filling', frosting: 'Soft pastel buttercream, sakura flowers',
    theme: 'Spring garden with gold accents', personalize: '“Happy 16th, Mia!”'
  });
  document.getElementById('cakeIngredients').value = 'Flour, sugar, eggs, butter, milk, vanilla extract, food coloring';
  document.getElementById('cakeAllergens').value = 'Milk, Eggs, Wheat, Soy';
  document.getElementById('cakeStatus').value = 'Active';
  openModal('cakeModal');
}

function editCake(id) {
  const cake = cakes.find(c => c.id === id);
  if (!cake) return;
  editingCakeId = id;
  pendingImageData = null;
  document.getElementById('cakeModalTitle').textContent = 'Edit Custom Cake Preset Selection';
  document.getElementById('cakeImgPreview').innerHTML = cake.image ? `<img src="${cake.image}" alt="Preview">` : 'No image selected';
  document.getElementById('cakeImage').value = '';
  document.getElementById('cakeName').value = cake.name;
  document.getElementById('cakePrice').value = cake.price;
  document.getElementById('cakeClassification').value = cake.classification;
  fillDetails(cake.details);
  document.getElementById('cakeIngredients').value = cake.ingredients;
  document.getElementById('cakeAllergens').value = cake.allergens;
  document.getElementById('cakeStatus').value = cake.status;
  openModal('cakeModal');
}

function saveCake() {
  const name = document.getElementById('cakeName').value.trim();
  const price = document.getElementById('cakePrice').value;
  const classification = document.getElementById('cakeClassification').value;
  const details = readDetails();
  const ingredients = document.getElementById('cakeIngredients').value.trim();
  const allergens = document.getElementById('cakeAllergens').value.trim();
  const status = document.getElementById('cakeStatus').value;

  if (!name || !price || !ingredients || !allergens) {
    alert('Please fill in Cake Name, Price, Ingredients, and Allergens.');
    return;
  }

  const image = pendingImageData || (editingCakeId ? cakes.find(c => c.id === editingCakeId).image : placeholderImg);

  if (editingCakeId) {
    const c = cakes.find(c => c.id === editingCakeId);
    Object.assign(c, { name, price: Number(price), classification, details, ingredients, allergens, status, image });
  } else {
    const newId = cakes.length ? Math.max(...cakes.map(c => c.id)) + 1 : 1;
    cakes.push({ id: newId, name, price: Number(price), classification, details, ingredients, allergens, status, image });
  }
  persistPresets();
  renderCakeTable();
  closeModal('cakeModal');
}

/* ---------- Offerings Data & Logic ---------- */
let offerings = {
  grazing: [
    { id: 1, name: 'Sakura Grazing Table', pax: '20–30', price: 8500, desc: 'A beautiful grazing spread with assorted cheeses and fruits.', inclusions: [{qty: '1 set', name: 'Assorted Cheeses'}, {qty: '2 platters', name: 'Fresh Fruits'}] },
    { id: 2, name: 'Teal Celebration Table', pax: '30–50', price: 12000, desc: 'Perfect for larger celebrations.', inclusions: [{qty: '1', name: 'Premium Charcuterie Board'}] }
  ],
  pastry: [
    { id: 3, name: 'Sweet Sakura Buffet', pax: '30–50', price: 9800, desc: 'Assorted pastries and sweets.', inclusions: [{qty: '50 pcs', name: 'Cupcakes'}, {qty: '50 pcs', name: 'Cookies'}] },
    { id: 4, name: 'Powder Blue Dessert Bar', pax: '50–80', price: 15500, desc: 'Elegant dessert spread.', inclusions: [] }
  ],
  party: [
    { id: 5, name: 'Sakura Birthday Set', pax: '30', price: 5200, desc: 'Complete birthday setup.', inclusions: [{qty: '1', name: 'Themed Backdrop'}] },
    { id: 6, name: 'Teal Party Bundle', pax: '50', price: 8400, desc: 'Party package for 50 guests.', inclusions: [] }
  ],
  bundle: [
    { id: 7, name: 'Food Bumble B', pax: '20-30', price: 13000, desc: 'Fresh & well cooked package.', inclusions: [{qty: '8"', name: 'Customized Cake by theme'}, {qty: '1 large', name: 'Spaghetti'}, {qty: '150 pcs', name: 'Lumpia Shanghai'}, {qty: '30-35 pcs', name: 'Fried Chicken'}, {qty: '30 pcs', name: 'Kiklam (3pcs per stick)'}, {qty: '100 pcs', name: 'Puto Cheese'}, {qty: '2 kls', name: 'Beef Steak'}, {qty: '12-15 cups', name: 'Homemade Magnum Ice Cream'}] },
    { id: 8, name: 'Food Bumble C', pax: '20-30', price: 20000, desc: 'Premium bundle.', inclusions: [] }
  ]
};

offerings = window.AngelizDB.catalog.readPackages(offerings);

function persistPackages() {
  if (!window.AngelizDB.catalog.savePackages(offerings)) {
    alert('The packages could not be saved. Browser storage may be full; try a smaller image.');
  }
}

const offeringTitles = {
  grazing: 'Grazing Table',
  pastry: 'Pastry Buffet',
  party: 'Party Package',
  bundle: 'Food Bundle'
};

function renderOfferings() {
  ['grazing', 'pastry', 'party', 'bundle'].forEach(type => {
    const tbody = document.getElementById(`${type}Rows`);
    if (!tbody) return;
    tbody.innerHTML = offerings[type].map(pkg => `
      <tr>
        <td class="strong">${pkg.name}</td>
        <td>${pkg.pax}</td>
        <td>₱${Number(pkg.price).toLocaleString()}</td>
        <td>
          <div class="actions">
            <button class="btn btn-outline btn-sm" onclick="openPackageModal('${type}', ${pkg.id})">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteOffering('${type}', ${pkg.id})">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');
  });
}

function deleteOffering(type, id) {
  if (!confirm('Are you sure you want to delete this package?')) return;
  offerings[type] = offerings[type].filter(p => p.id !== id);
  persistPackages();
  renderOfferings();
}

/* ---------- Package Modal Logic ---------- */
let currentInclusions = [];

function renderInclusions() {
  const list = document.getElementById('inclusionsList');
  if (!currentInclusions.length) {
    list.innerHTML = '<span class="muted" style="font-size:12px;text-align:center;">No inclusions added yet.</span>';
    return;
  }
  list.innerHTML = currentInclusions.map((inc, i) => `
    <div class="inclusion-item">
      <span><span class="qty">${inc.qty ? inc.qty : ''}</span>${inc.name}</span>
      <button type="button" class="btn btn-danger btn-sm" style="padding:2px 6px;" onclick="removeInclusion(${i})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

function addInclusion() {
  const qty = document.getElementById('incQty').value.trim();
  const name = document.getElementById('incName').value.trim();
  if (!name) { alert('Please enter an item name.'); return; }
  currentInclusions.push({ qty, name });
  document.getElementById('incQty').value = '';
  document.getElementById('incName').value = '';
  document.getElementById('incName').focus();
  renderInclusions();
}

function removeInclusion(index) {
  currentInclusions.splice(index, 1);
  renderInclusions();
}

function updatePackageType(type) {
  document.getElementById('packageType').value = type;
  const isEditing = Boolean(document.getElementById('editingPkgId').value);
  document.getElementById('packageModalTitle').textContent = type
    ? `${isEditing ? 'Edit' : 'Add'} ${offeringTitles[type]}`
    : isEditing ? 'Edit Package' : 'Add Package';
  document.getElementById('pkgPaxLabel').textContent = type === 'party' ? 'Number of Guests *' : 'Number of Pax *';
}

let pendingPackageImage = null;

function previewPackageImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(loadEvent) {
    pendingPackageImage = loadEvent.target.result;
    document.getElementById('packageImgPreview').innerHTML = `<img src="${pendingPackageImage}" alt="Package preview">`;
  };
  reader.readAsDataURL(file);
}

function openPackageModal(type = '', id = null) {
  document.getElementById('packageType').value = type;
  document.getElementById('editingPkgId').value = id || '';
  document.getElementById('packageType').disabled = Boolean(id);
  document.getElementById('packageModalTitle').textContent = id
    ? `Edit ${offeringTitles[type]}`
    : type ? `Add ${offeringTitles[type]}` : 'Add Package';
  document.getElementById('pkgPaxLabel').textContent = type === 'party' ? 'Number of Guests *' : 'Number of Pax *';

  // Reset form
  ['pkgName', 'pkgPax', 'pkgPrice', 'pkgDesc'].forEach(f => document.getElementById(f).value = '');
  pendingPackageImage = null;
  document.getElementById('packageImage').value = '';
  document.getElementById('packageImgPreview').innerHTML = 'No image selected';
  currentInclusions = [];
  document.getElementById('incQty').value = '';
  document.getElementById('incName').value = '';

  if (id) {
    // Edit mode
    const pkg = offerings[type].find(p => p.id === id);
    if (pkg) {
      document.getElementById('pkgName').value = pkg.name;
      document.getElementById('pkgPax').value = pkg.pax;
      document.getElementById('pkgPrice').value = pkg.price;
      document.getElementById('pkgDesc').value = pkg.desc || '';
      if (pkg.image) {
        pendingPackageImage = pkg.image;
        document.getElementById('packageImgPreview').innerHTML = `<img src="${pkg.image}" alt="Package preview">`;
      }
      currentInclusions = pkg.inclusions ? JSON.parse(JSON.stringify(pkg.inclusions)) : [];
    }
  }
  
  renderInclusions();
  openModal('packageModal');
}

function savePackage() {
  const type = document.getElementById('packageType').value;
  const id = document.getElementById('editingPkgId').value;
  const name = document.getElementById('pkgName').value.trim();
  const pax = document.getElementById('pkgPax').value.trim();
  const price = document.getElementById('pkgPrice').value;
  const desc = document.getElementById('pkgDesc').value.trim();

  if (!type) {
    alert('Please select a package category.');
    document.getElementById('packageType').focus();
    return;
  }
  if (!name || !pax || !price) {
    alert('Please fill in Package Name, Pax, and Price.');
    return;
  }
  if (!pendingPackageImage) {
    alert('Please upload a package photo.');
    return;
  }

  if (id) {
    const pkg = offerings[type].find(p => p.id == id);
    if (pkg) {
      Object.assign(pkg, { name, pax, price: Number(price), desc, inclusions: currentInclusions, image: pendingPackageImage });
    }
  } else {
    const newId = Date.now();
    offerings[type].push({ id: newId, name, pax, price: Number(price), desc, inclusions: currentInclusions, image: pendingPackageImage });
  }

  persistPackages();
  renderOfferings();
  closeModal('packageModal');
}

/* ---------- Promotions ---------- */
let promotions = [
  { id: 1, name: 'Sweet 16 Deal', appliesTo: 'Birthday Cake', discount: 10, startDate: '2026-11-15', endDate: '2026-12-15', status: 'Active' },
  { id: 2, name: 'Event Bundle Promo', appliesTo: 'Party Packages', discount: 5, startDate: '2026-11-20', endDate: '2026-12-20', status: 'Active' },
  { id: 3, name: 'Loyalty Reward Promo', appliesTo: 'All Offerings', discount: 15, startDate: '2026-11-01', endDate: '2026-11-30', status: 'Active' }
];

function formatPromoDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(year, month - 1, day));
}

function renderPromotions() {
  const tbody = document.getElementById('promoRows');
  tbody.innerHTML = promotions.map(p => {
    const badgeClass = p.status === 'Active' ? 'badge-teal' : 'badge-gray';
    return `<tr>
      <td class="strong">${p.name}</td>
      <td>${p.appliesTo}</td>
      <td>${Number(p.discount)}%</td>
      <td>${formatPromoDate(p.startDate)} – ${formatPromoDate(p.endDate)}</td>
      <td><span class="badge ${badgeClass}">${p.status}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-outline btn-sm" onclick="openPromoModal(${p.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deletePromotion(${p.id})">Delete</button>
        </div>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('kpiPromos').textContent = promotions.filter(p => p.status === 'Active').length;
}

function deletePromotion(id) {
  if (!confirm('Are you sure you want to delete this promotion?')) return;
  promotions = promotions.filter(p => p.id !== id);
  renderPromotions();
}

function toggleAllPromos(el) {
  const targets = document.querySelectorAll('.promo-target');
  targets.forEach(cb => {
    cb.checked = false;
    cb.disabled = el.checked;
  });
}

function openPromoModal(id = null) {
  document.getElementById('editingPromoId').value = id || '';
  document.getElementById('promoModalTitle').textContent = id ? 'Edit Promotion' : 'Add Promotion';
  
  // Reset fields
  document.getElementById('promoName').value = '';
  document.getElementById('promoDiscount').value = '';
  document.getElementById('promoStartDate').value = '';
  document.getElementById('promoEndDate').value = '';
  document.getElementById('promoStatus').value = 'Active';
  
  const allCheck = document.getElementById('promo-all');
  allCheck.checked = false;
  allCheck.disabled = false;
  
  const targets = document.querySelectorAll('.promo-target');
  targets.forEach(cb => { cb.checked = false; cb.disabled = false; });

  if (id) {
    const promo = promotions.find(p => p.id === id);
    if (promo) {
      document.getElementById('promoName').value = promo.name;
      document.getElementById('promoDiscount').value = promo.discount;
      document.getElementById('promoStartDate').value = promo.startDate;
      document.getElementById('promoEndDate').value = promo.endDate;
      document.getElementById('promoStatus').value = promo.status;

      if (promo.appliesTo === 'All Offerings') {
        allCheck.checked = true;
        toggleAllPromos(allCheck);
      } else {
        const selected = promo.appliesTo.split(', ').map(s => s.trim());
        targets.forEach(cb => {
          if (selected.includes(cb.value)) cb.checked = true;
        });
      }
    }
  }
  openModal('promoModal');
}

function savePromo() {
  const id = document.getElementById('editingPromoId').value;
  const name = document.getElementById('promoName').value.trim();
  const discountInput = document.getElementById('promoDiscount').value.trim();
  const discount = Number(discountInput);
  const startDate = document.getElementById('promoStartDate').value;
  const endDate = document.getElementById('promoEndDate').value;
  const status = document.getElementById('promoStatus').value;

  let appliesTo = [];
  const allCheck = document.getElementById('promo-all');
  
  if (allCheck.checked) {
    appliesTo = ['All Offerings'];
  } else {
    const targets = document.querySelectorAll('.promo-target:checked');
    appliesTo = Array.from(targets).map(cb => cb.value);
  }

  if (!name || discountInput === '' || !startDate || !endDate) {
    alert('Please fill in all required fields.');
    return;
  }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    alert('Discount must be a percentage between 0 and 100.');
    return;
  }
  if (startDate > endDate) {
    alert('Start date must be on or before the end date.');
    return;
  }
  if (appliesTo.length === 0) {
    alert('Please select at least one item under "Applies To".');
    return;
  }

  const appliesToString = appliesTo.join(', ');

  if (id) {
    const p = promotions.find(p => p.id == id);
    if (p) Object.assign(p, { name, appliesTo: appliesToString, discount, startDate, endDate, status });
  } else {
    promotions.push({ id: Date.now(), name, appliesTo: appliesToString, discount, startDate, endDate, status });
  }

  renderPromotions();
  closeModal('promoModal');
}

/* ---------- Init ---------- */
renderSteps();
persistPresets();
persistPackages();
renderCakeTable();
renderOfferings();
renderPromotions();

/* ---------- Product Catalog ---------- */
(() => {
  const products = [{
    id: 'P-016',
    name: 'Chocolate Fudge Cake',
    category: 'Whole Cakes',
    price: 1800,
    description: 'Rich chocolate cake finished with smooth chocolate ganache.',
    showPOS: true,
    image: '../store-front/assets/chocolate-cake.jpg'
  }];
  products.splice(0, products.length, ...window.AngelizDB.catalog.readProducts(products));
  const rows = document.getElementById('productRows');
  const modal = document.getElementById('productModal');
  const formStatus = document.getElementById('productFormStatus');
  const imagePreview = document.getElementById('productImagePreview');
  const imageFile = document.getElementById('productImageFile');
  let productImage = '';
  let editingProductId = null;

  function fieldValue(id) {
    return document.getElementById(id).value.trim();
  }

  function formatPrice(value) {
    return `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function nextProductId() {
    return `P-${String(16 + products.length).padStart(3, '0')}`;
  }

  function setFormStatus(message, isError) {
    formStatus.textContent = message;
    formStatus.classList.toggle('is-error', Boolean(isError));
  }

  function renderImagePreview() {
    imagePreview.replaceChildren();
    if (productImage) {
      const image = document.createElement('img');
      image.src = productImage;
      image.alt = 'Product preview';
      imagePreview.appendChild(image);
      document.getElementById('removeProductImage').hidden = false;
    } else {
      imagePreview.textContent = 'No image selected';
      document.getElementById('removeProductImage').hidden = true;
    }
  }

  function resetProductForm() {
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = nextProductId();
    productImage = '';
    editingProductId = null;
    imageFile.value = '';
    renderImagePreview();
    document.getElementById('productPosState').textContent = document.getElementById('productShowPOS').checked ? 'On' : 'Off';
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    document.getElementById('publishProduct').textContent = 'Add to Catalog';
    setFormStatus('', false);
  }

  function showProductModal(productId) {
    resetProductForm();
    if (productId) {
      const product = products.find(item => item.id === productId);
      if (!product) {
        setFormStatus('The selected product is unavailable.', true);
        return;
      }

      editingProductId = product.id;
      document.getElementById('productId').value = product.id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productDescription').value = product.description;
      document.getElementById('productShowPOS').checked = product.showPOS;
      document.getElementById('productPosState').textContent = product.showPOS ? 'On' : 'Off';
      productImage = product.image;
      renderImagePreview();
      document.getElementById('productModalTitle').textContent = 'Edit Product';
      document.getElementById('publishProduct').textContent = 'Save Changes';
    }

    openModal('productModal');
    modal.querySelector('.product-modal-body').scrollTop = 0;
    document.getElementById('closeProductDialog').focus();
  }

  function hideProductModal() {
    closeModal('productModal');
    resetProductForm();
  }

  function createCell(row, value, className) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = value;
    row.appendChild(cell);
    return cell;
  }

  function renderProducts() {
    rows.replaceChildren();
    if (!products.length) {
      const emptyRow = document.createElement('tr');
      const emptyCell = createCell(emptyRow, 'No products added yet.', 'muted');
      emptyCell.colSpan = 5;
      rows.appendChild(emptyRow);
      return;
    }

    products.forEach(product => {
      const row = document.createElement('tr');
      const imageCell = document.createElement('td');
      imageCell.className = 'product-image-cell';
      if (product.image) {
        const image = document.createElement('img');
        image.className = 'product-table-image';
        image.src = product.image;
        image.alt = product.name;
        image.onerror = () => {
          imageCell.textContent = '—';
          image.remove();
        };
        imageCell.appendChild(image);
      } else {
        imageCell.textContent = '—';
      }
      row.appendChild(imageCell);

      createCell(row, product.name, 'strong');
      createCell(row, product.category);
      createCell(row, formatPrice(product.price));

      const actionCell = document.createElement('td');
      const editButton = document.createElement('button');
      editButton.className = 'btn btn-outline btn-sm';
      editButton.type = 'button';
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', () => showProductModal(product.id));
      actionCell.appendChild(editButton);
      row.appendChild(actionCell);
      rows.appendChild(row);
    });
  }

  function appendProductViewField(container, label, value) {
    const item = document.createElement('div');
    item.className = 'product-view-field';
    const name = document.createElement('span');
    name.className = 'product-view-label';
    name.textContent = label;
    const detail = document.createElement('span');
    detail.className = 'product-view-value';
    detail.textContent = value || '—';
    item.append(name, detail);
    container.appendChild(item);
  }

  function showProductView(productId) {
    const product = products.find(item => item.id === productId);
    const body = document.getElementById('productViewBody');
    body.replaceChildren();

    if (!product) {
      body.textContent = 'Product details are unavailable.';
      document.getElementById('productViewTitle').textContent = 'Product Details';
      openModal('productViewModal');
      document.getElementById('closeProductView').focus();
      return;
    }

    document.getElementById('productViewTitle').textContent = product.name;
    const summary = document.createElement('div');
    summary.className = 'product-view-summary';
    if (product.image) {
      const image = document.createElement('img');
      image.className = 'product-view-image';
      image.src = product.image;
      image.alt = product.name;
      image.onerror = () => image.remove();
      summary.appendChild(image);
    }
    const summaryText = document.createElement('div');
    const summaryName = document.createElement('strong');
    summaryName.textContent = product.name;
    const summaryDescription = document.createElement('p');
    summaryDescription.textContent = product.description || product.category;
    summaryText.append(summaryName, summaryDescription);
    summary.appendChild(summaryText);
    body.appendChild(summary);

    const details = document.createElement('div');
    details.className = 'product-view-grid';
    appendProductViewField(details, 'Product ID', product.id);
    appendProductViewField(details, 'Category', product.category);
    appendProductViewField(details, 'Price', formatPrice(product.price));
    appendProductViewField(details, 'Description', product.description);
    appendProductViewField(details, 'POS Availability', product.showPOS ? 'On' : 'Off');
    body.appendChild(details);

    openModal('productViewModal');
    document.getElementById('closeProductView').focus();
  }

  function publishProduct() {
    const name = fieldValue('productName');
    const rawPrice = document.getElementById('productPrice').value;
    const price = Number(rawPrice);

    if (!name) {
      setFormStatus('Product name is required.', true);
      return;
    }
    if (!rawPrice || !Number.isFinite(price) || price < 0) {
      setFormStatus('Enter a valid non-negative base price.', true);
      return;
    }

    const updatedProduct = {
      name,
      category: document.getElementById('productCategory').value,
      price,
      description: fieldValue('productDescription'),
      showPOS: document.getElementById('productShowPOS').checked,
      image: productImage
    };

    if (editingProductId) {
      const product = products.find(item => item.id === editingProductId);
      if (!product) {
        setFormStatus('The selected product is no longer available.', true);
        return;
      }
      Object.assign(product, updatedProduct);
    } else {
      products.push({ id: nextProductId(), ...updatedProduct });
    }

    if (!window.AngelizDB.catalog.saveProducts(products)) {
      setFormStatus('The product could not be saved. Browser storage may be full; try a smaller image.', true);
      return;
    }
    renderProducts();
    hideProductModal();
  }

  window.AngelizDB.catalog.saveProducts(products);
  renderProducts();
  resetProductForm();

  document.getElementById('openProductDialog').addEventListener('click', () => showProductModal());
  document.getElementById('openPackageDialog').addEventListener('click', () => openPackageModal());
  document.addEventListener('ac:quickaction', event => {
    if (event.detail.action === 'add-product') {
      showProductModal();
    } else if (event.detail.action === 'custom-cake-presets') {
      openCakeModal();
    } else if (event.detail.action === 'package') {
      openPackageModal();
    }
  });
  document.getElementById('closeProductDialog').addEventListener('click', hideProductModal);
  document.getElementById('cancelProduct').addEventListener('click', hideProductModal);
  document.getElementById('publishProduct').addEventListener('click', publishProduct);
  document.getElementById('closeProductView').addEventListener('click', () => closeModal('productViewModal'));
  document.getElementById('dismissProductView').addEventListener('click', () => closeModal('productViewModal'));
  document.getElementById('chooseProductImage').addEventListener('click', () => imageFile.click());
  document.getElementById('removeProductImage').addEventListener('click', () => {
    productImage = '';
    imageFile.value = '';
    renderImagePreview();
  });
  document.getElementById('productShowPOS').addEventListener('change', event => {
    document.getElementById('productPosState').textContent = event.currentTarget.checked ? 'On' : 'Off';
  });
  imageFile.addEventListener('change', () => {
    const file = imageFile.files && imageFile.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      setFormStatus('Choose an image file under 2 MB.', true);
      imageFile.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setFormStatus('The selected image could not be read.', true);
        return;
      }
      productImage = reader.result;
      renderImagePreview();
      setFormStatus('', false);
    };
    reader.onerror = () => setFormStatus('The selected image could not be read.', true);
    reader.readAsDataURL(file);
  });
})();
