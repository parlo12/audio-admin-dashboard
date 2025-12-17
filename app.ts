// Type Definitions
interface User {
    ID: number;
    Username: string;
    Email: string;
    AccountType: string;
    IsAdmin: boolean;
    IsPublic: boolean;
    State: string;
    StripeCustomerID: string;
    BooksRead: number;
    LastActiveAt: string;
    CreatedAt: string;
    UpdatedAt: string;
}

interface Stats {
    total_users: number;
    paid_users: number;
    free_users: number;
    active_users_7d: number;
    new_users_today: number;
    new_users_this_week: number;
}

interface UsersResponse {
    users: User[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
}

interface ActiveUser {
    id: number;
    username: string;
    email: string;
    account_type: string;
    last_active_at: string;
    days_active: number;
    books_read: number;
}

interface ActiveUsersResponse {
    active_users: ActiveUser[];
    total_active: number;
    weekly_active_count: number;
    daily_active_count: number;
    days_filter: number;
}

// API Configuration
const API_BASE_URL = '/api';

// State Management
class AppState {
    private token: string | null = null;
    private username: string | null = null;
    private currentPage = 1;
    private currentLimit = 50;
    private filters = {
        search: '',
        accountType: '',
        isAdmin: ''
    };
    private activeDaysFilter = 7;

    setToken(token: string): void {
        this.token = token;
        localStorage.setItem('admin_token', token);
    }

    getToken(): string | null {
        if (!this.token) {
            this.token = localStorage.getItem('admin_token');
        }
        return this.token;
    }

    setUsername(username: string): void {
        this.username = username;
        localStorage.setItem('admin_username', username);
    }

    getUsername(): string | null {
        if (!this.username) {
            this.username = localStorage.getItem('admin_username');
        }
        return this.username;
    }

    logout(): void {
        this.token = null;
        this.username = null;
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_username');
    }

    isAuthenticated(): boolean {
        return !!this.getToken();
    }

    setPage(page: number): void {
        this.currentPage = page;
    }

    getPage(): number {
        return this.currentPage;
    }

    setFilters(filters: Partial<typeof this.filters>): void {
        this.filters = { ...this.filters, ...filters };
    }

    getFilters(): typeof this.filters {
        return this.filters;
    }

    clearFilters(): void {
        this.filters = { search: '', accountType: '', isAdmin: '' };
        this.currentPage = 1;
    }

    setActiveDaysFilter(days: number): void {
        this.activeDaysFilter = days;
    }

    getActiveDaysFilter(): number {
        return this.activeDaysFilter;
    }
}

const appState = new AppState();

// API Service
class ApiService {
    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const token = appState.getToken();
        console.log('Making request to:', endpoint, 'Token:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            appState.logout();
            showLoginScreen();
            throw new Error('Unauthorized');
        }

        if (response.status === 403) {
            throw new Error('Admin access required');
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'Request failed');
        }

        return response.json();
    }

    async login(username: string, password: string): Promise<{ token: string }> {
        return this.request<{ token: string }>('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    }

    async getStats(): Promise<Stats> {
        return this.request<Stats>('/admin/stats');
    }

    async getUsers(
        page: number,
        limit: number,
        filters: { search?: string; accountType?: string; isAdmin?: string }
    ): Promise<UsersResponse> {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });

        if (filters.search) params.append('search', filters.search);
        if (filters.accountType) params.append('account_type', filters.accountType);
        if (filters.isAdmin) params.append('is_admin', filters.isAdmin);

        return this.request<UsersResponse>(`/admin/users?${params.toString()}`);
    }

    async getActiveUsers(days: number): Promise<ActiveUsersResponse> {
        return this.request<ActiveUsersResponse>(`/admin/users/active?days=${days}`);
    }

    async toggleAdmin(userId: number, isAdmin: boolean): Promise<any> {
        return this.request(`/admin/users/${userId}/admin`, {
            method: 'POST',
            body: JSON.stringify({ is_admin: isAdmin }),
        });
    }

    // Maintenance API calls
    async systemWipe(confirmationToken: string): Promise<any> {
        return this.request('/admin/system/wipe', {
            method: 'POST',
            body: JSON.stringify({ confirmation_token: confirmationToken }),
        });
    }

    async deleteUserFiles(userId: number): Promise<any> {
        return this.request(`/admin/users/${userId}/files`, {
            method: 'DELETE',
        });
    }

    async deleteUserData(userId: number): Promise<any> {
        return this.request(`/admin/users/${userId}/data`, {
            method: 'DELETE',
        });
    }

    async deleteUserComplete(userId: number): Promise<any> {
        return this.request(`/admin/users/${userId}/complete`, {
            method: 'DELETE',
        });
    }
}

