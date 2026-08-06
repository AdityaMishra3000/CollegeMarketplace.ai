// admin.js - Admin Dashboard Logic

let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (!token || !userStr) {
        window.location.href = 'index.html';
        return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        alert('Access Denied. You do not have admin privileges.');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('adminApp').style.display = 'block';

    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const token = localStorage.getItem('authToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        const adminRes = await fetch('/api/admin/dashboard', { headers });
        if (!adminRes.ok) throw new Error('Failed to fetch admin data');
        const { users, products } = await adminRes.json();

        const statsRes = await fetch('/api/stats');
        const stats = await statsRes.json();

        renderKPIs(stats, products);
        renderCharts(users, products);
        renderUsersTable(users);
        renderProductsTable(products);

    } catch (error) {
        alert('Error loading dashboard data.');
    }
}

function renderKPIs(stats, products) {
    // Only calculate value of active/available products
    const activeProducts = products.filter(p => p.isActive);
    const totalValue = activeProducts.reduce((sum, p) => sum + p.price, 0);

    document.getElementById('kpiUsers').textContent = stats.activeUsers;
    document.getElementById('kpiProducts').textContent = stats.totalItems;
    document.getElementById('kpiValue').textContent = `₹${totalValue.toLocaleString('en-IN')}`;
    document.getElementById('kpiAvg').textContent = `₹${Math.floor(stats.avgPrice).toLocaleString('en-IN')}`;
}

function renderCharts(users, products) {
    if (charts.users) charts.users.destroy();
    if (charts.products) charts.products.destroy();

    const courses = users.reduce((acc, user) => {
        acc[user.course] = (acc[user.course] || 0) + 1;
        return acc;
    }, {});

    // Prepare Product Data (Group by Category counting ACTUAL QUANTITY)
    const categories = products.reduce((acc, prod) => {
        // Only count items that are actually available
        if (prod.status !== 'sold_out') {
            // Add the exact quantity number to the chart, not just "1"
            acc[prod.category] = (acc[prod.category] || 0) + (prod.quantity || 1);
        }
        return acc;
    }, {});

    const ctxUsers = document.getElementById('usersChart').getContext('2d');
    charts.users = new Chart(ctxUsers, {
        type: 'doughnut',
        data: {
            labels: Object.keys(courses),
            datasets: [{ data: Object.values(courses), backgroundColor: ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'] }]
        },
        options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });

    const ctxProducts = document.getElementById('productsChart').getContext('2d');
    charts.products = new Chart(ctxProducts, {
        type: 'bar',
        data: {
            labels: Object.keys(categories),
            datasets: [{ label: 'Number of Listings', data: Object.values(categories), backgroundColor: '#667eea', borderRadius: 5 }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
}

function renderUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td><strong>${user.name}</strong></td>
            <td>${user.email}</td>
            <td>${user.course}</td>
            <td><span style="background: ${user.role === 'admin' ? '#fef3c7' : '#e0e7ff'}; color: ${user.role === 'admin' ? '#92400e' : '#3730a3'}; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">${user.role.toUpperCase()}</span></td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${user.role !== 'admin' ? `<button class="danger-btn" onclick="deleteUser('${user._id}')">Ban & Delete</button>` : '—'}</td>
        </tr>
    `).join('');
}

function renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = products.map(product => `
        <tr>
            <td><strong>${product.title}</strong></td>
            <td style="text-transform: capitalize;">${product.category}</td>
            <td style="font-weight: bold; color: #10b981;">₹${product.price.toLocaleString('en-IN')}</td>
            <td>${product.seller?.name || 'Unknown'}</td>
            
            <td>
                ${product.status === 'sold_out' || product.quantity === 0 
                    ? `<span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">🔴 SOLD OUT</span>` 
                    : `<span style="background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold;">🟢 ${product.quantity ?? 1} Left</span>`}
            </td>

            <td>${product.isFlagged ? '<span style="color: #ef4444; font-weight: bold;">⚠️ Flagged</span>' : '<span style="color: #10b981;">Safe</span>'}</td>
            <td><button class="danger-btn" onclick="deleteProduct('${product._id}')">Remove</button></td>
        </tr>
    `).join('');
}

async function deleteUser(userId) {
    if (!confirm('WARNING: This will permanently delete this student and ALL of their listings. Proceed?')) return;
    try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) loadDashboardData();
        else alert(`Error: ${(await res.json()).message}`);
    } catch (error) { alert('Network error occurred.'); }
}

async function deleteProduct(productId) {
    if (!confirm('Remove this listing from the marketplace?')) return;
    try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) loadDashboardData();
    } catch (error) { alert('Network error occurred.'); }
}

function logoutAdmin() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}