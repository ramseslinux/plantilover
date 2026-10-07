const API_BASE = window.location.port === '8080'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : '';
const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

const state = {
  products: [],
  cart: readStorage('plantiCart', []),
  favorites: new Set(readStorage('plantiFavorites', [])),
  quantities: {},
  query: '',
  filter: 'all',
  sort: 'popular',
  favoritesOnly: false,
};

const productList = document.getElementById('productList');
const cartItemsEl = document.getElementById('cartItems');
const cartCountEl = document.getElementById('cartCount');
const cartTotalEl = document.getElementById('cartTotal');
const cartPanel = document.getElementById('cartPanel');
const cartBackdrop = document.getElementById('cartBackdrop');
const checkoutBtn = document.getElementById('checkoutBtn');
const searchInput = document.getElementById('productSearch');
const toast = document.getElementById('toast');

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function saveCart() {
  localStorage.setItem('plantiCart', JSON.stringify(state.cart));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove('show'), 4200);
}

function matchesFilter(product) {
  switch (state.filter) {
    case 'Interior':
    case 'Exterior':
      return product.category.toLowerCase() === state.filter.toLowerCase();
    case 'low-water':
      return product.care?.toLowerCase() === 'baja';
    case 'pet-friendly':
      return product.petFriendly === true;
    case 'in-stock':
      return Number(product.stock) > 0;
    default:
      return true;
  }
}

function getVisibleProducts() {
  const query = state.query.trim().toLowerCase();
  const products = state.products.filter((product) => {
    const searchable = [product.name, product.sku, product.category, product.description]
      .join(' ').toLowerCase();
    return searchable.includes(query)
      && matchesFilter(product)
      && (!state.favoritesOnly || state.favorites.has(product.id));
  });

  if (state.sort === 'price-asc') products.sort((a, b) => Number(a.price) - Number(b.price));
  if (state.sort === 'price-desc') products.sort((a, b) => Number(b.price) - Number(a.price));
  if (state.sort === 'name') products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return products;
}

function renderProducts() {
  const products = getVisibleProducts();
  document.getElementById('resultCount').textContent = `${products.length} ${products.length === 1 ? 'especie disponible' : 'especies disponibles'}`;
  document.getElementById('catalogStatus').textContent = products.length
    ? ''
    : 'No encontramos plantas con esos filtros. Prueba con otra búsqueda.';

  productList.innerHTML = products.map((product, index) => {
    const quantity = state.quantities[product.id] || 1;
    const stock = Number(product.stock || 0);
    const stockLabel = stock === 0 ? 'Agotada' : stock <= 5 ? 'Pocas piezas' : 'En existencia';
    const stockClass = stock === 0 ? 'out' : stock <= 5 ? 'low' : '';
    const favorite = state.favorites.has(product.id);
    const tags = [product.size, product.light, product.care === 'Baja' ? 'Poco riego' : ''].filter(Boolean);

    return `
      <article class="product-card" style="animation-delay:${Math.min(index * 35, 245)}ms">
        <div class="product-main">
          <div class="product-image-wrap">
            <img class="product-image" src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy" />
            <span class="stock-badge ${stockClass}">${stockLabel}</span>
          </div>
          <div class="product-details">
            <div>
              <div class="product-topline">
                <span class="product-sku">SKU: ${escapeHTML(product.sku)}</span>
                <button class="favorite-button ${favorite ? 'is-favorite' : ''}" type="button" data-favorite="${escapeHTML(product.id)}" aria-label="${favorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${favorite}" title="Favorito">
                  <span class="material-symbols-outlined" aria-hidden="true">favorite</span>
                </button>
              </div>
              <h2>${escapeHTML(product.name)}</h2>
              <p class="product-description">${escapeHTML(product.description)}</p>
            </div>
            <div class="product-tags">${tags.map((tag) => `<span class="product-tag">${escapeHTML(tag)}</span>`).join('')}</div>
            <div class="product-price-row">
              <span class="price-caption">Ref. unidad:</span>
              <span class="product-price">${money.format(Number(product.price))} <small>MXN</small></span>
            </div>
          </div>
        </div>
        <div class="product-actions">
          <div class="stepper" aria-label="Cantidad de ${escapeHTML(product.name)}">
            <button type="button" data-step="-1" data-product-id="${escapeHTML(product.id)}" aria-label="Disminuir cantidad" ${quantity <= 1 ? 'disabled' : ''}><span class="material-symbols-outlined" aria-hidden="true">remove</span></button>
            <output>${quantity}</output>
            <button type="button" data-step="1" data-product-id="${escapeHTML(product.id)}" aria-label="Aumentar cantidad"><span class="material-symbols-outlined" aria-hidden="true">add</span></button>
          </div>
          <button class="add-button" type="button" data-add="${escapeHTML(product.id)}" ${stock === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined" aria-hidden="true">shopping_basket</span>
            <span>${stock === 0 ? 'Agotada' : 'Agregar al pedido'}</span>
          </button>
        </div>
      </article>`;
  }).join('');

  productList.querySelectorAll('[data-step]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.productId;
      state.quantities[id] = Math.max(1, (state.quantities[id] || 1) + Number(button.dataset.step));
      renderProducts();
    });
  });
  productList.querySelectorAll('[data-add]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.dataset.add));
  });
  productList.querySelectorAll('[data-favorite]').forEach((button) => {
    button.addEventListener('click', () => toggleFavorite(button.dataset.favorite));
  });
}

