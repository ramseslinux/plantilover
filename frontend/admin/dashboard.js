const API_BASE = window.location.port === '8080'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : '';
const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});
const statusLabels = {
  pending: 'Pendiente',
  paid: 'Pagado',
  processing: 'En preparación',
  shipping: 'En envío',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  archived: 'Archivado',
};
const paymentLabels = {
  pending: 'Pendiente',
  pending_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  refunded: 'Reembolsado',
};
const shippingLabels = {
  not_requested: 'Sin solicitar',
  pending: 'Pendiente de envío',
  shipped: 'Enviado',
  delivered: 'Entregado',
};
const documentLabels = { PED: 'Cotización', ORD: 'Orden' };
const state = { orders: [], filter: 'all', query: '', selectedOrder: null };

const ordersBody = document.getElementById('ordersBody');
const dashboardMessage = document.getElementById('dashboardMessage');
const drawerMessage = document.getElementById('drawerMessage');
const orderDrawer = document.getElementById('orderDrawer');
const detailBackdrop = document.getElementById('detailBackdrop');

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function displayDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function visibleOrders() {
  const query = state.query.trim().toLowerCase();
  return state.orders.filter((order) => {
    const filterMatch = state.filter === 'all' || order.status === state.filter;
    const searchable = [
      order.publicOrderNumber,
      order.customerName,
      ...(order.items || []).map((item) => `${item.productName} ${item.productSku}`),
    ].join(' ').toLowerCase();
    return filterMatch && searchable.includes(query);
  });
}

function renderMetrics() {
  document.getElementById('metricPending').textContent = state.orders
    .filter((order) => order.status === 'pending').length;
  document.getElementById('metricPayment').textContent = state.orders
    .filter((order) => ['pending', 'pending_review'].includes(order.paymentStatus)).length;
  document.getElementById('metricProcessing').textContent = state.orders
    .filter((order) => order.status === 'processing').length;
  document.getElementById('metricTotal').textContent = state.orders.length;

  document.getElementById('countAll').textContent = state.orders.length;
  document.getElementById('countPending').textContent = state.orders.filter((order) => order.status === 'pending').length;
  document.getElementById('countProcessing').textContent = state.orders.filter((order) => order.status === 'processing').length;
  document.getElementById('countShipping').textContent = state.orders.filter((order) => order.status === 'shipping').length;
  document.getElementById('countArchived').textContent = state.orders.filter((order) => order.status === 'archived').length;
}

function renderOrders() {
  const orders = visibleOrders();
  document.getElementById('ordersCaption').textContent = `${orders.length} ${orders.length === 1 ? 'orden visible' : 'órdenes visibles'}`;
  document.getElementById('ordersEmpty').classList.toggle('hidden', orders.length !== 0);
  ordersBody.innerHTML = orders.map((order) => {
    const items = order.items || [];
    const itemCount = items.reduce((total, item) => total + Number(item.quantity), 0);
    const firstItem = items[0];
    const itemSummary = firstItem
      ? `${itemCount} unid. · ${escapeHTML(firstItem.productName)}${items.length > 1 ? ` + ${items.length - 1}` : ''}`
      : 'Sin artículos';
    const orderStatus = statusLabels[order.status] || 'Por confirmar';
    const paymentStatus = paymentLabels[order.paymentStatus] || 'Por confirmar';

    return `<tr>
      <td><span class="table-order-number">${escapeHTML(order.publicOrderNumber)}</span><span class="table-order-type">${escapeHTML(documentLabels[order.documentType] || 'Documento')}</span></td>
      <td>${escapeHTML(order.customerName || 'Cliente')}</td>
      <td class="table-items">${itemSummary}</td>
      <td class="table-total">${currency.format(Number(order.total))}</td>
      <td><span class="status-badge status-${escapeHTML(order.status)}">${escapeHTML(orderStatus)}</span><span class="table-payment">Pago: ${escapeHTML(paymentStatus)}</span></td>
      <td class="table-date">${escapeHTML(displayDate(order.createdAt))}</td>
      <td><button class="row-action" type="button" data-open-order="${escapeHTML(order.id)}" aria-label="Ver ${escapeHTML(order.publicOrderNumber)}" title="Ver pedido"><span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></button></td>
    </tr>`;
  }).join('');

  ordersBody.querySelectorAll('[data-open-order]').forEach((button) => {
    button.addEventListener('click', () => openOrder(button.dataset.openOrder));
  });
}

