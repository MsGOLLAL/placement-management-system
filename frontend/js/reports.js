let currentReportData = [];
let currentReportType = '';
let allJobs = [];

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('reports.html');
  const user = requireAuth(['officer']);
  if (!user) return;

  document.getElementById('reportType')?.addEventListener('change', onReportTypeChange);
  document.getElementById('generateBtn')?.addEventListener('click', generateReport);
  document.getElementById('exportPdfBtn')?.addEventListener('click', exportPDF);
  document.getElementById('exportExcelBtn')?.addEventListener('click', exportExcel);
  document.getElementById('printBtn')?.addEventListener('click', () => window.print());

  await loadJobsForEligible();
  await loadStatistics();
});

async function loadJobsForEligible() {
  try {
    allJobs = await apiRequest('/jobs');
    const select = document.getElementById('jobSelect');
    select.innerHTML = '<option value="">Select Job</option>' +
      allJobs.map(j => `<option value="${j.JOB_ID}">${j.JOB_ROLE} — ${j.COMPANY_NAME}</option>`).join('');
  } catch (err) {
    console.error(err);
  }
}

async function loadStatistics() {
  try {
    const stats = await apiRequest('/reports/statistics');
    document.getElementById('statTotalStudents').textContent = stats.totalStudents;
    document.getElementById('statSelected').textContent = stats.selectedStudents;
    document.getElementById('statPlacementPct').textContent = stats.placementPercentage + '%';
    document.getElementById('statCompanies').textContent = stats.totalCompanies;
    document.getElementById('statJobs').textContent = stats.totalJobs;
    document.getElementById('statApplications').textContent = stats.totalApplications;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function onReportTypeChange() {
  const type = document.getElementById('reportType').value;
  document.getElementById('jobSelectGroup').classList.toggle('d-none', type !== 'eligible');
}

async function generateReport() {
  const type = document.getElementById('reportType').value;
  if (!type) {
    showToast('Please select a report type', 'warning');
    return;
  }

  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';

  try {
    let data, headers, title;

    switch (type) {
      case 'eligible': {
        const jobId = document.getElementById('jobSelect').value;
        if (!jobId) { showToast('Select a job for eligible students report', 'warning'); return; }
        data = await apiRequest(`/reports/eligible-students?jobId=${jobId}`);
        headers = ['STUDENT_ID','STUDENT_NAME','USN','BRANCH','CGPA','EMAIL','PHONE'];
        title = 'Eligible Students Report';
        break;
      }
      case 'selected':
        data = await apiRequest('/reports/selected-students');
        headers = ['STUDENT_NAME','USN','BRANCH','CGPA','COMPANY_NAME','JOB_ROLE','PACKAGE','APPLICATION_DATE'];
        title = 'Selected Students Report';
        break;
      case 'company':
        data = await apiRequest('/reports/company-wise');
        headers = ['COMPANY_NAME','LOCATION','PACKAGE','PLACEMENTS'];
        title = 'Company-wise Placement Report';
        break;
      case 'branch':
        data = await apiRequest('/reports/branch-wise');
        headers = ['BRANCH','PLACEMENTS','PLACEMENT_RATE'];
        title = 'Branch-wise Placement Report';
        break;
    }

    currentReportData = data;
    currentReportType = title;
    renderReportTable(data, headers, title);
    document.getElementById('exportActions').classList.remove('d-none');
    showToast('Report generated successfully', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sync me-2"></i>Generate Report';
  }
}

function renderReportTable(data, headers, title) {
  document.getElementById('reportTitle').textContent = title;
  document.getElementById('reportDate').textContent = 'Generated: ' + new Date().toLocaleString('en-IN');

  const thead = document.getElementById('reportTableHead');
  const tbody = document.getElementById('reportTableBody');

  thead.innerHTML = `<tr>${headers.map(h =>
    `<th>${h.replace(/_/g, ' ')}</th>`
  ).join('')}</tr>`;

  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center py-4 text-muted">No data found</td></tr>`;
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr>${headers.map(h => {
      let val = row[h];
      if (h === 'PACKAGE') val = formatCurrency(val);
      if (h === 'APPLICATION_DATE') val = formatDate(val);
      if (h === 'PLACEMENT_RATE') val = val != null ? val + '%' : '-';
      return `<td>${val ?? '-'}</td>`;
    }).join('')}</tr>
  `).join('');
}

function exportPDF() {
  if (!currentReportData.length) { showToast('Generate a report first', 'warning'); return; }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('l', 'mm', 'a4');

  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text(currentReportType, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Generated: ' + new Date().toLocaleString('en-IN'), 14, 22);

  const headers = Object.keys(currentReportData[0]).map(k => k.replace(/_/g, ' '));
  const rows = currentReportData.map(row => Object.values(row).map(v => v ?? '-'));

  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 28,
    headStyles: { fillColor: [22, 163, 74] },
    styles: { fontSize: 8 }
  });

  doc.save(currentReportType.replace(/\s+/g, '_') + '.pdf');
  showToast('PDF exported successfully', 'success');
}

function exportExcel() {
  if (!currentReportData.length) { showToast('Generate a report first', 'warning'); return; }

  const ws = XLSX.utils.json_to_sheet(currentReportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, currentReportType.replace(/\s+/g, '_') + '.xlsx');
  showToast('Excel exported successfully', 'success');
}
