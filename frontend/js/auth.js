function requireAuth(allowedRoles = []) {
  const user = getStoredUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    window.location.href = user.role === 'officer' ? 'dashboard.html' : 'jobs.html';
    return null;
  }
  return user;
}

function logout() {
  localStorage.removeItem('pms_user');
  sessionStorage.removeItem('pms_user');
  window.location.href = 'index.html';
}

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;
  const remember = document.getElementById('rememberMe').checked;
  const btn = e.target.querySelector('button[type="submit"]');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

  try {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, role })
    });

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('pms_user', JSON.stringify(data.user));

    showToast('Login successful! Redirecting...', 'success');
    setTimeout(() => {
      window.location.href = role === 'officer' ? 'dashboard.html' : 'jobs.html';
    }, 800);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i>Sign In';
  }
});

const savedUser = getStoredUser();
if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
  if (savedUser) {
    window.location.href = savedUser.role === 'officer' ? 'dashboard.html' : 'jobs.html';
  }
}
