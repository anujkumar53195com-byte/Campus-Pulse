(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const safeText = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  const seedReports = [
    { id: 'CF-2481', title: 'Lights not working in corridor', category: 'Electrical', location: 'Academic Block · 2nd floor', description: 'The lights near room 204 have been out since yesterday evening.', status: 'In Progress', reporter: 'Riya Kumar', email: 'riya@nitap.ac.in', created: Date.now() - 42 * 60000 },
    { id: 'CF-2480', title: 'Water cooler needs attention', category: 'Water & Plumbing', location: 'Hostel A · Ground floor', description: 'The water cooler outside the common room is leaking.', status: 'Pending', reporter: 'Priya Mehta', email: 'priya@nitap.ac.in', created: Date.now() - 2 * 3600000 },
    { id: 'CF-2479', title: 'Wi-Fi keeps disconnecting', category: 'Wi-Fi & Internet', location: 'Central Library · Reading hall', description: 'The campus Wi-Fi drops every few minutes in the main reading hall.', status: 'Pending', reporter: 'Prashant Kumar', email: 'student@nitap.ac.in', created: Date.now() - 5 * 3600000 },
    { id: 'CF-2478', title: 'Projector not connecting', category: 'Classroom', location: 'Academic Block · Room 105', description: 'The projector displays a blank screen after reconnecting the HDMI cable.', status: 'Resolved', reporter: 'Nikhil Taba', email: 'nikhil@nitap.ac.in', created: Date.now() - 19 * 3600000 },
    { id: 'CF-2477', title: 'Common room door latch broken', category: 'Hostel', location: 'Hostel B · Common room', description: 'The latch on the common room door is loose and no longer closes properly.', status: 'In Progress', reporter: 'Prashant Kumar', email: 'student@nitap.ac.in', created: Date.now() - 29 * 3600000 },
    { id: 'CF-2476', title: 'Overflowing bins near canteen', category: 'Cleanliness', location: 'Student Activity Centre · Canteen', description: 'The waste bins near the canteen entrance have been full since lunch.', status: 'Resolved', reporter: 'Tashi Doma', email: 'tashi@nitap.ac.in', created: Date.now() - 47 * 3600000 }
  ];

  let memoryReports = null;
  let memoryAccounts = [];
  let role = 'student';
  let loginRole = 'student';
  let authMode = 'login';
  let activeUser = null;
  let pendingReport = null;
  let view = 'overview';
  let toastTimer;

  function readReports() {
    try {
      const saved = localStorage.getItem('campusfix-showcase-reports');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      if (Array.isArray(memoryReports)) return memoryReports;
    }
    memoryReports = seedReports.map((report) => ({ ...report }));
    saveReports(memoryReports);
    return memoryReports;
  }

  function saveReports(reports) {
    memoryReports = reports;
    try { localStorage.setItem('campusfix-showcase-reports', JSON.stringify(reports)); } catch { /* Keep this demo usable without browser storage. */ }
  }

  function readAccounts() {
    try {
      const saved = localStorage.getItem('campusfix-showcase-accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) { memoryAccounts = parsed; return parsed; }
      }
    } catch { /* Use the in-memory account list if browser storage is blocked. */ }
    return memoryAccounts;
  }

  function saveAccounts(accounts) {
    memoryAccounts = accounts;
    try { localStorage.setItem('campusfix-showcase-accounts', JSON.stringify(accounts)); } catch { /* Keep accounts available for this page session. */ }
  }

  function demoAccounts() {
    return [
      { name: 'Prashant Kumar', email: 'student@nitap.ac.in', password: 'student123', role: 'student' },
      { name: 'Campus Administrator', email: 'admin@nitap.ac.in', password: 'admin123', role: 'admin' }
    ];
  }

  function statusClass(status) {
    if (status === 'Resolved') return 'resolved';
    if (status === 'In Progress') return 'in-progress';
    return 'pending';
  }

  function countLabel(count, word) { return `${count} ${word}${count === 1 ? '' : 's'}`; }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }

  function configureNav() {
    const items = role === 'student'
      ? [['overview', 'Overview', '⌂'], ['my-reports', 'My reports', '▤'], ['campus', 'Campus reports', '◎']]
      : [['admin', 'Operations', '◈'], ['queue', 'Complaint queue', '▤']];
    $('#main-nav').innerHTML = items.map(([key, label, icon]) => `<button type="button" class="nav-link ${view === key ? 'active' : ''}" data-view="${key}"><span>${icon}</span>${label}${key === 'queue' ? `<b>${readReports().length}</b>` : ''}</button>`).join('');
    document.querySelectorAll('.role-button').forEach((button) => button.classList.toggle('active', button.dataset.role === role));
    $('#current-role').textContent = role === 'student' ? 'Student view' : 'Administrator view';
  }

  function visibleReports(allReports) {
    if (role === 'admin' || view === 'campus' || view === 'queue') return allReports;
    return allReports.filter((report) => report.email === (activeUser?.email || 'student@nitap.ac.in'));
  }

  function renderStats(reports) {
    const pending = reports.filter((report) => report.status === 'Pending').length;
    const progress = reports.filter((report) => report.status === 'In Progress').length;
    const resolved = reports.filter((report) => report.status === 'Resolved').length;
    const stats = [['Total reports', reports.length, 'Campus issues tracked'], ['Awaiting action', pending, 'Need a first response'], ['In progress', progress, 'Being looked into'], ['Resolved', resolved, 'Issues fixed']];
    $('#stats').innerHTML = stats.map(([label, number, note], index) => `<article class="stat-card"><span class="stat-icon stat-icon-${index}">${['↗', '◷', '↻', '✓'][index]}</span><div class="stat-label">${label}</div><div class="stat-number">${number}</div><div class="stat-note">${note}</div></article>`).join('');
  }

  function tokens(value) {
    const ignored = new Set(['a', 'an', 'the', 'is', 'are', 'in', 'on', 'at', 'near', 'to', 'of', 'for', 'and', 'not', 'my']);
    return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/).filter((word) => word && !ignored.has(word)).map((word) => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word);
  }

  function similarity(left, right) {
    const a = new Set(tokens(left));
    const b = new Set(tokens(right));
    if (!a.size || !b.size) return 0;
    const shared = [...a].filter((word) => b.has(word)).length;
    return shared / new Set([...a, ...b]).size;
  }

  function findDuplicate(candidate) {
    return readReports().find((report) => report.category.toLowerCase() === candidate.category.toLowerCase()
      && similarity(report.location, candidate.location) >= 0.6
      && similarity(report.title, candidate.title) >= 0.4
      && report.status !== 'Resolved');
  }

  function supportersFor(report) {
    return Array.isArray(report.supporters) ? report.supporters : [report.email].filter(Boolean);
  }

  function supportCount(report) {
    return Math.max(Number(report.supportCount) || 1, supportersFor(report).length);
  }

  function supportReport(id) {
    if (!activeUser?.email) return false;
    const reports = readReports();
    const report = reports.find((item) => item.id === id);
    if (!report) return false;
    const supporters = supportersFor(report);
    if (supporters.includes(activeUser.email)) {
      showToast('You already support this report.');
      return false;
    }
    report.supporters = [...supporters, activeUser.email];
    report.supportCount = report.supporters.length;
    saveReports(reports);
    return true;
  }

  function submitNewReport(report) {
    saveReports([report, ...readReports()]);
    $('#report-form').reset();
    $('#duplicate-suggestion').classList.add('hidden');
    $('#report-form-card').classList.add('hidden');
    pendingReport = null;
    view = 'my-reports';
    render();
    showToast(`Report ${report.id} submitted.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showDuplicateSuggestion(report, duplicate) {
    pendingReport = report;
    const count = supportCount(duplicate);
    $('#duplicate-suggestion').innerHTML = `<strong>Similar report found</strong><p>“${safeText(duplicate.title)}” at ${safeText(duplicate.location)} is already reported. Add your support so the team can see how many students are affected.</p><div class="duplicate-actions"><button class="button button-primary" type="button" data-duplicate-vote="${safeText(duplicate.id)}">Upvote existing report · ${count} support${count === 1 ? '' : 's'}</button><button class="button duplicate-separate" type="button" data-submit-separately>Submit separately</button></div>`;
    $('#duplicate-suggestion').classList.remove('hidden');
  }

  function renderList(reports) {
    const search = $('#search-input').value.trim().toLowerCase();
    const status = $('#status-filter').value;
    const filtered = reports.filter((report) => (status === 'All' || report.status === status) && (!search || [report.id, report.title, report.category, report.location, report.reporter].some((value) => String(value).toLowerCase().includes(search))));
    $('#report-list').innerHTML = filtered.map((report) => {
      const supporters = supportersFor(report);
      const votes = supportCount(report);
      const support = votes > 1 ? `<div class="report-support"><span><strong>${votes}</strong> students affected</span>${role === 'student' ? `<button type="button" class="upvote-button" data-vote-id="${safeText(report.id)}" ${supporters.includes(activeUser?.email) ? 'disabled' : ''}>${supporters.includes(activeUser?.email) ? 'Supported' : '↑ Upvote'}</button>` : ''}</div>` : '';
      return `<article class="report-card"><div class="report-symbol">${safeText(report.category.slice(0, 1))}</div><div class="report-main"><div class="report-title-row"><h3>${safeText(report.title)}</h3><span class="category-tag">${safeText(report.category)}</span></div><p>${safeText(report.description)}</p><div class="report-meta"><span>⌖ ${safeText(report.location)}</span><span>${safeText(report.id)}</span><span>Reported by ${safeText(report.reporter)}</span></div>${support}</div><div class="report-side">${role === 'admin' ? `<label class="status-control"><span>Status</span><select data-status-id="${safeText(report.id)}"><option ${report.status === 'Pending' ? 'selected' : ''}>Pending</option><option ${report.status === 'In Progress' ? 'selected' : ''}>In Progress</option><option ${report.status === 'Resolved' ? 'selected' : ''}>Resolved</option></select></label>` : `<span class="status-badge ${statusClass(report.status)}">${safeText(report.status)}</span>`}<time>${new Date(report.created).toLocaleDateString()}</time></div></article>`;
    }).join('');
    $('#empty-state').classList.toggle('hidden', filtered.length > 0);
    $('#report-list').classList.toggle('hidden', filtered.length === 0);
    $('#empty-report').classList.toggle('hidden', role !== 'student');
  }

  function render() {
    const allReports = readReports();
    const reports = visibleReports(allReports);
    configureNav();
    renderStats(role === 'admin' || view === 'campus' ? allReports : reports);
    const studentOverview = role === 'student' && view === 'overview';
    $('#welcome-card').classList.toggle('hidden', !studentOverview);
    $('#new-report').classList.toggle('hidden', role !== 'student');
    $('#list-section').classList.toggle('hidden', studentOverview);
    $('#report-form-card').classList.add('hidden');
    $('#search-input').value = '';
    $('#status-filter').value = 'All';

    const copy = {
      overview: ['YOUR CAMPUS, YOUR VOICE', 'Welcome to CampusFix', 'Report an issue and follow its progress from one place.', 'YOUR REPORTS', 'Your reports', 'Updates on issues you have reported.'],
      'my-reports': ['STUDENT WORKSPACE', 'My reports', 'Track updates on the issues you have reported.', 'YOUR REPORTS', 'Your reports', 'Updates on issues you have reported.'],
      campus: ['CAMPUS COMMUNITY', 'Campus reports', 'See issues reported around campus.', 'CAMPUS ACTIVITY', 'Campus reports', 'Reports shared by students across campus.'],
      admin: ['CAMPUS OPERATIONS', 'Operations dashboard', 'A clear view of issues that need attention.', 'ADMIN OVERVIEW', 'All campus reports', 'Review reports and update their status.'],
      queue: ['CAMPUS OPERATIONS', 'Complaint queue', 'Review incoming reports and keep students updated.', 'REPORT MANAGEMENT', 'All campus reports', 'Change a report status with the menu on each card.']
    }[view];
    $('#page-eyebrow').textContent = copy[0];
    $('#page-title').textContent = copy[1];
    $('#page-subtitle').textContent = copy[2];
    $('#list-eyebrow').textContent = copy[3];
    $('#list-title').textContent = copy[4];
    $('#list-description').textContent = copy[5];
    renderList(reports);
  }

  function setRole(nextRole) {
    role = nextRole;
    view = role === 'student' ? 'overview' : 'admin';
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function selectLoginRole(nextRole) {
    loginRole = nextRole;
    const admin = nextRole === 'admin';
    if (authMode === 'login') {
      $('#auth-email').value = admin ? 'admin@nitap.ac.in' : 'student@nitap.ac.in';
      $('#auth-password').value = admin ? 'admin123' : 'student123';
      $('#demo-email').textContent = $('#auth-email').value;
      $('#demo-password').textContent = `Password: ${$('#auth-password').value}`;
    } else {
      $('#auth-email').value = '';
      $('#auth-password').value = '';
    }
    $('#auth-error').classList.add('hidden');
    document.querySelectorAll('.auth-role').forEach((button) => button.classList.toggle('active', button.dataset.authRole === nextRole));
  }

  function setAuthMode(nextMode) {
    authMode = nextMode;
    const signingUp = nextMode === 'signup';
    $('#auth-name-wrap').classList.toggle('hidden', !signingUp);
    $('#auth-confirm-wrap').classList.toggle('hidden', !signingUp);
    $('#auth-name').required = signingUp;
    $('#auth-confirm').required = signingUp;
    $('#auth-password').autocomplete = signingUp ? 'new-password' : 'current-password';
    $('#demo-login').classList.toggle('hidden', signingUp);
    $('#login-title').textContent = signingUp ? 'Create your account' : 'Welcome back';
    $('#login-intro').textContent = signingUp ? 'Create a campus account to report issues or manage reports.' : 'Sign in to report campus issues or manage the complaint queue.';
    $('#auth-submit').innerHTML = signingUp ? 'Create account <span>→</span>' : 'Sign in <span>→</span>';
    $('#auth-error').classList.add('hidden');
    document.querySelectorAll('.auth-mode-button').forEach((button) => button.classList.toggle('active', button.dataset.authMode === nextMode));
    if (signingUp) {
      $('#auth-name').value = '';
      $('#auth-confirm').value = '';
      $('#auth-email').value = '';
      $('#auth-password').value = '';
    } else selectLoginRole(loginRole);
  }

  function openWorkspace(nextRole, account) {
    activeUser = account;
    $('#login-screen').classList.add('hidden');
    $('#app-shell').classList.remove('hidden');
    setRole(nextRole);
  }

  document.querySelectorAll('.auth-mode-button').forEach((button) => button.addEventListener('click', () => setAuthMode(button.dataset.authMode)));
  document.querySelectorAll('.auth-role').forEach((button) => button.addEventListener('click', () => selectLoginRole(button.dataset.authRole)));
  $('#auth-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const email = $('#auth-email').value.trim().toLowerCase();
    const password = $('#auth-password').value;
    if (authMode === 'signup') {
      const name = $('#auth-name').value.trim();
      const confirm = $('#auth-confirm').value;
      const existing = [...demoAccounts(), ...readAccounts()].some((account) => account.email.toLowerCase() === email);
      let message = '';
      if (!name) message = 'Enter your name to create an account.';
      else if (!email.endsWith('@nitap.ac.in')) message = 'Use your @nitap.ac.in campus email.';
      else if (existing) message = 'An account with this email already exists. Please sign in.';
      else if (password.length < 6) message = 'Your password must be at least 6 characters.';
      else if (password !== confirm) message = 'The passwords do not match.';
      if (message) {
        $('#auth-error').textContent = message;
        $('#auth-error').classList.remove('hidden');
        return;
      }
      const account = { name, email, password, role: loginRole };
      saveAccounts([...readAccounts(), account]);
      openWorkspace(loginRole, account);
      showToast('Account created successfully.');
      return;
    }

    const account = [...demoAccounts(), ...readAccounts()].find((item) => item.email.toLowerCase() === email && item.password === password);
    if (!account || account.role !== loginRole) {
      $('#auth-error').textContent = account ? `This account is registered as ${account.role === 'admin' ? 'Administrator' : 'Student'}. Choose that account type.` : 'Email or password is incorrect.';
      $('#auth-error').classList.remove('hidden');
      return;
    }
    openWorkspace(account.role, account);
  });
  $('#signout').addEventListener('click', () => {
    $('#app-shell').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    setAuthMode('login');
    selectLoginRole(role);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#current-role').addEventListener('click', () => {
    $('#app-shell').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    setAuthMode('login');
    selectLoginRole(role === 'student' ? 'admin' : 'student');
  });

  function openReportForm() {
    if (role !== 'student') return;
    pendingReport = null;
    $('#duplicate-suggestion').classList.add('hidden');
    $('#report-form-card').classList.remove('hidden');
    $('#report-form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    $('#issue-title').focus({ preventScroll: true });
  }

  document.querySelectorAll('.role-button').forEach((button) => button.addEventListener('click', () => {
    $('#app-shell').classList.add('hidden');
    $('#login-screen').classList.remove('hidden');
    setAuthMode('login');
    selectLoginRole(button.dataset.role);
  }));
  $('#main-nav').addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    view = button.dataset.view;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  ['#new-report', '#welcome-report', '#empty-report'].forEach((selector) => $(selector).addEventListener('click', openReportForm));
  $('#close-form').addEventListener('click', () => {
    pendingReport = null;
    $('#duplicate-suggestion').classList.add('hidden');
    $('#report-form-card').classList.add('hidden');
  });
  $('#search-input').addEventListener('input', () => renderList(visibleReports(readReports())));
  $('#status-filter').addEventListener('change', () => renderList(visibleReports(readReports())));
  $('#report-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (role !== 'student') return;
    const report = {
      id: `CF-${Math.max(2481, ...readReports().map((row) => Number(row.id.replace('CF-', '')) || 0)) + 1}`,
      title: $('#issue-title').value.trim(), category: $('#issue-category').value,
      location: $('#issue-location').value.trim(), description: $('#issue-description').value.trim(),
      status: 'Pending', reporter: activeUser?.name || 'Prashant Kumar', email: activeUser?.email || 'student@nitap.ac.in', created: Date.now(),
      supportCount: 1, supporters: [activeUser?.email || 'student@nitap.ac.in']
    };
    if (!report.title || !report.category || !report.location || !report.description) return;
    const duplicate = findDuplicate(report);
    if (duplicate) {
      showDuplicateSuggestion(report, duplicate);
      return;
    }
    submitNewReport(report);
  });
  $('#report-list').addEventListener('change', (event) => {
    const id = event.target.dataset.statusId;
    if (!id || role !== 'admin') return;
    const reports = readReports();
    const report = reports.find((row) => row.id === id);
    if (!report) return;
    report.status = event.target.value;
    saveReports(reports);
    render();
    showToast(`${id} status updated.`);
  });
  $('#report-list').addEventListener('click', (event) => {
    const button = event.target.closest('[data-vote-id]');
    if (!button || !supportReport(button.dataset.voteId)) return;
    renderList(visibleReports(readReports()));
    showToast('Your upvote was added.');
  });
  $('#duplicate-suggestion').addEventListener('click', (event) => {
    const vote = event.target.closest('[data-duplicate-vote]');
    if (vote) {
      if (!supportReport(vote.dataset.duplicateVote)) return;
      $('#report-form').reset();
      $('#duplicate-suggestion').classList.add('hidden');
      $('#report-form-card').classList.add('hidden');
      pendingReport = null;
      view = 'campus';
      render();
      showToast('Your upvote was added to the existing report.');
      return;
    }
    if (event.target.closest('[data-submit-separately]') && pendingReport) submitNewReport(pendingReport);
  });

  selectLoginRole('student');
  render();
})();
