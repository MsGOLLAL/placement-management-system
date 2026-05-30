let allInterviews = [];
let currentMonth = new Date();

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('interviews.html');
  const user = requireAuth(['officer']);
  if (!user) return;

  document.getElementById('scheduleBtn')?.addEventListener('click', () => openScheduleModal());
  document.getElementById('scheduleForm')?.addEventListener('submit', scheduleInterview);
  document.getElementById('resultForm')?.addEventListener('submit', updateResult);
  document.getElementById('prevMonth')?.addEventListener('click', () => changeMonth(-1));
  document.getElementById('nextMonth')?.addEventListener('click', () => changeMonth(1));

  document.getElementById('resultSelect')?.addEventListener('change', (e) => {
    const note = document.getElementById('triggerNote');
    note.classList.toggle('d-none', e.target.value !== 'Selected');
  });

  await loadInterviews();
  await loadApplicationsForSelect();
});

async function loadInterviews() {
  showSkeleton('interviewsTableBody', 5);
  try {
    allInterviews = await apiRequest('/interviews');
    renderTable();
    renderCalendar();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function loadApplicationsForSelect() {
  try {
    const apps = await apiRequest('/applications');
    const eligible = apps.filter(a =>
      a.STATUS === 'Shortlisted' || a.STATUS === 'Applied' || a.STATUS === 'Interview Scheduled'
    );
    const select = document.getElementById('scheduleAppId');
    select.innerHTML = '<option value="">Select Application</option>' +
      eligible.map(a =>
        `<option value="${a.APPLICATION_ID}">${a.STUDENT_NAME} — ${a.JOB_ROLE} (${a.COMPANY_NAME})</option>`
      ).join('');
  } catch (err) {
    console.error(err);
  }
}

function renderTable() {
  const tbody = document.getElementById('interviewsTableBody');

  if (!allInterviews.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted">No interviews scheduled</td></tr>`;
    return;
  }

  tbody.innerHTML = allInterviews.map(i => {
    const dateStr = i.INTERVIEW_DATE ? new Date(i.INTERVIEW_DATE).toISOString().split('T')[0] : '';
    const result = i.RESULT || 'Pending';
    return `
    <tr>
      <td>${i.INTERVIEW_ID}</td>
      <td><strong>${i.STUDENT_NAME}</strong><br><small class="text-muted">${i.USN}</small></td>
      <td>${i.COMPANY_NAME}</td>
      <td>${i.JOB_ROLE}</td>
      <td>${formatDate(i.INTERVIEW_DATE)}</td>
      <td><span class="status-badge ${getStatusClass(result)}">${result}</span></td>
      <td>
        <button class="btn btn-sm btn-outline-primary btn-update-result"
          data-id="${i.INTERVIEW_ID}" data-date="${dateStr}" data-result="${result}">
          <i class="fas fa-edit"></i> Update
        </button>
      </td>
    </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-update-result').forEach(btn => {
    btn.addEventListener('click', () => {
      openResultModal(btn.dataset.id, btn.dataset.date, btn.dataset.result);
    });
  });
}

function openScheduleModal() {
  document.getElementById('scheduleDate').value = new Date().toISOString().split('T')[0];
  openModal('scheduleModal');
}

async function scheduleInterview(e) {
  e.preventDefault();
  const body = {
    APPLICATION_ID: document.getElementById('scheduleAppId').value,
    INTERVIEW_DATE: document.getElementById('scheduleDate').value,
    RESULT: 'Pending'
  };

  try {
    await apiRequest('/interviews', { method: 'POST', body: JSON.stringify(body) });
    showToast('Interview scheduled successfully', 'success');
    closeModal('scheduleModal');
    await loadInterviews();
    await loadApplicationsForSelect();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function openResultModal(id, date, result) {
  document.getElementById('resultInterviewId').value = id;
  document.getElementById('resultDate').value = date;
  document.getElementById('resultSelect').value = result;
  document.getElementById('triggerNote').classList.toggle('d-none', result !== 'Selected');
  openModal('resultModal');
}

async function updateResult(e) {
  e.preventDefault();
  const id = document.getElementById('resultInterviewId').value;
  const body = {
    INTERVIEW_DATE: document.getElementById('resultDate').value,
    RESULT: document.getElementById('resultSelect').value
  };

  try {
    const res = await apiRequest(`/interviews/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    showToast(res.message, 'success');
    closeModal('resultModal');
    await loadInterviews();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function changeMonth(delta) {
  currentMonth.setMonth(currentMonth.getMonth() + delta);
  renderCalendar();
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  document.getElementById('calendarTitle').textContent = `${monthNames[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const interviewDates = allInterviews.map(i => {
    const d = new Date(i.INTERVIEW_DATE);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  });

  let html = '';
  const dayHeaders = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  dayHeaders.forEach(d => {
    html += `<div class="text-center fw-bold text-muted small py-1">${d}</div>`;
  });

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day other-month"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = `${year}-${month}-${day}`;
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
    const hasInterview = interviewDates.includes(dateKey);
    html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasInterview ? 'has-interview' : ''}"
      title="${hasInterview ? 'Interview scheduled' : ''}">${day}</div>`;
  }

  document.getElementById('calendarGrid').innerHTML = html;
}
