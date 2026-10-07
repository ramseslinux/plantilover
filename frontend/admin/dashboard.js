const API_BASE = '';
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
const state = { orders: [], filter: 'all', scope: 'active', query: '', selectedOrder: null, selectedShippingRate: null };

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
    const scopeMatch = state.scope === 'archived' ? order.status === 'archived' : order.status !== 'archived';
    const filterMatch = state.filter === 'all' || order.status === state.filter;
    const searchable = [
      order.publicOrderNumber,
      order.customerName,
      ...(order.items || []).map((item) => `${item.productName} ${item.productSku}`),
    ].join(' ').toLowerCase();
    return scopeMatch && filterMatch && searchable.includes(query);
  });
}

function renderMetrics() {
  const activeOrders = state.orders.filter((order) => order.status !== 'archived');
  document.getElementById('metricPending').textContent = activeOrders
    .filter((order) => order.status === 'pending').length;
  document.getElementById('metricPayment').textContent = activeOrders
    .filter((order) => ['pending', 'pending_review'].includes(order.paymentStatus)).length;
  document.getElementById('metricProcessing').textContent = activeOrders
    .filter((order) => order.status === 'processing').length;
  document.getElementById('metricTotal').textContent = activeOrders.length;

  document.getElementById('countAll').textContent = activeOrders.length;
  document.getElementById('countPending').textContent = activeOrders.filter((order) => order.status === 'pending').length;
  document.getElementById('countProcessing').textContent = activeOrders.filter((order) => order.status === 'processing').length;
  document.getElementById('countShipping').textContent = activeOrders.filter((order) => order.status === 'shipping').length;
  document.getElementById('countArchived').textContent = state.orders.filter((order) => order.status === 'archived').length;
}

function renderOrders() {
  const orders = visibleOrders();
  document.getElementById('ordersTitle').textContent = state.scope === 'archived' ? 'Histórico de pedidos' : 'Órdenes vigentes';
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
      <td class="order-actions">${order.status !== 'archived' ? `<button class="photo-action" type="button" data-open-photo="${escapeHTML(order.id)}"><span class="material-symbols-outlined" aria-hidden="true">add_a_photo</span>Subir foto</button>` : ''}<button class="row-action" type="button" data-open-order="${escapeHTML(order.id)}" aria-label="Ver ${escapeHTML(order.publicOrderNumber)}" title="Ver pedido"><span class="material-symbols-outlined" aria-hidden="true">open_in_new</span></button></td>
    </tr>`;
  }).join('');

  ordersBody.querySelectorAll('[data-open-order]').forEach((button) => {
    button.addEventListener('click', () => openOrder(button.dataset.openOrder));
  });
  ordersBody.querySelectorAll('[data-open-photo]').forEach((button) => {
    button.addEventListener('click', async () => {
      await openOrder(button.dataset.openPhoto);
      document.getElementById('evidenceContext').value = 'packing';
      document.getElementById('evidenceUploadForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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
    await loadArchiveSettings();
  } catch (error) {
    dashboardMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
  }
}

async function loadArchiveSettings() {
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/order-archive`, { credentials: 'include' });
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    const result = await response.json();
    if (response.ok) document.getElementById('archiveDays').value = result.days || 30;
  } catch {
    document.getElementById('archiveSettingsMessage').textContent = 'No se pudo cargar el plazo de depuración.';
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
      <div><dt>Forma de pago</dt><dd>${escapeHTML(({ cash: 'Efectivo', transfer: 'Transferencia SPEI', other: 'Otro', unspecified: 'Sin registrar' })[order.paymentMethod] || 'Sin registrar')}</dd></div>
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
  document.getElementById('paymentMethod').value = order.paymentMethod || 'unspecified';
  const archived = order.status === 'archived';
  document.getElementById('archiveOrderButton').classList.toggle('hidden', archived);
  document.getElementById('restoreOrderButton').classList.toggle('hidden', !archived);
  document.getElementById('orderUpdateForm').querySelectorAll('select, button').forEach((control) => {
    control.disabled = archived;
  });
  document.getElementById('shippingUpdateForm').querySelectorAll('input, select, textarea, button').forEach((control) => {
    control.disabled = archived;
  });
  document.getElementById('evidenceUploadForm').querySelectorAll('input, select, button').forEach((control) => {
    control.disabled = archived;
  });
  document.getElementById('shippingStatus').value = order.shippingStatus || 'not_requested';
  document.getElementById('shippingCarrier').value = order.shippingCarrier || '';
  document.getElementById('shippingService').value = order.shippingService || '';
  document.getElementById('trackingNumberInput').value = order.trackingNumber || '';
  document.getElementById('shippingPostalCode').value = order.postalCodeSnapshot || '';
  document.getElementById('shippingRateOriginal').value = order.rateOriginal ?? '';
  document.getElementById('shippingRateFinal').value = order.rateFinal ?? '';
  document.getElementById('shippingRateVersion').value = order.rateVersion || '';
  document.getElementById('shippingWeight').value = order.shippingWeight ?? 0;
  document.getElementById('shippingNotesInput').value = order.shippingNotes || '';
  document.getElementById('shippingManualOverride').checked = Boolean(order.shippingManualOverride);
  state.selectedShippingRate = order.shippingRateImportId ? {
    providerId: order.shippingProviderId,
    serviceId: order.shippingServiceId,
    rateImportId: order.shippingRateImportId,
  } : null;
  loadOrderAttachments(order);
}

