let chartInstances = [];

document.addEventListener('DOMContentLoaded', async () => {
  initLayout('dashboard.html');
  const user = requireAuth(['officer']);
  if (!user) return;

  document.getElementById('welcomeName').textContent = user.name;

  try {
    await loadDashboard();
  } catch (err) {
    showToast('Failed to load dashboard: ' + err.message, 'error');
  }
});

async function loadDashboard() {
  showSkeleton('activityList', 5);

  const [stats, charts, activities] = await Promise.all([
    apiRequest('/dashboard/stats'),
    apiRequest('/dashboard/charts'),
    apiRequest('/dashboard/activities')
  ]);

  animateCounter('statStudents', stats.totalStudents);
  animateCounter('statCompanies', stats.totalCompanies);
  animateCounter('statJobs', stats.totalJobs);
  animateCounter('statApplications', stats.totalApplications);
  animateCounter('statSelected', stats.selectedStudents);

  renderCharts(charts);
  renderActivities(activities);
}

function renderCharts(data) {
  chartInstances.forEach(c => c.destroy());
  chartInstances = [];

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } }
  };

  const placementCtx = document.getElementById('placementChart');
  if (placementCtx) {
    chartInstances.push(new Chart(placementCtx, {
      type: 'doughnut',
      data: {
        labels: ['Selected', 'Not Selected'],
        datasets: [{
          data: [data.selected, data.notSelected],
          backgroundColor: ['#16A34A', '#E2E8F0'],
          borderWidth: 0
        }]
      },
      options: {
        ...chartDefaults,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom' },
          tooltip: { enabled: true }
        }
      }
    }));

    document.getElementById('placementPct').textContent = data.placementPercentage + '%';
  }

  const companyCtx = document.getElementById('companyChart');
  if (companyCtx && data.companyWise.length) {
    chartInstances.push(new Chart(companyCtx, {
      type: 'bar',
      data: {
        labels: data.companyWise.map(r => r.COMPANY_NAME),
        datasets: [{
          label: 'Placements',
          data: data.companyWise.map(r => r.PLACED),
          backgroundColor: '#16A34A',
          borderRadius: 6
        }]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    }));
  }

  const branchCtx = document.getElementById('branchChart');
  if (branchCtx && data.branchWise.length) {
    const colors = ['#16A34A', '#22C55E', '#4ADE80', '#86EFAC', '#BBF7D0'];
    chartInstances.push(new Chart(branchCtx, {
      type: 'pie',
      data: {
        labels: data.branchWise.map(r => r.BRANCH),
        datasets: [{
          data: data.branchWise.map(r => r.PLACED),
          backgroundColor: colors
        }]
      },
      options: chartDefaults
    }));
  }

  const trendCtx = document.getElementById('trendChart');
  if (trendCtx) {
    chartInstances.push(new Chart(trendCtx, {
      type: 'line',
      data: {
        labels: data.monthlyTrend.map(r => r.MONTH),
        datasets: [{
          label: 'Placements',
          data: data.monthlyTrend.map(r => r.CNT),
          borderColor: '#16A34A',
          backgroundColor: 'rgba(22, 163, 74, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#16A34A'
        }]
      },
      options: {
        ...chartDefaults,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
      }
    }));
  }
}

function renderActivities(activities) {
  const container = document.getElementById('activityList');
  if (!activities.length) {
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No recent activities</p></div>';
    return;
  }

  container.innerHTML = activities.map(a => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div class="activity-content">
        <p><strong>${a.STUDENT_NAME}</strong> — ${a.JOB_ROLE} at ${a.COMPANY_NAME}</p>
        <small><span class="status-badge ${getStatusClass(a.STATUS)}">${a.STATUS}</span> · ${formatDate(a.APPLICATION_DATE)}</small>
      </div>
    </div>
  `).join('');
}
