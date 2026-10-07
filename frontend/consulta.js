const API_BASE = window.location.port === '8080'
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : '';
const money = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 2,
});
const orderLabels = {
  pending: 'Solicitud recibida',
  paid: 'Pago confirmado',
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

const lookupForm = document.getElementById('lookupForm');
const orderInput = document.getElementById('orderNumber');
const lookupButton = document.getElementById('lookupButton');
const lookupMessage = document.getElementById('lookupMessage');
const orderResult = document.getElementById('orderResult');

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function currentStage(order) {
  if (order.status === 'delivered' || order.shippingStatus === 'delivered') return 4;
  if (order.status === 'shipping' || ['shipped', 'delivered'].includes(order.shippingStatus)) return 3;
  if (['paid', 'processing'].includes(order.status) || order.paymentStatus === 'approved') return 2;
  return 1;
}

function renderTimeline(order) {
  const activeStage = currentStage(order);
  const delivered = activeStage === 4;
  const steps = [
    { title: 'Solicitud registrada', detail: `Folio creado el ${formatDate(order.createdAt)}` },
    { title: 'Confirmación de cotización y pago', detail: order.paymentStatus === 'pending_review' ? 'El comprobante está en revisión.' : order.paymentStatus === 'rejected' ? 'El pago requiere atención.' : 'Validación de existencias y pago.' },
    { title: 'Preparación del pedido', detail: 'El vivero prepara los artículos de tu pedido.' },
    { title: 'Envío', detail: order.trackingNumber ? `Guía ${order.trackingNumber}` : 'La guía aparecerá aquí cuando esté disponible.' },
    { title: 'Entrega', detail: 'Pedido entregado.' },
  ];

  document.getElementById('orderTimeline').innerHTML = steps.map((step, index) => {
    const completed = index < activeStage || delivered;
    const active = index === activeStage && !delivered;
    const icon = completed ? 'check' : active ? 'radio_button_checked' : 'radio_button_unchecked';
    return `<li class="timeline-step ${completed ? 'completed' : ''} ${active ? 'active' : ''}">
      <span class="timeline-icon material-symbols-outlined" aria-hidden="true">${icon}</span>
      <div><strong>${escapeHTML(step.title)}</strong><p>${escapeHTML(step.detail)}</p></div>
    </li>`;
  }).join('');
}

function renderOrder(order) {
  document.getElementById('resultFolio').textContent = order.publicOrderNumber;
  document.getElementById('resultCustomer').textContent = order.customerName || 'Cliente';
  document.getElementById('resultDate').textContent = formatDate(order.createdAt);
  document.getElementById('resultType').textContent = documentLabels[order.documentType] || 'Documento';
  document.getElementById('resultPayment').textContent = paymentLabels[order.paymentStatus] || 'Por confirmar';
  document.getElementById('resultTotal').textContent = `${money.format(Number(order.total))} MXN`;

  const status = order.status === 'pending' && order.paymentStatus === 'pending_review'
    ? 'Comprobante en revisión'
    : order.status === 'pending' && order.paymentStatus === 'rejected'
      ? 'Pago rechazado'
      : orderLabels[order.status] || 'Estado por confirmar';
  const statusEl = document.getElementById('resultStatus');
  statusEl.textContent = status;
  statusEl.className = `result-status status-${escapeHTML(order.status)}${order.paymentStatus === 'rejected' ? ' status-error' : ''}`;

  const notice = document.getElementById('resultNotice');
  if (order.paymentStatus === 'rejected') {
    notice.textContent = 'El pago no pudo ser confirmado. Contacta al vivero para revisar los siguientes pasos.';
    notice.className = 'result-notice notice-error';
  } else if (order.documentType === 'PED') {
    notice.textContent = 'Esta solicitud todavía es una cotización. El equipo confirmará stock y envío antes de emitir una orden definitiva.';
    notice.className = 'result-notice notice-info';
  } else {
    notice.textContent = 'Tu pago fue confirmado y el pedido está en proceso de cumplimiento.';
    notice.className = 'result-notice notice-success';
  }

  const items = order.items || [];
  document.getElementById('orderItems').innerHTML = items.map((item) => `
    <article class="tracked-item">
      <div class="tracked-item-main"><span class="item-quantity">${Number(item.quantity)}×</span><div><strong>${escapeHTML(item.productName)}</strong><span>${escapeHTML(item.productSku)}</span></div></div>
      <span class="tracked-item-total">${money.format(Number(item.subtotal))}</span>
    </article>`).join('') || '<p class="empty-items">No hay artículos para mostrar.</p>';

  const shippingDetails = document.getElementById('shippingDetails');
  const hasShippingInfo = order.shippingCarrier || order.trackingNumber || order.shippingNotes;
  shippingDetails.classList.toggle('hidden', !hasShippingInfo);
  if (hasShippingInfo) {
    document.getElementById('shippingCarrier').textContent = order.shippingCarrier || 'Pendiente';
    document.getElementById('trackingNumber').textContent = order.trackingNumber || 'Aún no asignada';
    document.getElementById('shippingNotes').textContent = order.shippingNotes || '—';
  }

  renderTimeline(order);
  orderResult.classList.remove('hidden');
}

async function lookupOrder(folio) {
  const normalizedFolio = String(folio || '').trim();
  if (!normalizedFolio) {
    lookupMessage.textContent = 'Escribe el folio de tu cotización o pedido.';
    orderInput.focus();
    return;
  }

  lookupButton.disabled = true;
  lookupButton.querySelector('span:last-child').textContent = 'Consultando...';
  lookupMessage.textContent = '';
  orderResult.classList.add('hidden');

  try {
    const response = await fetch(`${API_BASE}/api/orders/${encodeURIComponent(normalizedFolio)}`);
    const result = await response.json();
    if (response.status === 404) throw new Error('No encontramos ese folio. Revisa los caracteres e inténtalo de nuevo.');
    if (!response.ok) throw new Error(result.error || 'No se pudo consultar el pedido.');
    renderOrder(result);
    const url = new URL(window.location.href);
    url.searchParams.set('folio', normalizedFolio);
    window.history.replaceState({}, '', url);
  } catch (error) {
    lookupMessage.textContent = error.message || 'No se pudo conectar con el servidor.';
  } finally {
    lookupButton.disabled = false;
    lookupButton.querySelector('span:last-child').textContent = 'Consultar';
  }
}

lookupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  lookupOrder(orderInput.value);
});

const initialFolio = new URLSearchParams(window.location.search).get('folio');
if (initialFolio) {
  orderInput.value = initialFolio;
  lookupOrder(initialFolio);
}