function renderAttachmentList(containerId, entries, orderId, kind) {
  const container = document.getElementById(containerId);
  if (!entries.length) {
    container.innerHTML = '<p class="drawer-muted">Todavía no hay archivos.</p>';
    return;
  }
  container.innerHTML = entries.map((entry) => {
    const endpoint = kind === 'evidence' ? 'evidence' : 'payment-proofs';
    const href = `${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/${endpoint}/${encodeURIComponent(entry.id)}/file`;
    const context = entry.context ? ` · ${entry.context}` : '';
    const status = entry.status ? ` · ${paymentLabels[entry.status] || entry.status}` : '';
    const reviewActions = kind === 'proof' && entry.status === 'pending_review'
      ? `<div class="proof-review-actions"><button type="button" data-review-proof="${escapeHTML(entry.id)}" data-proof-status="approved">Aprobar</button><button type="button" data-review-proof="${escapeHTML(entry.id)}" data-proof-status="rejected">Rechazar</button></div>`
      : '';
    return `<div class="attachment-entry"><a class="attachment-row" href="${href}" target="_blank" rel="noopener">
      <span class="material-symbols-outlined" aria-hidden="true">${kind === 'evidence' ? 'photo_camera' : 'receipt_long'}</span>
      <span><strong>${escapeHTML(entry.fileName || 'Imagen')}</strong><small>${escapeHTML(displayDate(entry.createdAt))}${escapeHTML(context)}${escapeHTML(status)}</small></span>
      <span class="material-symbols-outlined attachment-download" aria-hidden="true">download</span>
    </a>${reviewActions}</div>`;
  }).join('');
  container.querySelectorAll('[data-review-proof]').forEach((button) => {
    button.addEventListener('click', () => reviewPaymentProof(orderId, button.dataset.reviewProof, button.dataset.proofStatus));
  });
}

async function reviewPaymentProof(orderId, proofId, status) {
  const message = document.getElementById('drawerMessage');
  message.textContent = '';
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/payment-proofs/${encodeURIComponent(proofId)}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo revisar el comprobante.');
    await loadOrders();
    const updated = state.orders.find((order) => order.id === orderId);
    if (updated) {
      state.selectedOrder = updated;
      renderOrderDetails(updated);
    }
    message.textContent = status === 'approved' ? 'Pago confirmado; el folio ahora es ORD.' : 'Comprobante rechazado.';
  } catch (error) {
    message.textContent = error.message || 'No se pudo conectar con el servidor.';
  }
}

