const API_BASE = window.location.origin + '/api';

function getStoredUser() {
  const raw = localStorage.getItem('pms_user') || sessionStorage.getItem('pms_user');
  return raw ? JSON.parse(raw) : null;
}

function getAuthHeaders() {
  const user = getStoredUser();
  if (!user) return {};
  return {
    'x-user-id': String(user.id),
    'x-user-role': user.role
  };
}

async function apiRequest(endpoint, options = {}) {
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  let data = {};

  try {
    data = await response.json();
  } catch (e) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
  if (amount == null) return '-';
  return '₹' + Number(amount).toLocaleString('en-IN') + ' LPA';
}

function getStatusClass(status) {
  if (!status) return 'status-pending';
  return 'status-' + status.toLowerCase().replace(/\s+/g, '-');
}

function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
