let allStudents = [];
let filteredStudents = [];
let currentPage = 1;
let sortField = 'STUDENT_ID';
let sortAsc = true;
const perPage = 10;

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('students.html');
  const user = requireAuth(['officer']);
  if (!user) return;

  document.getElementById('addStudentBtn')?.addEventListener('click', () => openStudentModal());
  document.getElementById('studentForm')?.addEventListener('submit', saveStudent);
  document.getElementById('searchInput')?.addEventListener('input', debounce(filterStudents));
  document.getElementById('branchFilter')?.addEventListener('change', filterStudents);

  await loadStudents();
});

async function loadStudents() {
  showSkeleton('studentsTableBody', 5);
  try {
    allStudents = await apiRequest('/students');
    populateBranchFilter();
    filterStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function populateBranchFilter() {
  const branches = [...new Set(allStudents.map(s => s.BRANCH).filter(Boolean))].sort();
  const select = document.getElementById('branchFilter');
  select.innerHTML = '<option value="">All Branches</option>' +
    branches.map(b => `<option value="${b}">${b}</option>`).join('');
}

function filterStudents() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const branch = document.getElementById('branchFilter').value;

  filteredStudents = allStudents.filter(s => {
    const matchSearch = !search ||
      (s.STUDENT_NAME || '').toLowerCase().includes(search) ||
      (s.USN || '').toLowerCase().includes(search) ||
      (s.EMAIL || '').toLowerCase().includes(search);
    const matchBranch = !branch || s.BRANCH === branch;
    return matchSearch && matchBranch;
  });

  filteredStudents.sort((a, b) => {
    let va = a[sortField], vb = b[sortField];
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  currentPage = 1;
  renderTable();
}

function sortBy(field) {
  if (sortField === field) sortAsc = !sortAsc;
  else { sortField = field; sortAsc = true; }
  filterStudents();
}

function renderTable() {
  const tbody = document.getElementById('studentsTableBody');
  const pageData = paginate(filteredStudents, currentPage, perPage);

  if (!pageData.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">No students found</td></tr>`;
  } else {
    tbody.innerHTML = pageData.map(s => {
      const completion = calcProfileCompletion(s);
      return `<tr>
        <td>${s.STUDENT_ID}</td>
        <td><strong>${s.STUDENT_NAME}</strong></td>
        <td>${s.USN}</td>
        <td><span class="badge bg-light text-dark">${s.BRANCH}</span></td>
        <td>${s.CGPA ?? '-'}</td>
        <td>${s.EMAIL || '-'}</td>
        <td>${s.PHONE || '-'}</td>
        <td>
          <div class="profile-meter mb-1" style="width:60px">
            <div class="profile-meter-fill" style="width:${completion}%"></div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" onclick="editStudent(${s.STUDENT_ID})" title="Edit"><i class="fas fa-edit"></i></button>
            <button class="btn btn-outline-danger" onclick="deleteStudent(${s.STUDENT_ID})" title="Delete"><i class="fas fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  document.getElementById('tableInfo').textContent =
    `Showing ${pageData.length} of ${filteredStudents.length} students`;

  renderPagination('pagination', filteredStudents.length, currentPage, perPage, (page) => {
    currentPage = page;
    renderTable();
  });
}

function calcProfileCompletion(s) {
  const fields = [s.STUDENT_NAME, s.USN, s.BRANCH, s.CGPA, s.EMAIL, s.PHONE];
  const filled = fields.filter(f => f != null && f !== '').length;
  return Math.round((filled / fields.length) * 100);
}

function openStudentModal(student = null) {
  document.getElementById('studentModalTitle').textContent = student ? 'Edit Student' : 'Add Student';
  document.getElementById('studentId').value = student?.STUDENT_ID || '';
  document.getElementById('studentName').value = student?.STUDENT_NAME || '';
  document.getElementById('studentUsn').value = student?.USN || '';
  document.getElementById('studentBranch').value = student?.BRANCH || '';
  document.getElementById('studentCgpa').value = student?.CGPA ?? '';
  document.getElementById('studentEmail').value = student?.EMAIL || '';
  document.getElementById('studentPhone').value = student?.PHONE || '';
  openModal('studentModal');
}

async function editStudent(id) {
  try {
    const student = await apiRequest(`/students/${id}`);
    openStudentModal(student);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function saveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('studentId').value;
  const body = {
    STUDENT_NAME: document.getElementById('studentName').value,
    USN: document.getElementById('studentUsn').value,
    BRANCH: document.getElementById('studentBranch').value,
    CGPA: parseFloat(document.getElementById('studentCgpa').value),
    EMAIL: document.getElementById('studentEmail').value,
    PHONE: document.getElementById('studentPhone').value
  };

  try {
    if (id) {
      await apiRequest(`/students/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      showToast('Student updated successfully', 'success');
    } else {
      await apiRequest('/students', { method: 'POST', body: JSON.stringify(body) });
      showToast('Student added successfully', 'success');
    }
    closeModal('studentModal');
    await loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function deleteStudent(id) {
  showConfirm('Are you sure you want to delete this student?', async () => {
    try {
      await apiRequest(`/students/${id}`, { method: 'DELETE' });
      showToast('Student deleted successfully', 'success');
      await loadStudents();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