async function loadOrderAttachments(order) {
  const endpoints = [
    ['paymentProofList', 'payment-proofs', 'proofs', 'proof'],
    ['shippingEvidenceList', 'evidence', 'evidence', 'evidence'],
  ];
  await Promise.all(endpoints.map(async ([containerId, path, key, kind]) => {
    const container = document.getElementById(containerId);
    container.innerHTML = '<p class="drawer-muted">Cargando...</p>';
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(order.id)}/${path}`, { credentials: 'include' });
      if (response.status === 401) {
        window.location.replace('/admin/');
        return;
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los archivos.');
      if (state.selectedOrder?.id !== order.id) return;
      renderAttachmentList(containerId, result[key] || [], order.id, kind);
    } catch (error) {
      container.innerHTML = `<p class="drawer-muted">${escapeHTML(error.message)}</p>`;
    }
  }));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('No se pudo leer el CSV.'));
    reader.readAsText(file);
  });
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

async function moveOrderToScope(action) {
  if (!state.selectedOrder) return;
  const orderId = state.selectedOrder.id;
  const button = document.getElementById(action === 'archive' ? 'archiveOrderButton' : 'restoreOrderButton');
  button.disabled = true;
  drawerMessage.textContent = '';
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(orderId)}/${action}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: action === 'archive' ? JSON.stringify({ archivedReason: 'admin_review' }) : '{}',
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el histórico.');
    await loadOrders();
    state.scope = action === 'archive' ? 'archived' : 'active';
    document.querySelectorAll('[data-scope]').forEach((tab) => {
      const active = tab.dataset.scope === state.scope;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    renderOrders();
    await openOrder(orderId);
  } catch (error) {
    drawerMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
  }
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
document.querySelectorAll('[data-scope]').forEach((button) => {
  button.addEventListener('click', () => {
    state.scope = button.dataset.scope;
    state.filter = 'all';
    document.querySelectorAll('[data-scope]').forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-filter]').forEach((filter) => {
      const active = filter.dataset.filter === 'all';
      filter.classList.toggle('active', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    renderOrders();
  });
});
document.getElementById('refreshButton').addEventListener('click', loadOrders);
document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
document.getElementById('archiveOrderButton').addEventListener('click', () => moveOrderToScope('archive'));
document.getElementById('restoreOrderButton').addEventListener('click', () => moveOrderToScope('restore'));
document.getElementById('archiveSettingsForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = document.getElementById('archiveSettingsMessage');
  const button = document.getElementById('saveArchiveDaysButton');
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch(`${API_BASE}/api/admin/settings/order-archive`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: Number(document.getElementById('archiveDays').value) }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar el plazo.');
    message.textContent = `Los pedidos se depurarán después de ${result.days} días sin pago.`;
  } catch (error) {
    message.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
  }
});
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
        paymentMethod: document.getElementById('paymentMethod').value,
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
document.getElementById('evidenceUploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedOrder) return;
  const fileInput = document.getElementById('evidenceFile');
  const file = fileInput.files[0];
  const message = document.getElementById('evidenceMessage');
  const button = document.getElementById('uploadEvidenceButton');
  if (!file) return;
  message.textContent = '';
  button.disabled = true;
  try {
    const content = await readFileAsDataUrl(file);
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(state.selectedOrder.id)}/evidence`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        content,
        context: document.getElementById('evidenceContext').value,
      }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar la evidencia.');
    message.textContent = 'Evidencia guardada y agregada a la auditoría.';
    fileInput.value = '';
    await loadOrderAttachments(state.selectedOrder);
  } catch (error) {
    message.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
  }
});
document.getElementById('shippingUpdateForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.selectedOrder) return;
  const button = document.getElementById('saveShippingButton');
  const message = document.getElementById('shippingMessage');
  button.disabled = true;
  message.textContent = '';
  const optionalNumber = (id, key) => {
    const value = document.getElementById(id).value;
    return value === '' ? {} : { [key]: value };
  };
  const optionalText = (id, key) => {
    const value = document.getElementById(id).value.trim();
    return value === '' ? {} : { [key]: value };
  };
  const payload = {
    shippingStatus: document.getElementById('shippingStatus').value,
    shippingManualOverride: document.getElementById('shippingManualOverride').checked,
    ...optionalText('shippingCarrier', 'shippingCarrier'),
    ...optionalText('shippingService', 'shippingService'),
    ...optionalText('trackingNumberInput', 'trackingNumber'),
    ...optionalText('shippingPostalCode', 'postalCodeSnapshot'),
    ...optionalText('shippingRateVersion', 'rateVersion'),
    ...optionalText('shippingNotesInput', 'shippingNotes'),
    ...optionalNumber('shippingRateOriginal', 'rateOriginal'),
    ...optionalNumber('shippingRateFinal', 'rateFinal'),
    shippingWeight: Number(document.getElementById('shippingWeight').value || 0),
    providerId: state.selectedShippingRate?.providerId || null,
    serviceId: state.selectedShippingRate?.serviceId || null,
    rateImportId: state.selectedShippingRate?.rateImportId || null,
  };
  try {
    const response = await fetch(`${API_BASE}/api/admin/orders/${encodeURIComponent(state.selectedOrder.id)}/shipping`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo actualizar el envío.');
    message.textContent = 'Envío guardado y registrado en la auditoría.';
    await loadOrders();
    const refreshed = state.orders.find((order) => order.id === state.selectedOrder.id);
    if (refreshed) {
      state.selectedOrder = refreshed;
      renderOrderDetails(refreshed);
    }
  } catch (error) {
    message.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
  }
});
document.getElementById('quoteShippingRateButton').addEventListener('click', async () => {
  if (!state.selectedOrder) return;
  const message = document.getElementById('shippingMessage');
  message.textContent = '';
  try {
    const response = await fetch(`${API_BASE}/api/admin/shipping-rates/quote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postalCode: document.getElementById('shippingPostalCode').value.trim(),
        service: document.getElementById('shippingService').value.trim(),
        weight: Number(document.getElementById('shippingWeight').value || 0),
      }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se encontró una tarifa.');
    document.getElementById('shippingCarrier').value = result.provider;
    document.getElementById('shippingService').value = result.service;
    document.getElementById('shippingPostalCode').value = result.postalCode;
    document.getElementById('shippingRateOriginal').value = result.price;
    document.getElementById('shippingRateFinal').value = result.price;
    document.getElementById('shippingRateVersion').value = result.version;
    document.getElementById('shippingManualOverride').checked = false;
    state.selectedShippingRate = {
      providerId: result.provider_id,
      serviceId: result.service_id,
      rateImportId: result.rate_import_id,
    };
    message.textContent = `Tarifa ${result.version} aplicada: ${currency.format(Number(result.price))}.`;
  } catch (error) {
    message.textContent = error.message || 'No se pudo consultar la tarifa.';
  }
});

['shippingCarrier', 'shippingService', 'shippingPostalCode', 'shippingRateOriginal', 'shippingRateFinal', 'shippingRateVersion', 'shippingWeight']
  .forEach((id) => document.getElementById(id).addEventListener('input', () => {
    state.selectedShippingRate = null;
    document.getElementById('shippingManualOverride').checked = true;
  }));

document.getElementById('shippingRateImportForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = document.getElementById('rateCsvFile').files[0];
  const message = document.getElementById('rateImportMessage');
  const button = document.getElementById('importRatesButton');
  if (!file) return;
  message.textContent = '';
  button.disabled = true;
  try {
    if (file.size > 1_500_000) throw new Error('El CSV debe pesar menos de 1.5 MB.');
    const csvContent = await readFileAsText(file);
    const response = await fetch(`${API_BASE}/api/admin/shipping-rates/import`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: document.getElementById('rateProvider').value.trim(),
        version: document.getElementById('rateVersion').value.trim(),
        sourceFileName: file.name,
        csvContent,
      }),
    });
    const result = await response.json();
    if (response.status === 401) {
      window.location.replace('/admin/');
      return;
    }
    if (!response.ok) throw new Error(result.error || 'No se pudo importar el tarifario.');
    message.textContent = `Tarifario ${result.importVersion} importado con éxito.`;
    document.getElementById('rateCsvFile').value = '';
  } catch (error) {
    message.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    button.disabled = false;
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
