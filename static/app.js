(function () {
  'use strict';

  /* ==========================================================
     ExpenseTrack — Client-Side Application
     Production-grade SPA: Router, Auth, Dashboard, CRUD, Charts
     ========================================================== */

  // ── Sanitization ────────────────────────────────────────────
  function sanitize(str) {
    if (str == null) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  // ── Token Management (sessionStorage only) ──────────────────
  function getToken() { return sessionStorage.getItem('et_token'); }
  function setToken(t) { sessionStorage.setItem('et_token', t); }
  function clearToken() { sessionStorage.removeItem('et_token'); }
  function getUsername() { return sessionStorage.getItem('et_username'); }
  function setUsername(u) { sessionStorage.setItem('et_username', u); }
  function clearUsername() { sessionStorage.removeItem('et_username'); }

  // ── Friendly Error Map ──────────────────────────────────────
  var ERROR_MAP = {
    400: 'Please check your input and try again.',
    401: 'Session expired. Please log in again.',
    404: 'The requested resource was not found.',
    409: 'This already exists.',
    500: 'Something went wrong. Please try again later.'
  };

  // ── API Fetch Wrapper ───────────────────────────────────────
  async function apiFetch(endpoint, options) {
    options = options || {};
    var token = getToken();
    var headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    if (token) headers['Authorization'] = 'Bearer ' + token;

    try {
      var res = await fetch(endpoint, Object.assign({}, options, { headers: headers }));
      var data;
      try { data = await res.json(); } catch (_) { data = null; }

      if (!res.ok) {
        var msg = (data && data.error) ? data.error : (ERROR_MAP[res.status] || 'An unexpected error occurred.');
        if (res.status === 401 && endpoint !== '/api/login') {
          clearToken();
          clearUsername();
          navigate('auth');
          showToast('Session expired. Please log in again.', 'error');
        }
        return { ok: false, status: res.status, error: msg, data: data };
      }
      return { ok: true, data: data };
    } catch (err) {
      return { ok: false, error: 'Network error. Please check your connection.', data: null };
    }
  }

  // ── Currency Formatting ─────────────────────────────────────
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(Math.abs(amount));
  }

  function formatAmountDisplay(amount) {
    var abs = formatCurrency(amount);
    if (amount >= 0) return '+' + abs;
    return '-' + abs;
  }

  // ── Toast System ────────────────────────────────────────────
  var TOAST_ICONS = {
    success: '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  function showToast(message, type) {
    type = type || 'info';
    var container = document.getElementById('toast-container');
    if (!container) return;
    var toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML =
      (TOAST_ICONS[type] || TOAST_ICONS.info) +
      '<span class="toast-message">' + sanitize(message) + '</span>' +
      '<button class="toast-close" type="button">&times;</button>' +
      '<div class="toast-progress"></div>';
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', function () { removeToast(toast); });
    setTimeout(function () { removeToast(toast); }, 4000);
  }

  function removeToast(toast) {
    if (!toast || !toast.parentNode) return;
    toast.style.animation = 'toastOut 0.2s ease forwards';
    toast.addEventListener('animationend', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  // ── Router ──────────────────────────────────────────────────
  function navigate(view) {
    window.location.hash = view;
  }

  function handleRoute() {
    var hash = window.location.hash.slice(1) || 'landing';
    var views = ['landing', 'auth', 'dashboard'];

    if (hash === 'dashboard' && !getToken()) {
      navigate('auth');
      return;
    }

    if (views.indexOf(hash) === -1) {
      hash = 'landing';
    }

    views.forEach(function (v) {
      var el = document.getElementById('view-' + v);
      if (el) el.style.display = (v === hash) ? '' : 'none';
    });

    if (hash === 'dashboard') {
      initDashboard();
    }
    if (hash === 'auth') {
      resetAuthForm();
    }
  }

  window.addEventListener('hashchange', handleRoute);

  // ── Landing Page Handlers ───────────────────────────────────
  function initLanding() {
    var goAuth = function () { navigate('auth'); };
    bindClick('nav-login-btn', goAuth);
    bindClick('nav-signup-btn', goAuth);
    bindClick('hero-cta-btn', goAuth);
    bindClick('hero-demo-btn', goAuth);
  }

  // ── Auth Module ─────────────────────────────────────────────
  var authMode = 'login';

  function initAuth() {
    var tabLogin = document.getElementById('tab-login');
    var tabRegister = document.getElementById('tab-register');

    if (tabLogin) {
      tabLogin.onclick = function () { switchAuthTab('login'); };
    }
    if (tabRegister) {
      tabRegister.onclick = function () { switchAuthTab('register'); };
    }

    var form = document.getElementById('auth-form');
    if (form) {
      form.onsubmit = handleAuthSubmit;
    }

    var backBtn = document.getElementById('auth-back-btn');
    if (backBtn) {
      backBtn.onclick = function () { navigate('landing'); };
    }
  }

  function switchAuthTab(mode) {
    authMode = mode;
    var tabLogin = document.getElementById('tab-login');
    var tabRegister = document.getElementById('tab-register');
    var submitBtn = document.getElementById('auth-submit-btn');

    if (tabLogin) tabLogin.classList.toggle('active', mode === 'login');
    if (tabRegister) tabRegister.classList.toggle('active', mode === 'register');

    var btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    if (btnText) btnText.textContent = mode === 'login' ? 'Log In' : 'Create Account';

    hideEl('auth-error');
    hideEl('auth-success');
    clearInputError('username-error');
    clearInputError('password-error');
  }

  function resetAuthForm() {
    var form = document.getElementById('auth-form');
    if (form) form.reset();
    hideEl('auth-error');
    hideEl('auth-success');
    clearInputError('username-error');
    clearInputError('password-error');
    switchAuthTab('login');
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    var username = (document.getElementById('auth-username').value || '').trim();
    var password = document.getElementById('auth-password').value || '';

    // Validate
    var valid = true;
    clearInputError('username-error');
    clearInputError('password-error');
    hideEl('auth-error');

    if (!username || username.length < 3) {
      showInputError('username-error', 'Username must be at least 3 characters.');
      valid = false;
    } else if (username.length > 50) {
      showInputError('username-error', 'Username must be under 50 characters.');
      valid = false;
    }

    if (!password || password.length < 6) {
      showInputError('password-error', 'Password must be at least 6 characters.');
      valid = false;
    }

    if (!valid) return;

    var btn = document.getElementById('auth-submit-btn');
    setButtonLoading(btn, true);

    try {
      if (authMode === 'register') {
        var res = await apiFetch('/api/register', {
          method: 'POST',
          body: JSON.stringify({ username: username, password: password })
        });
        if (res.ok) {
          showElWithText('auth-success', 'Account created! Please log in.');
          hideEl('auth-error');
          switchAuthTab('login');
        } else {
          showElWithText('auth-error', res.error);
        }
      } else {
        var res = await apiFetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ username: username, password: password })
        });
        if (res.ok) {
          setToken(res.data.token);
          setUsername(username);
          navigate('dashboard');
        } else {
          showElWithText('auth-error', res.error);
        }
      }
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ── Dashboard Module ────────────────────────────────────────
  var categories = [];
  var transactions = [];
  var categoryChart = null;
  var trendChart = null;
  var deleteTargetId = null;
  var currentSort = 'date-desc';
  var currentFilter = '';
  var dashboardInitialized = false;

  async function initDashboard() {
    // Set user info
    var username = getUsername() || '?';
    var avatarEl = document.getElementById('user-avatar');
    var nameEl = document.getElementById('user-display-name');
    if (avatarEl) avatarEl.textContent = username.charAt(0).toUpperCase();
    if (nameEl) nameEl.textContent = username;

    // Wire up event listeners (only once)
    if (!dashboardInitialized) {
      dashboardInitialized = true;
      initDashboardListeners();
    }

    // Load data
    await Promise.all([loadCategories(), loadTransactions()]);
    updateSummary();
    updateCharts();
  }

  function initDashboardListeners() {
    // Add transaction buttons
    bindClick('add-transaction-btn', function () { openDrawer('add'); });
    bindClick('empty-add-btn', function () { openDrawer('add'); });

    // Logout
    bindClick('logout-btn', function () {
      clearToken();
      clearUsername();
      dashboardInitialized = false;
      navigate('landing');
    });

    // Sidebar links
    document.querySelectorAll('.sidebar-link').forEach(function (link) {
      link.addEventListener('click', function () {
        document.querySelectorAll('.sidebar-link').forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');
        var section = link.getAttribute('data-section');
        var title = document.getElementById('page-title');
        var subtitle = document.getElementById('page-subtitle');
        if (section === 'overview') {
          if (title) title.textContent = 'Overview';
          if (subtitle) subtitle.textContent = "Here's what's happening with your finances";
        } else if (section === 'transactions') {
          if (title) title.textContent = 'Transactions';
          if (subtitle) subtitle.textContent = 'Manage and review all your transactions';
          var txSection = document.getElementById('transactions-section');
          if (txSection) txSection.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Filters
    var filterCat = document.getElementById('filter-category');
    if (filterCat) {
      filterCat.addEventListener('change', function () {
        currentFilter = filterCat.value;
        renderTransactions();
      });
    }

    var sortOrder = document.getElementById('sort-order');
    if (sortOrder) {
      sortOrder.addEventListener('change', function () {
        currentSort = sortOrder.value;
        renderTransactions();
      });
    }

    // Transaction table actions (event delegation)
    var tbody = document.getElementById('transactions-tbody');
    if (tbody) {
      tbody.addEventListener('click', function (e) {
        var btn = e.target.closest('.action-btn');
        if (!btn) return;
        var action = btn.getAttribute('data-action');
        var id = parseInt(btn.getAttribute('data-id'), 10);
        if (action === 'edit') {
          openDrawer('edit', id);
        } else if (action === 'delete') {
          deleteTargetId = id;
          showEl('delete-modal');
        }
      });
    }

    // Drawer
    bindClick('drawer-close-btn', closeDrawer);
    bindClick('drawer-cancel-btn', closeDrawer);
    bindClick('drawer-overlay', closeDrawer);

    var txnForm = document.getElementById('transaction-form');
    if (txnForm) {
      txnForm.addEventListener('submit', handleTransactionSubmit);
    }

    var txnCategory = document.getElementById('txn-category');
    if (txnCategory) {
      txnCategory.addEventListener('change', function () {
        var group = document.getElementById('new-category-group');
        if (group) {
          group.style.display = txnCategory.value === '__new__' ? '' : 'none';
        }
      });
    }

    // Delete modal
    bindClick('delete-cancel-btn', function () {
      hideEl('delete-modal');
      deleteTargetId = null;
    });

    var deleteConfirm = document.getElementById('delete-confirm-btn');
    if (deleteConfirm) {
      deleteConfirm.addEventListener('click', handleDeleteConfirm);
    }
  }

  // ── Categories ──────────────────────────────────────────────
  async function loadCategories() {
    var res = await apiFetch('/api/categories');
    if (res.ok) {
      categories = res.data || [];
    } else {
      categories = [];
    }
    populateCategoryDropdowns();
  }

  function populateCategoryDropdowns() {
    // Filter dropdown
    var filter = document.getElementById('filter-category');
    if (filter) {
      var currentVal = filter.value;
      filter.innerHTML = '<option value="">All Categories</option>';
      categories.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        filter.appendChild(opt);
      });
      filter.value = currentVal;
    }

    // Transaction form dropdown
    var txnCat = document.getElementById('txn-category');
    if (txnCat) {
      txnCat.innerHTML = '<option value="" disabled selected>Select category</option>';
      categories.forEach(function (c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        txnCat.appendChild(opt);
      });
      var newOpt = document.createElement('option');
      newOpt.value = '__new__';
      newOpt.textContent = '+ Add new category';
      txnCat.appendChild(newOpt);
    }
  }

  function getCategoryName(categoryId) {
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === categoryId) return categories[i].name;
    }
    return 'Uncategorized';
  }

  // Badge color rotation
  var BADGE_CLASSES = ['', 'badge-emerald', 'badge-amber', 'badge-blue', 'badge-rose'];
  function getBadgeClass(categoryId) {
    if (!categoryId) return '';
    return BADGE_CLASSES[categoryId % BADGE_CLASSES.length];
  }

  // ── Transactions ────────────────────────────────────────────
  async function loadTransactions() {
    showEl('transactions-skeleton');
    hideEl('transactions-table-wrapper');
    hideEl('transactions-empty');

    var res = await apiFetch('/api/transactions');
    if (res.ok) {
      transactions = res.data || [];
    } else {
      transactions = [];
    }

    hideEl('transactions-skeleton');

    if (transactions.length === 0) {
      showEl('transactions-empty');
    } else {
      showEl('transactions-table-wrapper');
      renderTransactions();
    }
  }

  function renderTransactions() {
    var tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    // Filter
    var filtered = transactions;
    if (currentFilter) {
      var fid = parseInt(currentFilter, 10);
      filtered = filtered.filter(function (t) { return t.category_id === fid; });
    }

    // Sort
    filtered = filtered.slice().sort(function (a, b) {
      switch (currentSort) {
        case 'date-asc': return a.date.localeCompare(b.date);
        case 'date-desc': return b.date.localeCompare(a.date);
        case 'amount-asc': return a.amount - b.amount;
        case 'amount-desc': return b.amount - a.amount;
        default: return b.date.localeCompare(a.date);
      }
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:32px">No transactions match your filters.</td></tr>';
      return;
    }

    var EDIT_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    var DELETE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';

    var html = '';
    filtered.forEach(function (t) {
      var catName = getCategoryName(t.category_id);
      var badgeClass = getBadgeClass(t.category_id);
      var amountClass = t.amount >= 0 ? 'amount-positive' : 'amount-negative';
      var desc = t.description ? sanitize(t.description) : '<span style="color:var(--text-tertiary)">&mdash;</span>';

      html += '<tr>' +
        '<td>' + sanitize(t.date) + '</td>' +
        '<td>' + desc + '</td>' +
        '<td><span class="badge ' + badgeClass + '">' + sanitize(catName) + '</span></td>' +
        '<td class="' + amountClass + '">' + formatAmountDisplay(t.amount) + '</td>' +
        '<td>' +
          '<button class="action-btn" title="Edit" data-action="edit" data-id="' + t.id + '">' + EDIT_ICON + '</button>' +
          '<button class="action-btn danger" title="Delete" data-action="delete" data-id="' + t.id + '">' + DELETE_ICON + '</button>' +
        '</td>' +
      '</tr>';
    });

    tbody.innerHTML = html;
  }

  // ── Summary ─────────────────────────────────────────────────
  function updateSummary() {
    var totalIncome = 0;
    var totalExpenses = 0;
    var categoryTotals = {};

    transactions.forEach(function (t) {
      if (t.amount >= 0) {
        totalIncome += t.amount;
      } else {
        totalExpenses += Math.abs(t.amount);
      }
      var catName = getCategoryName(t.category_id);
      categoryTotals[catName] = (categoryTotals[catName] || 0) + Math.abs(t.amount);
    });

    var netBalance = totalIncome - totalExpenses;

    setText('total-income', formatCurrency(totalIncome));
    setText('total-expenses', formatCurrency(totalExpenses));

    var balEl = document.getElementById('net-balance');
    if (balEl) {
      balEl.textContent = (netBalance >= 0 ? '+' : '-') + formatCurrency(Math.abs(netBalance));
      balEl.style.color = netBalance >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)';
    }

    // Top category
    var topCat = '--';
    var topTotal = 0;
    Object.keys(categoryTotals).forEach(function (cat) {
      if (categoryTotals[cat] > topTotal) {
        topTotal = categoryTotals[cat];
        topCat = cat;
      }
    });
    setText('top-category', topCat);
  }

  // ── Charts ──────────────────────────────────────────────────
  var CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#f43f5e', '#8b5cf6', '#ec4899', '#14b8a6'];

  async function updateCharts() {
    await updateCategoryChart();
    updateTrendChart();
  }

  async function updateCategoryChart() {
    var res = await apiFetch('/api/summary');
    var canvas = document.getElementById('category-chart');
    var emptyEl = document.getElementById('chart-empty');

    if (!canvas) return;

    var byCategory = (res.ok && res.data && res.data.by_category) ? res.data.by_category : [];

    if (byCategory.length === 0) {
      canvas.style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
      if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
      return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    var labels = byCategory.map(function (r) { return r.category; });
    var data = byCategory.map(function (r) { return r.total; });
    var colors = labels.map(function (_, i) { return CHART_COLORS[i % CHART_COLORS.length]; });

    if (categoryChart) categoryChart.destroy();

    categoryChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.label + ': ' + formatCurrency(ctx.raw);
              }
            }
          }
        }
      }
    });
  }

  function updateTrendChart() {
    var canvas = document.getElementById('trend-chart');
    var emptyEl = document.getElementById('trend-empty');
    if (!canvas) return;

    if (transactions.length === 0) {
      canvas.style.display = 'none';
      if (emptyEl) emptyEl.style.display = '';
      if (trendChart) { trendChart.destroy(); trendChart = null; }
      return;
    }

    canvas.style.display = '';
    if (emptyEl) emptyEl.style.display = 'none';

    // Group transactions by month (last 6 months)
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var now = new Date();
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        label: monthNames[d.getMonth()] + ' ' + d.getFullYear(),
        income: 0,
        expenses: 0
      });
    }

    transactions.forEach(function (t) {
      var parts = t.date.split('-');
      var key = parts[0] + '-' + parts[1];
      months.forEach(function (m) {
        if (m.key === key) {
          if (t.amount >= 0) m.income += t.amount;
          else m.expenses += Math.abs(t.amount);
        }
      });
    });

    var labels = months.map(function (m) { return m.label; });
    var incomeData = months.map(function (m) { return m.income; });
    var expenseData = months.map(function (m) { return m.expenses; });

    if (trendChart) trendChart.destroy();

    trendChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#10b981',
            borderRadius: 6,
            barPercentage: 0.6
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#f43f5e',
            borderRadius: 6,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#f1f3f5' },
            ticks: {
              font: { family: "'Inter', sans-serif", size: 12 },
              callback: function (val) { return '$' + val.toLocaleString(); }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Inter', sans-serif", size: 12 } }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              pointStyleWidth: 10,
              font: { family: "'Inter', sans-serif", size: 12 }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ': ' + formatCurrency(ctx.raw);
              }
            }
          }
        }
      }
    });
  }

  // ── Transaction Drawer ──────────────────────────────────────
  function openDrawer(mode, id) {
    var overlay = document.getElementById('drawer-overlay');
    var drawer = document.getElementById('transaction-drawer');
    var title = document.getElementById('drawer-title');
    var submitBtn = document.getElementById('drawer-submit-btn');
    var btnText = submitBtn ? submitBtn.querySelector('.btn-text') : null;
    var editIdField = document.getElementById('edit-transaction-id');

    clearDrawerErrors();

    if (overlay) overlay.style.display = '';
    if (drawer) {
      drawer.style.display = '';
      drawer.style.animation = 'slideInRight 0.3s ease forwards';
    }

    if (mode === 'edit' && id != null) {
      if (title) title.textContent = 'Edit Transaction';
      if (btnText) btnText.textContent = 'Save Changes';
      if (editIdField) editIdField.value = id;

      var txn = transactions.find(function (t) { return t.id === id; });
      if (txn) {
        var amountEl = document.getElementById('txn-amount');
        var descEl = document.getElementById('txn-description');
        var catEl = document.getElementById('txn-category');
        var dateEl = document.getElementById('txn-date');
        if (amountEl) amountEl.value = txn.amount;
        if (descEl) descEl.value = txn.description || '';
        if (catEl) catEl.value = txn.category_id || '';
        if (dateEl) dateEl.value = txn.date || '';
      }
    } else {
      if (title) title.textContent = 'Add Transaction';
      if (btnText) btnText.textContent = 'Add Transaction';
      if (editIdField) editIdField.value = '';

      var form = document.getElementById('transaction-form');
      if (form) form.reset();

      // Default date to today
      var dateEl = document.getElementById('txn-date');
      if (dateEl) {
        var today = new Date();
        dateEl.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      }
    }

    // Hide new category group
    var newCatGroup = document.getElementById('new-category-group');
    if (newCatGroup) newCatGroup.style.display = 'none';
  }

  function closeDrawer() {
    var overlay = document.getElementById('drawer-overlay');
    var drawer = document.getElementById('transaction-drawer');

    if (drawer) {
      drawer.style.animation = 'slideOutRight 0.25s ease forwards';
    }
    if (overlay) {
      overlay.style.animation = 'fadeOut 0.25s ease forwards';
    }

    setTimeout(function () {
      if (overlay) { overlay.style.display = 'none'; overlay.style.animation = ''; }
      if (drawer) { drawer.style.display = 'none'; drawer.style.animation = ''; }
    }, 260);

    clearDrawerErrors();
  }

  function clearDrawerErrors() {
    ['txn-amount-error', 'txn-description-error', 'txn-category-error', 'txn-new-category-error', 'txn-date-error'].forEach(function (id) {
      clearInputError(id);
    });
    ['txn-amount', 'txn-description', 'txn-category', 'txn-new-category', 'txn-date'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.remove('error');
    });
  }

  async function handleTransactionSubmit(e) {
    e.preventDefault();
    clearDrawerErrors();

    var amountStr = (document.getElementById('txn-amount').value || '').trim();
    var description = (document.getElementById('txn-description').value || '').trim();
    var categoryVal = document.getElementById('txn-category').value || '';
    var newCatName = (document.getElementById('txn-new-category').value || '').trim();
    var dateVal = (document.getElementById('txn-date').value || '').trim();
    var editId = document.getElementById('edit-transaction-id').value;

    // Validate
    var valid = true;

    // Amount validation
    if (!amountStr) {
      showInputError('txn-amount-error', 'Amount is required.');
      document.getElementById('txn-amount').classList.add('error');
      valid = false;
    } else {
      var amount = parseFloat(amountStr);
      if (isNaN(amount) || !isFinite(amount)) {
        showInputError('txn-amount-error', 'Please enter a valid number.');
        document.getElementById('txn-amount').classList.add('error');
        valid = false;
      } else if (!/^-?\d+(\.\d{1,2})?$/.test(amountStr)) {
        showInputError('txn-amount-error', 'Maximum 2 decimal places allowed.');
        document.getElementById('txn-amount').classList.add('error');
        valid = false;
      } else if (Math.abs(amount) > 999999999) {
        showInputError('txn-amount-error', 'Amount is too large.');
        document.getElementById('txn-amount').classList.add('error');
        valid = false;
      }
    }

    // Description validation
    if (description.length > 255) {
      showInputError('txn-description-error', 'Description must be under 255 characters.');
      document.getElementById('txn-description').classList.add('error');
      valid = false;
    }

    // Category validation
    if (!categoryVal) {
      showInputError('txn-category-error', 'Please select a category.');
      document.getElementById('txn-category').classList.add('error');
      valid = false;
    } else if (categoryVal === '__new__' && !newCatName) {
      showInputError('txn-new-category-error', 'Category name is required.');
      document.getElementById('txn-new-category').classList.add('error');
      valid = false;
    } else if (categoryVal === '__new__' && newCatName.length > 50) {
      showInputError('txn-new-category-error', 'Category name must be under 50 characters.');
      document.getElementById('txn-new-category').classList.add('error');
      valid = false;
    }

    // Date validation
    if (!dateVal) {
      showInputError('txn-date-error', 'Date is required.');
      document.getElementById('txn-date').classList.add('error');
      valid = false;
    } else if (isNaN(new Date(dateVal).getTime())) {
      showInputError('txn-date-error', 'Please enter a valid date.');
      document.getElementById('txn-date').classList.add('error');
      valid = false;
    }

    if (!valid) return;

    var btn = document.getElementById('drawer-submit-btn');
    setButtonLoading(btn, true);

    try {
      var categoryId;

      // Create new category if needed
      if (categoryVal === '__new__') {
        var catRes = await apiFetch('/api/categories', {
          method: 'POST',
          body: JSON.stringify({ name: newCatName })
        });
        if (!catRes.ok) {
          showToast(catRes.error, 'error');
          return;
        }
        categoryId = catRes.data.id;
        await loadCategories();
      } else {
        categoryId = parseInt(categoryVal, 10);
      }

      var payload = {
        amount: parseFloat(amountStr),
        description: description || undefined,
        category_id: categoryId,
        date: dateVal
      };

      var res;
      if (editId) {
        res = await apiFetch('/api/transactions/' + editId, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast('Transaction updated successfully.', 'success');
        }
      } else {
        res = await apiFetch('/api/transactions', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast('Transaction added successfully.', 'success');
        }
      }

      if (res.ok) {
        closeDrawer();
        await loadTransactions();
        updateSummary();
        updateCharts();
      } else {
        showToast(res.error, 'error');
      }
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    if (!deleteTargetId) return;
    var btn = document.getElementById('delete-confirm-btn');
    setButtonLoading(btn, true);

    try {
      var res = await apiFetch('/api/transactions/' + deleteTargetId, { method: 'DELETE' });
      if (res.ok) {
        showToast('Transaction deleted.', 'success');
        hideEl('delete-modal');
        deleteTargetId = null;
        await loadTransactions();
        updateSummary();
        updateCharts();
      } else {
        showToast(res.error, 'error');
      }
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ── Helper Utilities ────────────────────────────────────────
  function bindClick(id, handler) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', handler);
  }

  function showEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = '';
  }

  function hideEl(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showElWithText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
      el.style.display = '';
    }
  }

  function showInputError(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  function clearInputError(id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '';
  }

  function setButtonLoading(btn, loading) {
    if (!btn) return;
    var textEl = btn.querySelector('.btn-text');
    var spinnerEl = btn.querySelector('.btn-spinner');
    if (loading) {
      btn.disabled = true;
      if (textEl) textEl.style.display = 'none';
      if (spinnerEl) spinnerEl.style.display = '';
    } else {
      btn.disabled = false;
      if (textEl) textEl.style.display = '';
      if (spinnerEl) spinnerEl.style.display = 'none';
    }
  }

  // ── Bootstrap ───────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    initLanding();
    initAuth();

    // Initial route
    if (getToken()) {
      navigate('dashboard');
    } else {
      handleRoute();
    }
  });

})();