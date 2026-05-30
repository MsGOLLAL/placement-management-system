let allApplications = [];
let filteredApplications = [];
let currentPage = 1;
const perPage = 10;
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('applications.html');
  currentUser = requireAuth();
  if (!currentUser) return;

  const isOfficer = currentUser.role === 'officer';

  document.getElementById('searchInput')?.addEventListener('input', debounce(filterApplications));
  document.getElementById('statusFilter')?.addEventListener('change', filterApplications);
  document.getElementById('statusForm')?.addEventListener('submit', updateStatus);

  await loadApplications();
});

async function loadApplications() {
  showSkeleton('applicationsTableBody', 5);
  try {
    allApplications = await apiRequest('/applications');
    filterApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterApplications() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';

  filteredApplications = allApplications.filter(a => {
    const matchSearch = !search ||
      (a.STUDENT_NAME || '').toLowerCase().includes(search) ||
      (a.COMPANY_NAME || '').toLowerCase().includes(search) ||
      (a.JOB_ROLE || '').toLowerCase().includes(search) ||
      (a.USN || '').toLowerCase().includes(search);
    const matchStatus = !status || a.STATUS === status;
    return matchSearch && matchStatus;
  });

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('applicationsTableBody');
  const pageData = paginate(filteredApplications, currentPage, perPage);
  const isOfficer = currentUser.role === 'officer';

  if (!pageData.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No applications found</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(a => `
      <tr>
        <td>${a.APPLICATION_ID}</td>
        <td><strong>${a.STUDENT_NAME}</strong><br><small class="text-muted">${a.USN || ''}</small></td>
        <td>${a.COMPANY_NAME}</td>
        <td>${a.JOB_ROLE}</td>
        <td>${formatCurrency(a.PACKAGE)}</td>
        <td>${formatDate(a.APPLICATION_DATE)}</td>
        <td><span class="status-badge ${getStatusClass(a.STATUS)}">${a.STATUS}</span></td>
        <td>
          ${isOfficer ? `
            <button class="btn btn-sm btn-outline-primary" onclick="openStatusModal(${a.APPLICATION_ID}, '${a.STATUS}')">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteApplication(${a.APPLICATION_ID})">
              <i class="fas fa-trash"></i>
            </button>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('tableInfo').textContent =
    `Showing ${pageData.length} of ${filteredApplications.length} applications`;

  renderPagination('pagination', filteredApplications.length, currentPage, perPage, (page) => {
    currentPage = page;
    renderTable();
  });
}

function openStatusModal(id, currentStatus) {
  document.getElementById('statusAppId').value = id;
  document.getElementById('statusSelect').value = currentStatus;
  openModal('statusModal');
}

async function updateStatus(e) {
  e.preventDefault();
  const id = document.getElementById('statusAppId').value;
  const STATUS = document.getElementById('statusSelect').value;

  try {
    await apiRequest(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ STATUS })
    });
    showToast('Application status updated', 'success');
    closeModal('statusModal');
    await loadApplications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function deleteApplication(id) {
  showConfirm('Delete this application?', async () => {
    try {
      await apiRequest(`/applications/${id}`, { method: 'DELETE' });
      showToast('Application deleted', 'success');
      await loadApplications();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
