import { convex, api } from "./convex-client.js";

// Store token and user info
let authToken = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user'));

// ==================== AUTH FUNCTIONS ====================

function isAuthenticated() {
    return authToken && currentUser;
}

function getToken() {
    return authToken;
}

async function login(email, password) {
    try {
        const result = await convex.action(api.auth.login, { email, password });

        if (result.success) {
            authToken = result.token;
            currentUser = result.user;
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            return { success: true, user: result.user };
        } else {
            return { success: false, message: result.message };
        }
    } catch (error) {
        return { success: false, message: 'Network error. Please try again.' };
    }
}

async function register(name, email, password, role) {
    try {
        const result = await convex.action(api.auth.register, { name, email, password, role });

        if (result.success) {
            return { success: true, message: result.status === 'teacher' ? 'Registration pending admin approval' : 'Registration successful' };
        } else {
            return { success: false, message: result.message };
        }
    } catch (error) {
        return { success: false, message: 'Network error. Please try again.' };
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    window.location.href = '/login';
}

// ==================== API CALLS (CONVEX) ====================

async function getPendingTeachers() {
    try {
        const data = await convex.query(api.users.getPendingTeachers);
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function approveTeacher(id) {
    try {
        await convex.mutation(api.users.updateStatus, { id, status: 'active' });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

async function rejectTeacher(id) {
    try {
        await convex.mutation(api.users.deleteUser, { id });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getAllUsers() {
    try {
        const data = await convex.query(api.users.getAllUsers);
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getAdminStats() {
    try {
        const data = await convex.query(api.exams.getStats);
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getQuestions() {
    try {
        const data = await convex.query(api.questions.getQuestions, {
            teacherId: currentUser.role === 'teacher' ? currentUser.id : undefined,
            isAdmin: currentUser.role === 'admin'
        });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function addQuestion(question) {
    try {
        // question contains: subject, question_text, question_type, options, correct_answer, marks
        const data = await convex.mutation(api.questions.addQuestion, {
            teacherId: currentUser.id,
            subject: question.subject,
            questionText: question.question_text,
            questionType: question.question_type,
            options: question.options,
            correctAnswer: question.correct_answer,
            marks: parseInt(question.marks)
        });
        return { success: true, id: data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function deleteQuestion(id) {
    try {
        await convex.mutation(api.questions.deleteQuestion, { id });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getExams() {
    try {
        const data = await convex.query(api.exams.getExams, {
            createdBy: currentUser.role === 'teacher' ? currentUser.id : undefined,
            isAdmin: currentUser.role === 'admin'
        });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function createExam(exam) {
    try {
        const data = await convex.mutation(api.exams.createExam, {
            title: exam.title,
            description: exam.description,
            subject: exam.subject,
            duration: parseInt(exam.duration),
            totalMarks: parseInt(exam.total_marks),
            passingMarks: parseInt(exam.passing_marks),
            scheduledDate: exam.scheduled_date,
            endDate: exam.end_date,
            createdBy: currentUser.id,
            questionIds: exam.question_ids
        });
        return { success: true, id: data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function deleteExam(id) {
    try {
        await convex.mutation(api.exams.deleteExam, { id });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getExamSubmissions(examId) {
    try {
        const data = await convex.query(api.submissions.getSubmissionsByExam, { examId });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getProctoringLogs(examId) {
    try {
        const data = await convex.query(api.proctoring.getLogsByExam, { examId });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getAvailableExams() {
    try {
        const data = await convex.query(api.exams.getExams, {});
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getExamDetails(examId) {
    try {
        const data = await convex.query(api.exams.getExamDetails, { id: examId });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function submitExam(examId, answers) {
    try {
        const data = await convex.mutation(api.submissions.submitExam, {
            examId,
            studentId: currentUser.id,
            answers
        });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function getResults() {
    try {
        const data = await convex.query(api.submissions.getResults, {
            studentId: currentUser.role === 'student' ? currentUser.id : undefined,
            isAdmin: currentUser.role === 'admin'
        });
        return { success: true, data };
    } catch (e) { return { success: false, message: e.message }; }
}

async function updateProfile(data) {
    try {
        await convex.mutation(api.users.updateProfile, {
            id: currentUser.id,
            name: data.name,
            email: data.email
        });
        currentUser.name = data.name;
        currentUser.email = data.email;
        localStorage.setItem('user', JSON.stringify(currentUser));
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

async function logProctoringEvent(examId, eventType, eventData) {
    try {
        await convex.mutation(api.proctoring.logEvent, {
            studentId: currentUser.id,
            examId,
            eventType,
            eventData: typeof eventData === 'string' ? eventData : JSON.stringify(eventData)
        });
        return { success: true };
    } catch (e) { return { success: false, message: e.message }; }
}

// ==================== UI FUNCTIONS ====================
// (Keep original UI functions from main.js)

function showToast(message, type = 'info') {
    const container = document.querySelector('.toast-container') || createToastContainer();
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type]}</span>
        <span class="toast-message">${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function showLoading(element) {
    element.innerHTML = '<div class="loading-spinner"></div>';
    element.style.display = 'flex';
    element.style.justifyContent = 'center';
    element.style.alignItems = 'center';
    element.style.minHeight = '200px';
}

function hideLoading(element) {
    element.style.display = '';
}

function formatDate(dateString) { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
function formatDateTime(dateString) { return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }

function initPasswordToggles() {
    document.querySelectorAll('.password-toggle').forEach(button => {
        button.addEventListener('click', () => {
            const input = button.parentElement.querySelector('input');
            const type = input.type === 'password' ? 'text' : 'password';
            input.type = type;
            button.innerHTML = type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        });
    });
}

function redirectByRole() {
    if (!currentUser) { window.location.href = '/login'; return; }
    switch (currentUser.role) {
        case 'admin': window.location.href = '/admin-dashboard'; break;
        case 'teacher': window.location.href = '/teacher-dashboard'; break;
        case 'student': window.location.href = '/student-dashboard'; break;
        default: window.location.href = '/login';
    }
}

function checkRole(...allowedRoles) {
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
        window.location.href = '/login';
        return false;
    }
    return true;
}

function renderStatsCards(stats) {
    return `
        <div class="stat-card primary">
            <div class="stat-icon">👨‍🎓</div>
            <div class="stat-value">${stats.students || 0}</div>
            <div class="stat-label">Total Students</div>
        </div>
        <div class="stat-card secondary">
            <div class="stat-icon">👨‍🏫</div>
            <div class="stat-value">${stats.teachers || 0}</div>
            <div class="stat-label">Total Teachers</div>
        </div>
        <div class="stat-card accent">
            <div class="stat-icon">📝</div>
            <div class="stat-value">${stats.exams || 0}</div>
            <div class="stat-label">Total Exams</div>
        </div>
        <div class="stat-card success">
            <div class="stat-icon">✅</div>
            <div class="stat-value">${stats.submissions || 0}</div>
            <div class="stat-label">Total Submissions</div>
        </div>
    `;
}

function renderExamCard(exam) {
    const eid = exam._id;
    return `
        <div class="exam-card">
            <div class="exam-card-header">
                <h3 class="exam-card-title">${exam.title}</h3>
                <span class="exam-card-subject">${exam.subject}</span>
            </div>
            <div class="exam-card-body">
                <div class="exam-info">
                    <div class="exam-info-item"><i>⏱</i><span>Duration: ${exam.duration} minutes</span></div>
                    <div class="exam-info-item"><i>📊</i><span>Total Marks: ${exam.totalMarks || 'N/A'}</span></div>
                    <div class="exam-info-item"><i>📅</i><span>Starts: ${exam.scheduledDate ? formatDate(exam.scheduledDate) : 'Not scheduled'}</span></div>
                    ${exam.endDate ? `<div class="exam-info-item"><i class="fas fa-hourglass-end"></i><span>Ends: ${formatDate(exam.endDate)}</span></div>` : ''}
                </div>
                <span class="badge badge-${exam.status === 'active' ? 'success' : 'warning'}">${exam.status}</span>
            </div>
            <div class="exam-card-footer" style="display: flex; gap: 0.5rem; justify-content: space-between; align-items: center;">
                ${currentUser.role === 'student'
            ? `<button class="btn btn-primary" style="flex:1;" onclick="startExam('${eid}')">Start Exam</button>`
            : `<button class="btn btn-outline" style="flex:1;" onclick="viewExam('${eid}')">View Details</button>
               <button class="btn btn-outline" style="color: #f85149; border-color: #f85149;" onclick="removeExam('${eid}')"><i class="fas fa-trash"></i></button>`
        }
            </div>
        </div>
    `;
}

function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) { navbar.classList.add('scrolled'); }
        else { navbar.classList.remove('scrolled'); }
    });
}

function renderNavbar() {
    const navbarMenu = document.querySelector('.navbar-menu');
    if (!navbarMenu) return;
    if (isAuthenticated()) {
        navbarMenu.innerHTML = `
            <a href="${getDashboardUrl()}" class="navbar-link">Dashboard</a>
            <a href="/exams" class="navbar-link">Exams</a>
            <a href="/results" class="navbar-link">Results</a>
            <a href="/profile" class="navbar-link">Profile</a>
        `;
    } else {
        navbarMenu.innerHTML = `
            <a href="/" class="navbar-link">Home</a>
            <a href="/#features" class="navbar-link">Features</a>
            <a href="/login" class="navbar-link">Login</a>
        `;
    }
}

function getDashboardUrl() {
    if (!currentUser) return '/login';
    switch (currentUser.role) {
        case 'admin': return '/admin-dashboard';
        case 'teacher': return '/teacher-dashboard';
        case 'student': return '/student-dashboard';
        default: return '/login';
    }
}

function showModal(modalId) { document.getElementById(modalId)?.classList.add('active'); }
function hideModal(modalId) { document.getElementById(modalId)?.classList.remove('active'); }

function initModals() {
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', () => { button.closest('.modal-overlay').classList.remove('active'); });
    });
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('active'); });
    });
}

function initSidebar() {
    const toggleBtn = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (toggleBtn && sidebar) { toggleBtn.addEventListener('click', () => { sidebar.classList.toggle('active'); }); }
}

function setActiveSidebarLink() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const href = link.getAttribute('href');
        if (href && (currentPath.includes(href.replace('/', '')) || (currentPath === '/' && href === '/index.html'))) {
            link.classList.add('active');
        }
    });
}

function renderSidebar() {
    const sidebarMenu = document.querySelector('.sidebar-menu');
    const userInfo = document.querySelector('.user-info');
    if (!sidebarMenu || !currentUser) return;

    let menuHTML = '';
    if (currentUser.role === 'admin') {
        menuHTML = `
            <div class="sidebar-section">
                <div class="sidebar-section-title">Main</div>
                <a href="/admin-dashboard" class="sidebar-link"><i>📊</i> Dashboard</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">User Management</div>
                <a href="/admin-dashboard?tab=teachers" class="sidebar-link"><i>👨‍🏫</i> Teacher Requests</a>
                <a href="/admin-dashboard?tab=users" class="sidebar-link"><i>👥</i> All Users</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Exam Management</div>
                <a href="/question-bank" class="sidebar-link"><i>📚</i> Question Bank</a>
                <a href="/create-exam" class="sidebar-link"><i>➕</i> Create Exam</a>
                <a href="/exams" class="sidebar-link"><i>📝</i> All Exams</a>
                <a href="/results" class="sidebar-link"><i>📊</i> Results</a>
            </div>
        `;
    } else if (currentUser.role === 'teacher') {
        menuHTML = `
            <div class="sidebar-section">
                <div class="sidebar-section-title">Main</div>
                <a href="/teacher-dashboard" class="sidebar-link"><i>📊</i> Dashboard</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Exam Management</div>
                <a href="/question-bank" class="sidebar-link"><i>📚</i> Question Bank</a>
                <a href="/create-exam" class="sidebar-link"><i>➕</i> Create Exam</a>
                <a href="/exams" class="sidebar-link"><i>📝</i> My Exams</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Monitoring</div>
                <a href="/monitoring" class="sidebar-link"><i>📹</i> Proctoring</a>
                <a href="/results" class="sidebar-link"><i>📊</i> Results</a>
            </div>
        `;
    } else if (currentUser.role === 'student') {
        menuHTML = `
            <div class="sidebar-section">
                <div class="sidebar-section-title">Main</div>
                <a href="/student-dashboard" class="sidebar-link"><i>📊</i> Dashboard</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Exams</div>
                <a href="/exams" class="sidebar-link"><i>📝</i> Available Exams</a>
                <a href="/results" class="sidebar-link"><i>📊</i> My Results</a>
            </div>
            <div class="sidebar-section">
                <div class="sidebar-section-title">Account</div>
                <a href="/profile" class="sidebar-link"><i>👤</i> Profile</a>
            </div>
        `;
    }
    sidebarMenu.innerHTML = menuHTML;
    if (userInfo) {
        const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        userInfo.innerHTML = `
            <div class="user-avatar">${initials}</div>
            <div class="user-details">
                <div class="user-name">${currentUser.name}</div>
                <div class="user-role">${currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1)}</div>
            </div>
            <button class="btn btn-sm btn-outline" onclick="logout()" title="Logout">🚪</button>
        `;
    }
    setActiveSidebarLink();
}

document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggles();
    initModals();
    initNavbar();
    renderNavbar();

    const requiresAuth = document.body.classList.contains('requires-auth');
    if (requiresAuth && !isAuthenticated()) { window.location.href = '/login'; }
});

// Export functions for use in other scripts
window.login = login;
window.register = register;
window.logout = logout;
window.showToast = showToast;
window.redirectByRole = redirectByRole;
window.checkRole = checkRole;
window.renderNavbar = renderNavbar;
window.renderSidebar = renderSidebar;
window.getAdminStats = getAdminStats;
window.renderStatsCards = renderStatsCards;
window.renderExamCard = renderExamCard;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getPendingTeachers = getPendingTeachers;
window.approveTeacher = approveTeacher;
window.rejectTeacher = rejectTeacher;
window.getAllUsers = getAllUsers;
window.getQuestions = getQuestions;
window.addQuestion = addQuestion;
window.deleteQuestion = deleteQuestion;
window.getExams = getExams;
window.createExam = createExam;
window.deleteExam = deleteExam;
window.getExamSubmissions = getExamSubmissions;
window.getProctoringLogs = getProctoringLogs;
window.getAvailableExams = getAvailableExams;
window.getExamDetails = getExamDetails;
window.submitExam = submitExam;
window.getResults = getResults;
window.updateProfile = updateProfile;
window.logProctoringEvent = logProctoringEvent;

window.removeExam = async function (id) {
    if (confirm('Are you sure you want to permanently delete this exam? This action cannot be undone.')) {
        const result = await deleteExam(id);
        if (result.success) {
            showToast('Exam deleted successfully!', 'success');
            if (typeof window.loadExams === 'function') {
                window.loadExams();
            } else if (typeof window.loadDashboard === 'function') {
                window.loadDashboard();
            } else {
                setTimeout(() => window.location.reload(), 1000);
            }
        } else {
            showToast(result.message, 'error');
        }
    }
}

// Export for other scripts that use these globally
export {
    login, register, logout, showToast, redirectByRole, checkRole,
    renderNavbar, renderSidebar, getAdminStats, renderStatsCards, renderExamCard,
    formatDate, formatDateTime, getPendingTeachers, approveTeacher, rejectTeacher,
    getAllUsers, getQuestions, addQuestion, deleteQuestion, getExams, createExam, deleteExam,
    getExamSubmissions, getProctoringLogs, getAvailableExams, getExamDetails,
    submitExam, getResults, updateProfile, logProctoringEvent
};
