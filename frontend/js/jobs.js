let allJobs = [];
let filteredJobs = [];
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('jobs.html');
  currentUser = requireAuth();
  if (!currentUser) return;

  const isOfficer = currentUser.role === 'officer';
  document.getElementById('addJobBtn')?.classList.toggle('d-none', !isOfficer);

  document.getElementById('addJobBtn')?.addEventListener('click', () => openJobModal());
  document.getElementById('jobForm')?.addEventListener('submit', saveJob);
  document.getElementById('searchInput')?.addEventListener('input', debounce(filterJobs));
  document.getElementById('companyFilter')?.addEventListener('change', filterJobs);
  document.getElementById('sortFilter')?.addEventListener('change', filterJobs);

  await loadJobs();
  if (isOfficer) await loadCompaniesForSelect();
});

async function loadJobs() {
  showSkeleton('jobsGrid', 6);
  try {
    allJobs = await apiRequest('/jobs');
    populateCompanyFilter();
    filterJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadCompaniesForSelect() {
  try {
    const companies = await apiRequest('/companies');
    const select = document.getElementById('jobCompanyId');
    select.innerHTML = companies.map(c =>
      `<option value="${c.COMPANY_ID}">${c.COMPANY_NAME}</option>`
    ).join('');
  } catch (err) {
    console.error(err);
  }
}

function populateCompanyFilter() {
  const companies = [...new Set(allJobs.map(j => j.COMPANY_NAME).filter(Boolean))].sort();
  const select = document.getElementById('companyFilter');
  select.innerHTML = '<option value="">All Companies</option>' +
    companies.map(c => `<option value="${c}">${c}</option>`).join('');
}

function filterJobs() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const company = document.getElementById('companyFilter').value;
  const sort = document.getElementById('sortFilter').value;

  filteredJobs = allJobs.filter(j => {
    const matchSearch = !search ||
      (j.JOB_ROLE || '').toLowerCase().includes(search) ||
      (j.COMPANY_NAME || '').toLowerCase().includes(search) ||
      (j.ELIGIBILITY || '').toLowerCase().includes(search);
    const matchCompany = !company || j.COMPANY_NAME === company;
    return matchSearch && matchCompany;
  });

  if (sort === 'package-desc') {
    filteredJobs.sort((a, b) => (b.PACKAGE || 0) - (a.PACKAGE || 0));
  } else if (sort === 'package-asc') {
    filteredJobs.sort((a, b) => (a.PACKAGE || 0) - (b.PACKAGE || 0));
  } else {
    filteredJobs.sort((a, b) => a.JOB_ID - b.JOB_ID);
  }

  renderJobs();
}

function renderJobs() {
  const grid = document.getElementById('jobsGrid');
  const isStudent = currentUser.role === 'student';

  if (!filteredJobs.length) {
    grid.innerHTML = '<div class="col-12"><div class="empty-state"><i class="fas fa-briefcase"></i><p>No job postings found</p></div></div>';
    return;
  }

  grid.innerHTML = filteredJobs.map(j => `
    <div class="col-md-6 col-lg-4">
      <div class="job-card glass-card">
        <div class="job-card-header">
          <div>
            <small class="text-muted">${j.COMPANY_NAME}</small>
            <h5 class="mb-0 mt-1">${j.JOB_ROLE}</h5>
          </div>
          <span class="badge bg-success-subtle text-success">${formatCurrency(j.PACKAGE)}</span>
        </div>
        <div class="job-meta">
          <span class="meta-item"><i class="fas fa-map-marker-alt"></i>${j.LOCATION || '-'}</span>
          <span class="meta-item"><i class="fas fa-graduation-cap"></i>${j.ELIGIBILITY || '-'}</span>
          <span class="meta-item"><i class="fas fa-star"></i>Min CGPA: ${j.MIN_CGPA ?? '-'}</span>
        </div>
        <div class="card-actions">
          ${isStudent ? `
            <button class="btn btn-primary btn-sm flex-fill" onclick="applyJob(${j.JOB_ID})">
              <i class="fas fa-paper-plane me-1"></i>Apply Now
            </button>
          ` : `
            <button class="btn btn-sm btn-outline-primary flex-fill" onclick="editJob(${j.JOB_ID})">
              <i class="fas fa-edit me-1"></i>Edit
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="deleteJob(${j.JOB_ID})">
              <i class="fas fa-trash"></i>
            </button>
          `}
        </div>
      </div>
    </div>
  `).join('');
}

async function applyJob(jobId) {
  showConfirm('Apply for this job posting?', async () => {
    try {
      await apiRequest('/applications', {
        method: 'POST',
        body: JSON.stringify({ JOB_ID: jobId })
      });
      showToast('Application submitted successfully!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function openJobModal(job = null) {
  document.getElementById('jobModalTitle').textContent = job ? 'Edit Job Posting' : 'Add Job Posting';
  document.getElementById('jobId').value = job?.JOB_ID || '';
  document.getElementById('jobCompanyId').value = job?.COMPANY_ID || '';
  document.getElementById('jobRole').value = job?.JOB_ROLE || '';
  document.getElementById('jobEligibility').value = job?.ELIGIBILITY || '';
  openModal('jobModal');
}

async function editJob(id) {
  try {
    const job = await apiRequest(`/jobs/${id}`);
    openJobModal(job);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveJob(e) {
  e.preventDefault();
  const id = document.getElementById('jobId').value;
  const body = {
    COMPANY_ID: document.getElementById('jobCompanyId').value,
    JOB_ROLE: document.getElementById('jobRole').value,
    ELIGIBILITY: document.getElementById('jobEligibility').value
  };

  try {
    if (id) {
      await apiRequest(`/jobs/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Job updated successfully', 'success');
    } else {
      await apiRequest('/jobs', { method: 'POST', body: JSON.stringify(body) });
      showToast('Job created successfully', 'success');
    }
    closeModal('jobModal');
    await loadJobs();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function deleteJob(id) {
  showConfirm('Delete this job posting?', async () => {
    try {
      await apiRequest(`/jobs/${id}`, { method: 'DELETE' });
      showToast('Job deleted successfully', 'success');
      await loadJobs();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