const api = new ApiService();

// UI Helper Functions
function showLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.add('show');
}

function hideLoading(): void {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('show');
}

function showError(elementId: string, message: string): void {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
        setTimeout(() => element.classList.remove('show'), 5000);
    }
}

function showLoginScreen(): void {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (loginScreen) loginScreen.style.display = 'block';
    if (dashboardScreen) dashboardScreen.style.display = 'none';
}

function showDashboardScreen(): void {
    const loginScreen = document.getElementById('loginScreen');
    const dashboardScreen = document.getElementById('dashboardScreen');
    if (loginScreen) loginScreen.style.display = 'none';
    if (dashboardScreen) dashboardScreen.style.display = 'block';
    
    const usernameElement = document.getElementById('adminUsername');
    if (usernameElement) {
        usernameElement.textContent = appState.getUsername() || 'Admin';
    }
}

function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
}

// Tab Navigation
function switchTab(tabName: string): void {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    if (tabName === 'overview') {
        document.getElementById('overviewTab')?.classList.add('active');
        loadStats();
    } else if (tabName === 'users') {
        document.getElementById('usersTab')?.classList.add('active');
        loadUsers();
    } else if (tabName === 'active') {
        document.getElementById('activeTab')?.classList.add('active');
        loadActiveUsers();
    } else if (tabName === 'maintenance') {
        document.getElementById('maintenanceTab')?.classList.add('active');
    }
}

// Load Stats
async function loadStats(): Promise<void> {
    try {
        showLoading();
        const stats = await api.getStats();

        document.getElementById('totalUsers')!.textContent = stats.total_users.toLocaleString();
        document.getElementById('paidUsers')!.textContent = stats.paid_users.toLocaleString();
        document.getElementById('freeUsers')!.textContent = stats.free_users.toLocaleString();
        document.getElementById('activeUsers7d')!.textContent = stats.active_users_7d.toLocaleString();
        document.getElementById('newUsersToday')!.textContent = stats.new_users_today.toLocaleString();
        document.getElementById('newUsersWeek')!.textContent = stats.new_users_this_week.toLocaleString();
    } catch (error) {
        console.error('Failed to load stats:', error);
        alert('Failed to load statistics: ' + (error as Error).message);
    } finally {
        hideLoading();
    }
}

// Load Users
async function loadUsers(): Promise<void> {
    try {
        showLoading();
        const page = appState.getPage();
        const filters = appState.getFilters();
        
        const response = await api.getUsers(page, 50, filters);

        const tbody = document.getElementById('usersTableBody')!;
        tbody.innerHTML = '';

        if (response.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="loading">No users found</td></tr>';
        } else {
            response.users.forEach(user => {
                const row = createUserRow(user);
                tbody.appendChild(row);
            });
        }

        // Update pagination
        const pageInfo = document.getElementById('pageInfo')!;
        pageInfo.textContent = `Page ${response.page} of ${response.total_pages} (${response.total} users)`;

        const prevBtn = document.getElementById('prevPageBtn') as HTMLButtonElement;
        const nextBtn = document.getElementById('nextPageBtn') as HTMLButtonElement;
        
        prevBtn.disabled = response.page === 1;
        nextBtn.disabled = response.page === response.total_pages;
    } catch (error) {
        console.error('Failed to load users:', error);
        alert('Failed to load users: ' + (error as Error).message);
    } finally {
        hideLoading();
    }
}

