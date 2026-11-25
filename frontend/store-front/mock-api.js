/* Compatibility bridge: all three frontends use the shared 3-user seeded CRUD database. */
(() => {
  'use strict';
  if (!window.storefrontApi && window.AngelizSharedDatabase) {
    const db = window.AngelizSharedDatabase;
    const routes = {
      '/api/storefront': () => db.database,
      '/api/storefront/settings': () => db.database.settings,
      '/api/storefront/categories': () => db.database.categories,
      '/api/storefront/products': () => db.database.products,
      '/api/storefront/services': () => db.database.services,
      '/api/storefront/service-categories': () => db.database.serviceCategories,
      '/api/storefront/gallery': () => db.database.gallery,
      '/api/storefront/reviews': () => db.database.feedbacks,
      '/api/storefront/location': () => db.database.location,
      '/api/storefront/locations': () => db.database.locations,
      '/api/storefront/about': () => db.database.about,
      '/api/storefront/contact': () => db.database.contact,
      '/api/storefront/payment-methods': () => db.database.paymentMethods,
      '/api/storefront/favorites': () => db.database.favorites,
      '/api/storefront/profiles': () => db.database.profiles,
      '/api/storefront/orders': () => db.database.orders,
      '/api/storefront/inquiries': () => db.database.inquiries,
      '/api/storefront/reviews/customer': () => db.database.reviews,
      '/api/storefront/saved-designs': () => db.database.savedDesigns,
      '/api/storefront/packages': () => db.database.services,
      '/api/storefront/package-selections': () => db.database.packageSelections,
      '/api/storefront/customization-options': () => db.database.customization.options,
      '/api/storefront/session': () => JSON.parse(localStorage.getItem('angeliz_customer_session') || 'null')
    };
    const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
    function post(path, payload = {}) {
      if (path === '/api/storefront/orders') {
        const bookingOnly = Boolean(payload.bookingOnly);
        const now = new Date();
        return db.create('orders', {
          ...payload,
          orderNumber: `AC-${String(now.getTime()).slice(-8)}`,
          referenceNumber: `AC-REF-${now.getTime()}`,
          recordType: bookingOnly ? 'booking' : 'order', bookingOnly,
          status: bookingOnly ? 'booking-requested-preview' : 'in-production-preview',
          productionStatus: bookingOnly ? 'Preparing' : 'In production',
          bookingStatus: bookingOnly ? 'Preparing' : '',
          paymentStatus: bookingOnly ? 'unpaid-booking' : (payload.paymentStatus || 'pending-preview'),
          priceStatus: bookingOnly ? 'pending-bakery-confirmation' : (payload.priceStatus || 'fixed-package-price'),
          ...(bookingOnly ? { packagePrice:'', total:'Price to be confirmed' } : {}),
          customerEmail: payload.customerEmail || payload.email || ''
        });
      }
      if (path === '/api/storefront/saved-designs') return db.create('savedDesigns', payload);
      if (path === '/api/storefront/inquiries') return db.create('inquiries', { ...payload, status:'new-preview' });
      if (path === '/api/storefront/favorites') {
        if (!Array.isArray(payload.productIds)) throw new TypeError('Favorites must be an array.');
        db.database.favorites = [...new Set(payload.productIds.filter(id => db.database.products.some(product => product.id === id)))];
        localStorage.setItem(db.key, JSON.stringify(db.database));
        return { productIds:clone(db.database.favorites) };
      }
      if (path === '/api/storefront/profiles') {
        const profile = payload.profile || payload;
        const existing = db.database.profiles.find(item => item.email?.toLowerCase() === String(profile.email || '').toLowerCase());
        return existing ? db.update('profiles', existing.id, profile) : db.create('profiles', profile);
      }
      if (path === '/api/storefront/package-selections') {
        const existing = db.database.packageSelections.find(item => item.packageId === payload.packageId);
        return existing ? db.update('packageSelections', existing.id, payload) : db.create('packageSelections', payload);
      }
      if (path === '/api/storefront/orders/confirm-booking') {
        const order = db.database.orders.find(item => item.id === payload.orderId);
        if (!order?.bookingOnly) throw new RangeError('Booking order not found.');
        return db.update('orders', order.id, { confirmedPrice:payload.confirmedPrice, priceStatus:'confirmed-preview', status:'confirmed-preview', productionStatus:'Confirmed', bookingStatus:'Confirmed' });
      }
      if (path === '/api/storefront/orders/payment') {
        const order = db.database.orders.find(item => item.id === payload.orderId);
        if (!order?.bookingOnly || order.status !== 'confirmed-preview') throw new RangeError('Confirmed booking not found.');
        return db.update('orders', order.id, { paymentMethod:payload.paymentMethod, paymentStatus:'paid-preview', paidAt:new Date().toISOString() });
      }
      throw new Error(`No POST route for ${path}`);
    }
    function put(path, payload) {
      const match = /^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);
      if (!match) throw new Error(`No PUT route for ${path}`);
      if (match[1] === 'orders') return db.updateOrder(decodeURIComponent(match[2]), payload);
      return db.update(match[1], decodeURIComponent(match[2]), payload);
    }
    function remove(path) {
      const match = /^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);
      if (!match) throw new Error(`No DELETE route for ${path}`);
      return db.delete(match[1], decodeURIComponent(match[2]));
    }
    window.storefrontApi = Object.freeze({
      async get(path) {
        if (routes[path]) return clone(routes[path]());
        const match = /^\/api\/storefront\/(orders|products|services|inquiries)\/([^/]+)$/.exec(path);
        if (match) return db.get(match[1], decodeURIComponent(match[2]));
        throw new Error(`No GET route for ${path}`);
      },
      async post(path, payload) { return clone(post(path, payload)); },
      async put(path, payload) { return clone(put(path, payload)); },
      async patch(path, payload) { return clone(put(path, payload)); },
      async delete(path) { return remove(path); }
    });
  }
})();