async function loadOrders() {
  dashboardMessage.textContent = '';
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders`, { credentials: 'include' });
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudieron cargar las órdenes.');
    state.orders = result.orders || [];
    renderMetrics();
    renderOrders();
  } catch (error) {
    dashboardMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
  }
}

function renderOrderDetails(order) {
  const items = order.items || [];
  document.getElementById('drawerTitle').textContent = order.publicOrderNumber;
  document.getElementById('drawerContent').innerHTML = `
    <dl class="order-facts">
      <div><dt>Cliente</dt><dd>${escapeHTML(order.customerName || 'Cliente')}</dd></div>
      <div><dt>Creada</dt><dd>${escapeHTML(displayDate(order.createdAt))}</dd></div>
      <div><dt>Tipo de documento</dt><dd>${escapeHTML(documentLabels[order.documentType] || 'Documento')}</dd></div>
      <div><dt>Total</dt><dd>${currency.format(Number(order.total))}</dd></div>
      <div><dt>Envío</dt><dd>${escapeHTML(shippingLabels[order.shippingStatus] || 'Por confirmar')}</dd></div>
      ${order.trackingNumber ? `<div><dt>Guía</dt><dd>${escapeHTML(order.trackingNumber)}</dd></div>` : ''}
    </dl>
    <h3 class="drawer-section-title">Artículos</h3>
    <div class="drawer-items">${items.map((item) => `
      <div class="drawer-item">
        <div><strong>${escapeHTML(item.productName)}</strong><span>${escapeHTML(item.productSku)} · ${item.quantity} unid.</span></div>
        <strong>${currency.format(Number(item.subtotal))}</strong>
      </div>`).join('') || '<p class="drawer-muted">No hay artículos en esta orden.</p>'}</div>`;
  document.getElementById('orderStatus').value = order.status;
  document.getElementById('paymentStatus').value = order.paymentStatus;
}

async function openOrder(orderId) {
  drawerMessage.textContent = '';
  state.selectedOrder = state.orders.find((order) => order.id === orderId) || null;
  if (!state.selectedOrder) return;
  renderOrderDetails(state.selectedOrder);
  orderDrawer.classList.remove('hidden');
  detailBackdrop.classList.remove('hidden');
  document.body.classList.add('drawer-open');

  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}`, {
      credentials: 'include',
    });
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    const result = await response.json();
    if (response.ok && result.order) {
      state.selectedOrder = result.order;
      renderOrderDetails(result.order);
    }
  } catch {
    drawerMessage.textContent = 'Se muestra la información cargada. No se pudo actualizar el detalle.';
  }
}

function closeDrawer() {
  orderDrawer.classList.add('hidden');
  detailBackdrop.classList.add('hidden');
  document.body.classList.remove('drawer-open');
  state.selectedOrder = null;
}

document.getElementById('orderSearch').addEventListener('input', (event) => {
  state.query = event.target.value;
  renderOrders();
});
document.querySelectorAll('[data-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    state.filter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach((filterButton) => {
      const active = filterButton === button;
      filterButton.classList.toggle('active', active);
      filterButton.setAttribute('aria-pressed', String(active));
    });
    renderOrders();
  });
});
document.getElementById('refreshButton').addEventListener('click', loadOrders);
document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
detailBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !orderDrawer.classList.contains('hidden')) closeDrawer();
});
document.getElementById('orderUpdateForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedOrder) return;

  const button = document.getElementById('saveOrderButton');
  drawerMessage.textContent = '';
  button.disabled = true;
  button.querySelector('.button-label').textContent = 'Guardando...';
  try {
    const paymentStatus = document.getElementById('paymentStatus').value;
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(state.selectedOrder.id)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: document.getElementById('orderStatus').value,
        paymentStatus,
        ...(paymentStatus === 'approved' ? { documentType: 'ORD' } : {}),
      }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudieron guardar los cambios.');
    drawerMessage.textContent = 'Cambios guardados.';
    await loadOrders();
    const updated = state.orders.find((order) => order.id === state.selectedOrder.id);
    if (updated) {
      state.selectedOrder = updated;
      renderOrderDetails(updated);
    }
  } catch (error) {
    drawerMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
    button.querySelector('.button-label').textContent = 'Guardar cambios';
  }
});
document.getElementById('logoutButton').addEventListener('click', async () => {
  try {
    await fetch(`${API_BASE}/api/admin/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    sessionStorage.removeItem('plantiAdminEmail');
    window.location.replace('/admin/');
  }
});

document.getElementById('adminEmail').textContent = sessionStorage.getItem('plantiAdminEmail') || 'Sesión administrativa';
loadOrders();