function createUserRow(user: User): HTMLTableRowElement {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${user.ID}</td>
        <td><strong>${user.Username}</strong></td>
        <td>${user.Email}</td>
        <td><span class="badge badge-${user.AccountType}">${user.AccountType.toUpperCase()}</span></td>
        <td><span class="badge badge-${user.IsAdmin ? 'admin' : 'user'}">${user.IsAdmin ? 'Admin' : 'User'}</span></td>
        <td>${user.BooksRead}</td>
        <td>${formatRelativeTime(user.LastActiveAt)}</td>
        <td>${formatDate(user.CreatedAt)}</td>
        <td>
            <div class="action-buttons">
                <button class="btn action-btn ${user.IsAdmin ? 'btn-danger' : 'btn-success'}" 
                        onclick="toggleUserAdmin(${user.ID}, ${!user.IsAdmin}, '${user.Username}')">
                    ${user.IsAdmin ? 'Revoke Admin' : 'Make Admin'}
                </button>
            </div>
        </td>
    `;
    
    return row;
}

// Load Active Users
async function loadActiveUsers(): Promise<void> {
    try {
        showLoading();
        const days = appState.getActiveDaysFilter();
        const response = await api.getActiveUsers(days);

        document.getElementById('totalActive')!.textContent = response.total_active.toLocaleString();
        document.getElementById('dailyActive')!.textContent = response.daily_active_count.toLocaleString();
        document.getElementById('weeklyActive')!.textContent = response.weekly_active_count.toLocaleString();

        const tbody = document.getElementById('activeUsersTableBody')!;
        tbody.innerHTML = '';

        if (response.active_users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading">No active users found</td></tr>';
        } else {
            response.active_users.forEach(user => {
                const row = createActiveUserRow(user);
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Failed to load active users:', error);
        alert('Failed to load active users: ' + (error as Error).message);
    } finally {
        hideLoading();
    }
}

function createActiveUserRow(user: ActiveUser): HTMLTableRowElement {
    const row = document.createElement('tr');
    
    row.innerHTML = `
        <td>${user.id}</td>
        <td><strong>${user.username}</strong></td>
        <td>${user.email}</td>
        <td><span class="badge badge-${user.account_type}">${user.account_type.toUpperCase()}</span></td>
        <td>${user.books_read}</td>
        <td>${formatRelativeTime(user.last_active_at)}</td>
        <td>${user.days_active} days</td>
    `;
    
    return row;
}

// Admin Toggle Functions
let pendingAdminToggle: { userId: number; isAdmin: boolean } | null = null;

function toggleUserAdmin(userId: number, isAdmin: boolean, username: string): void {
    pendingAdminToggle = { userId, isAdmin };
    
    const modal = document.getElementById('adminModal')!;
    const message = document.getElementById('adminModalMessage')!;
    
    message.textContent = isAdmin
        ? `Are you sure you want to grant admin access to ${username}?`
        : `Are you sure you want to revoke admin access from ${username}?`;
    
    modal.classList.add('show');
}

async function confirmAdminToggle(): Promise<void> {
    if (!pendingAdminToggle) return;

    try {
        showLoading();
        await api.toggleAdmin(pendingAdminToggle.userId, pendingAdminToggle.isAdmin);
        
        const modal = document.getElementById('adminModal')!;
        modal.classList.remove('show');
        pendingAdminToggle = null;
        
        // Reload the users list
        loadUsers();
    } catch (error) {
        console.error('Failed to toggle admin:', error);
        alert('Failed to update admin status: ' + (error as Error).message);
    } finally {
        hideLoading();
    }
}

function cancelAdminToggle(): void {
    const modal = document.getElementById('adminModal')!;
    modal.classList.remove('show');
    pendingAdminToggle = null;
}

// Event Listeners
function setupEventListeners(): void {
    // Login Form
    const loginForm = document.getElementById('loginForm') as HTMLFormElement;
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;

        try {
            showLoading();
            const response = await api.login(username, password);
            console.log('Login response received:', response);
            appState.setToken(response.token);
            console.log('Token set, value:', appState.getToken()?.substring(0, 20) + '...');
            appState.setUsername(username);
            
            // Verify admin access by loading stats
            console.log('About to call getStats...');
            await api.getStats();
            
            showDashboardScreen();
            switchTab('overview');
        } catch (error) {
            console.error('Login failed:', error);
            showError('loginError', (error as Error).message);
        } finally {
            hideLoading();
        }
    });

    // Logout Button
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        appState.logout();
        showLoginScreen();
    });

    // Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const tabName = target.dataset.tab;
            if (tabName) switchTab(tabName);
        });
    });

    // Refresh Stats Button
    document.getElementById('refreshStatsBtn')?.addEventListener('click', loadStats);

    // User Filters
    document.getElementById('applyFiltersBtn')?.addEventListener('click', () => {
        const search = (document.getElementById('userSearch') as HTMLInputElement).value;
        const accountType = (document.getElementById('accountTypeFilter') as HTMLSelectElement).value;
        const isAdmin = (document.getElementById('adminFilter') as HTMLSelectElement).value;

        appState.setFilters({ search, accountType, isAdmin });
        appState.setPage(1);
        loadUsers();
    });

    document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
        (document.getElementById('userSearch') as HTMLInputElement).value = '';
        (document.getElementById('accountTypeFilter') as HTMLSelectElement).value = '';
        (document.getElementById('adminFilter') as HTMLSelectElement).value = '';
        
        appState.clearFilters();
        loadUsers();
    });

    // Pagination
    document.getElementById('prevPageBtn')?.addEventListener('click', () => {
        const currentPage = appState.getPage();
        if (currentPage > 1) {
            appState.setPage(currentPage - 1);
            loadUsers();
        }
    });

    document.getElementById('nextPageBtn')?.addEventListener('click', () => {
        appState.setPage(appState.getPage() + 1);
        loadUsers();
    });

    // Active Users Filter
    document.getElementById('applyDaysFilterBtn')?.addEventListener('click', () => {
        const days = parseInt((document.getElementById('daysFilter') as HTMLSelectElement).value);
        appState.setActiveDaysFilter(days);
        loadActiveUsers();
    });

    // Admin Modal
    document.getElementById('confirmAdminBtn')?.addEventListener('click', confirmAdminToggle);
    document.getElementById('cancelAdminBtn')?.addEventListener('click', cancelAdminToggle);

    // Maintenance Tab Event Listeners
    setupMaintenanceListeners();
}

// Maintenance Tab Functions
function setupMaintenanceListeners(): void {
    // System Wipe confirmation input
    const wipeInput = document.getElementById('wipeConfirmation') as HTMLInputElement;
    const wipeBtn = document.getElementById('systemWipeBtn') as HTMLButtonElement;
    
    wipeInput?.addEventListener('input', () => {
        const isValid = wipeInput.value === 'WIPE_ALL_USER_DATA_CONFIRM';
        wipeBtn.disabled = !isValid;
    });

    // System Wipe button
    wipeBtn?.addEventListener('click', async () => {
        const confirmation = confirm(
            '⚠️ FINAL WARNING ⚠️\n\n' +
            'This will DELETE ALL non-admin users and their database records!\n\n' +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure you want to continue?'
        );
        
        if (!confirmation) return;

        try {
            showLoading();
            const result = await api.systemWipe('WIPE_ALL_USER_DATA_CONFIRM');
            showResult('wipeResult', 
                `✅ System wiped successfully!\n` +
                `Users deleted: ${result.users_deleted}\n` +
                `Admins preserved: ${result.admins_preserved}`,
                'success'
            );
            wipeInput.value = '';
            wipeBtn.disabled = true;
            
            // Refresh stats
            if (getCurrentTab() === 'overview') {
                loadStats();
            }
        } catch (error) {
            showResult('wipeResult', `❌ Error: ${(error as Error).message}`, 'error');
        } finally {
            hideLoading();
        }
    });

    // Delete User Files
    document.getElementById('deleteUserFilesBtn')?.addEventListener('click', async () => {
        const userId = parseInt((document.getElementById('deleteUserId') as HTMLInputElement).value);
        if (!userId || userId < 1) {
            showResult('deleteResult', '❌ Please enter a valid user ID', 'error');
            return;
        }

        const confirmation = confirm(
            `⚠️ Delete all files for user ID ${userId}?\n\n` +
            'This will delete:\n' +
            '- Upload files (PDF/TXT/EPUB/MOBI)\n' +
            '- Generated audio files\n' +
            '- Cover images\n' +
            '- Audio chunks\n\n' +
            'This action CANNOT be undone!'
        );

        if (!confirmation) return;

        try {
            showLoading();
            const result = await api.deleteUserFiles(userId);
            showResult('deleteResult',
                `✅ Files deleted successfully!\n` +
                `User ID: ${result.user_id}\n` +
                `Books deleted: ${result.books_deleted}\n` +
                `Chunks deleted: ${result.chunks_deleted}`,
                'success'
            );
            (document.getElementById('deleteUserId') as HTMLInputElement).value = '';
        } catch (error) {
            showResult('deleteResult', `❌ Error: ${(error as Error).message}`, 'error');
        } finally {
            hideLoading();
        }
    });

    // Delete User Data
    document.getElementById('deleteUserDataBtn')?.addEventListener('click', async () => {
        const userId = parseInt((document.getElementById('deleteUserId') as HTMLInputElement).value);
        if (!userId || userId < 1) {
            showResult('deleteResult', '❌ Please enter a valid user ID', 'error');
            return;
        }

        const confirmation = confirm(
            `⚠️ Delete database records for user ID ${userId}?\n\n` +
            'This will delete:\n' +
            '- User account\n' +
            '- User histories\n' +
            '- User book histories\n\n' +
            'Files will NOT be deleted.\n' +
            'This action CANNOT be undone!'
        );

        if (!confirmation) return;

        try {
            showLoading();
            const result = await api.deleteUserData(userId);
            showResult('deleteResult',
                `✅ User data deleted successfully!\n` +
                `User ID: ${result.user_id}\n` +
                `Username: ${result.username}\n` +
                `Email: ${result.email}`,
                'success'
            );
            (document.getElementById('deleteUserId') as HTMLInputElement).value = '';
        } catch (error) {
            showResult('deleteResult', `❌ Error: ${(error as Error).message}`, 'error');
        } finally {
            hideLoading();
        }
    });

    // Delete User Complete
    document.getElementById('deleteUserCompleteBtn')?.addEventListener('click', async () => {
        const userId = parseInt((document.getElementById('deleteUserId') as HTMLInputElement).value);
        if (!userId || userId < 1) {
            showResult('deleteResult', '❌ Please enter a valid user ID', 'error');
            return;
        }

        const confirmation = confirm(
            `⚠️ COMPLETE DELETION for user ID ${userId}?\n\n` +
            'This will delete:\n' +
            '- ALL FILES (uploads, audio, covers, chunks)\n' +
            '- ALL DATABASE RECORDS (account, histories, books)\n\n' +
            'This is a COMPLETE removal from the system!\n' +
            'This action CANNOT be undone!\n\n' +
            'Are you absolutely sure?'
        );

        if (!confirmation) return;

        try {
            showLoading();
            const result = await api.deleteUserComplete(userId);
            showResult('deleteResult',
                `✅ User completely deleted!\n` +
                `User ID: ${result.user_id}\n` +
                `Username: ${result.username}\n` +
                `Email: ${result.email}`,
                'success'
            );
            (document.getElementById('deleteUserId') as HTMLInputElement).value = '';
        } catch (error) {
            showResult('deleteResult', `❌ Error: ${(error as Error).message}`, 'error');
        } finally {
            hideLoading();
        }
    });
}

function showResult(elementId: string, message: string, type: 'success' | 'error'): void {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    element.textContent = message;
    element.className = `result-message ${type}`;
    element.style.display = 'block';
    
    // Auto-hide after 10 seconds for success, keep error visible
    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 10000);
    }
}

function getCurrentTab(): string {
    const activeTab = document.querySelector('.nav-tab.active');
    return activeTab?.getAttribute('data-tab') || 'overview';
}

// Make toggleUserAdmin available globally
(window as any).toggleUserAdmin = toggleUserAdmin;

// Initialize App
function initApp(): void {
    setupEventListeners();
    
    if (appState.isAuthenticated()) {
        showDashboardScreen();
        switchTab('overview');
    } else {
        showLoginScreen();
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
