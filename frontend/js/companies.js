let allCompanies = [];
let filteredCompanies = [];

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('companies.html');
  const user = requireAuth(['officer']);
  if (!user) return;

  document.getElementById('addCompanyBtn')?.addEventListener('click', () => openCompanyModal());
  document.getElementById('companyForm')?.addEventListener('submit', saveCompany);
  document.getElementById('searchInput')?.addEventListener('input', debounce(filterCompanies));
  document.getElementById('locationFilter')?.addEventListener('change', filterCompanies);

  await loadCompanies();
});

async function loadCompanies() {
  showSkeleton('companiesGrid', 6);
  try {
    allCompanies = await apiRequest('/companies');
    populateLocationFilter();
    filterCompanies();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateLocationFilter() {
  const locations = [...new Set(allCompanies.map(c => c.LOCATION).filter(Boolean))].sort();
  const select = document.getElementById('locationFilter');
  select.innerHTML = '<option value="">All Locations</option>' +
    locations.map(l => `<option value="${l}">${l}</option>`).join('');
}

function filterCompanies() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const location = document.getElementById('locationFilter').value;

  filteredCompanies = allCompanies.filter(c => {
    const matchSearch = !search ||
      (c.COMPANY_NAME || '').toLowerCase().includes(search) ||
      (c.LOCATION || '').toLowerCase().includes(search);
    const matchLocation = !location || c.LOCATION === location;
    return matchSearch && matchLocation;
  });

  renderCompanies();
}

function renderCompanies() {
  const grid = document.getElementById('companiesGrid');

  if (!filteredCompanies.length) {
    grid.innerHTML = '<div class="col-12"><div class="empty-state"><i class="fas fa-building"></i><p>No companies found</p></div></div>';
    return;
  }

  grid.innerHTML = filteredCompanies.map(c => `
    <div class="col-md-6 col-lg-4">
      <div class="company-card glass-card">
        <div class="company-card-header">
          <div class="company-icon"><i class="fas fa-building"></i></div>
          <span class="badge bg-success-subtle text-success">${formatCurrency(c.PACKAGE)}</span>
        </div>
        <h5 class="mb-2">${c.COMPANY_NAME}</h5>
        <div class="company-meta">
          <span class="meta-item"><i class="fas fa-map-marker-alt"></i>${c.LOCATION || '-'}</span>
          <span class="meta-item"><i class="fas fa-star"></i>Min CGPA: ${c.MIN_CGPA ?? '-'}</span>
        </div>
        <div class="card-actions">
          <button class="btn btn-sm btn-outline-primary flex-fill" onclick="editCompany(${c.COMPANY_ID})">
            <i class="fas fa-edit me-1"></i>Edit
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteCompany(${c.COMPANY_ID})">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openCompanyModal(company = null) {
  document.getElementById('companyModalTitle').textContent = company ? 'Edit Company' : 'Add Company';
  document.getElementById('companyId').value = company?.COMPANY_ID || '';
  document.getElementById('companyName').value = company?.COMPANY_NAME || '';
  document.getElementById('companyLocation').value = company?.LOCATION || '';
  document.getElementById('companyPackage').value = company?.PACKAGE ?? '';
  document.getElementById('companyMinCgpa').value = company?.MIN_CGPA ?? '';
  openModal('companyModal');
}

async function editCompany(id) {
  try {
    const company = await apiRequest(`/companies/${id}`);
    openCompanyModal(company);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveCompany(e) {
  e.preventDefault();
  const id = document.getElementById('companyId').value;
  const body = {
    COMPANY_NAME: document.getElementById('companyName').value,
    LOCATION: document.getElementById('companyLocation').value,
    PACKAGE: parseFloat(document.getElementById('companyPackage').value),
    MIN_CGPA: parseFloat(document.getElementById('companyMinCgpa').value)
  };

  try {
    if (id) {
      await apiRequest(`/companies/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Company updated successfully', 'success');
    } else {
      await apiRequest('/companies', { method: 'POST', body: JSON.stringify(body) });
      showToast('Company added successfully', 'success');
    }
    closeModal('companyModal');
    await loadCompanies();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function deleteCompany(id) {
  showConfirm('Are you sure you want to delete this company?', async () => {
    try {
      await apiRequest(`/companies/${id}`, { method: 'DELETE' });
      showToast('Company deleted successfully', 'success');
      await loadCompanies();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
