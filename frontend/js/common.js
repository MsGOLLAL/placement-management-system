const OFFICER_NAV = [
  { href: 'dashboard.html', icon: 'fa-chart-line', label: 'Dashboard' },
  { href: 'students.html', icon: 'fa-user-graduate', label: 'Students' },
  { href: 'companies.html', icon: 'fa-building', label: 'Companies' },
  { href: 'jobs.html', icon: 'fa-briefcase', label: 'Jobs' },
  { href: 'applications.html', icon: 'fa-file-alt', label: 'Applications' },
  { href: 'interviews.html', icon: 'fa-calendar-check', label: 'Interviews' },
  { href: 'reports.html', icon: 'fa-chart-bar', label: 'Reports' }
];

const STUDENT_NAV = [
  { href: 'jobs.html', icon: 'fa-briefcase', label: 'Jobs' },
  { href: 'applications.html', icon: 'fa-file-alt', label: 'My Applications' }
];

function initLayout(activePage) {
  const user = requireAuth();
  if (!user) return;

  const navItems = user.role === 'officer' ? OFFICER_NAV : STUDENT_NAV;
  const currentPage = activePage || window.location.pathname.split('/').pop();

  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    sidebar.innerHTML = `
      <div class="sidebar-header">
        <img src="assets/logo.svg" alt="Logo" class="sidebar-logo">
        <span class="sidebar-brand">Placement Portal</span>
      </div>
      <ul class="sidebar-nav">
        ${navItems.map(item => `
          <li>
            <a href="${item.href}" class="${currentPage === item.href ? 'active' : ''}">
              <i class="fas ${item.icon}"></i>
              <span class="nav-label">${item.label}</span>
            </a>
          </li>
        `).join('')}
      </ul>
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="user-avatar">${user.name.charAt(0).toUpperCase()}</div>
          <div class="sidebar-user-info">
            <div style="font-weight:600;font-size:0.875rem">${user.name}</div>
            <div style="font-size:0.75rem;color:var(--text-muted)">${user.role === 'officer' ? 'Placement Officer' : user.usn || 'Student'}</div>
          </div>
        </div>
        <button class="btn btn-outline-danger btn-sm w-100 mt-2" onclick="logout()">
          <i class="fas fa-sign-out-alt me-1"></i><span class="nav-label">Logout</span>
        </button>
      </div>
    `;
  }

  const userNameEl = document.getElementById('topbarUserName');
  if (userNameEl) userNameEl.textContent = user.name;

  initSidebarToggle();
}

function initSidebarToggle() {
  const toggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileOverlay');

  toggle?.addEventListener('click', () => {
    if (window.innerWidth <= 991) {
      sidebar?.classList.toggle('mobile-open');
    } else {
      sidebar?.classList.toggle('collapsed');
    }
  });

  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-open');
  });
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };

  const toast = document.createElement('div');
  toast.className = `custom-toast ${type}`;
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}" style="color:var(--primary)"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  if (!modal) {
    if (confirm(message)) onConfirm();
    return;
  }

  document.getElementById('confirmMessage').textContent = message;
  const btn = document.getElementById('confirmBtn');
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    bootstrap.Modal.getInstance(modal).hide();
    onConfirm();
  });
  new bootstrap.Modal(modal).show();
}

function animateCounter(elementId, target, duration = 1200) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const num = parseInt(target, 10) || 0;
  if (num === 0) { el.textContent = '0'; return; }

  let start = 0;
  const step = num / (duration / 16);
  const tick = () => {
    start += step;
    if (start >= num) {
      el.textContent = num.toLocaleString();
      return;
    }
    el.textContent = Math.floor(start).toLocaleString();
    requestAnimationFrame(tick);
  };
  tick();
}

function paginate(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

function renderPagination(containerId, totalItems, currentPage, perPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const totalPages = Math.ceil(totalItems / perPage) || 1;
  let html = `<nav><ul class="pagination pagination-sm mb-0">`;

  html += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage - 1}">Prev</a></li>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      html += `<li class="page-item ${i === currentPage ? 'active' : ''}">
        <a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
  }

  html += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
    <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a></li>`;
  html += `</ul></nav>`;

  container.innerHTML = html;
  container.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = parseInt(link.dataset.page, 10);
      if (page >= 1 && page <= totalPages) onPageChange(page);
    });
  });
}

function showSkeleton(containerId, count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = Array(count).fill('').map(() =>
    '<div class="skeleton skeleton-card mb-3"></div>'
  ).join('');
}

function openModal(modalId) {
  new bootstrap.Modal(document.getElementById(modalId)).show();
}

function closeModal(modalId) {
  const modal = bootstrap.Modal.getInstance(document.getElementById(modalId));
  modal?.hide();
}