function toggleFavorite(productId) {
  if (state.favorites.has(productId)) state.favorites.delete(productId);
  else state.favorites.add(productId);
  localStorage.setItem('plantiFavorites', JSON.stringify([...state.favorites]));
  renderProducts();
}

function addToCart(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return;
  const quantity = state.quantities[productId] || 1;
  const existing = state.cart.find((item) => item.productId === productId);
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (nextQuantity > Number(product.stock)) {
    showToast(`Solo quedan ${product.stock} unidades de ${product.name}.`);
    return;
  }
  if (existing) existing.quantity = nextQuantity;
  else state.cart.push({ productId, quantity });
  state.quantities[productId] = 1;
  saveCart();
  renderProducts();
  renderCart();
  showToast(`${product.name} agregado al pedido.`);
}

function updateCartQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  const product = state.products.find((entry) => entry.id === productId);
  if (!item || !product) return;
  const nextQuantity = item.quantity + delta;
  if (nextQuantity > Number(product.stock)) return;
  if (nextQuantity <= 0) state.cart = state.cart.filter((entry) => entry.productId !== productId);
  else item.quantity = nextQuantity;
  saveCart();
  renderCart();
}

function renderCart() {
  const cartProducts = state.cart.map((item) => {
    const product = state.products.find((entry) => entry.id === item.productId);
    return product ? { ...item, product, subtotal: Number(product.price) * item.quantity } : null;
  }).filter(Boolean);
  const itemCount = cartProducts.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartProducts.reduce((sum, item) => sum + item.subtotal, 0);

  cartCountEl.textContent = itemCount;
  document.getElementById('cartToggle').setAttribute('aria-label', `Abrir pedido, ${itemCount} productos`);
  cartTotalEl.textContent = `${money.format(total)} MXN`;
  cartItemsEl.innerHTML = cartProducts.length === 0
    ? '<div class="cart-empty"><span class="material-symbols-outlined" aria-hidden="true">yard</span>Tu pedido está vacío.</div>'
    : cartProducts.map((item) => `
      <div class="cart-item">
        <span class="cart-item-name">${escapeHTML(item.product.name)}</span>
        <span class="cart-item-price">${money.format(item.subtotal)}</span>
        <div class="cart-item-controls">
          <button type="button" data-cart-step="-1" data-product-id="${escapeHTML(item.product.id)}" aria-label="Quitar una unidad">−</button>
          <span>${item.quantity} × ${money.format(Number(item.product.price))}</span>
          <button type="button" data-cart-step="1" data-product-id="${escapeHTML(item.product.id)}" aria-label="Agregar una unidad" ${item.quantity >= Number(item.product.stock) ? 'disabled' : ''}>+</button>
        </div>
      </div>`).join('');

  cartItemsEl.querySelectorAll('[data-cart-step]').forEach((button) => {
    button.addEventListener('click', () => updateCartQuantity(button.dataset.productId, Number(button.dataset.cartStep)));
  });
  checkoutBtn.disabled = itemCount === 0;
}

function setCartOpen(open) {
  cartPanel.classList.toggle('hidden', !open);
  cartBackdrop.classList.toggle('hidden', !open);
  document.body.classList.toggle('cart-open', open);
  if (open) document.getElementById('customerName').focus();
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/api/products`);
    if (!response.ok) throw new Error('No se pudo cargar el catálogo.');
    const data = await response.json();
    state.products = data.items || [];
    renderProducts();
    renderCart();
  } catch (error) {
    document.getElementById('resultCount').textContent = 'Catálogo no disponible';
    document.getElementById('catalogStatus').textContent = error.message;
  }
}

async function checkout() {
  if (state.cart.length === 0) return;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = 'Preparando cotización...';
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: document.getElementById('customerName').value.trim() || 'Cliente de catálogo',
        items: state.cart.map(({ productId, quantity }) => ({ productId, quantity })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo crear la cotización.');
    state.cart = [];
    saveCart();
    renderCart();
    setCartOpen(false);
    showToast(`Cotización ${result.publicOrderNumber} creada por ${money.format(Number(result.total))} MXN.`);
  } catch (error) {
    showToast(error.message);
  } finally {
    checkoutBtn.innerHTML = 'Solicitar cotización';
    renderCart();
  }
}

searchInput.addEventListener('input', (event) => {
  state.query = event.target.value;
  renderProducts();
});
document.getElementById('clearSearch').addEventListener('click', () => {
  searchInput.value = '';
  state.query = '';
  searchInput.focus();
  renderProducts();
});
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((chip) => {
      const active = chip === button;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', String(active));
    });
    renderProducts();
  });
});
document.getElementById('sortProducts').addEventListener('change', (event) => {
  state.sort = event.target.value;
  renderProducts();
});
document.getElementById('filterTrigger').addEventListener('click', (event) => {
  state.favoritesOnly = !state.favoritesOnly;
  event.currentTarget.classList.toggle('is-active', state.favoritesOnly);
  event.currentTarget.setAttribute('aria-label', state.favoritesOnly ? 'Mostrar todo el catálogo' : 'Mostrar plantas favoritas');
  renderProducts();
});
document.getElementById('cartToggle').addEventListener('click', () => setCartOpen(true));
document.getElementById('closeCart').addEventListener('click', () => setCartOpen(false));
cartBackdrop.addEventListener('click', () => setCartOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !cartPanel.classList.contains('hidden')) setCartOpen(false);
});
document.getElementById('clearCart').addEventListener('click', () => {
  state.cart = [];
  saveCart();
  renderCart();
});
checkoutBtn.addEventListener('click', checkout);

loadProducts();
