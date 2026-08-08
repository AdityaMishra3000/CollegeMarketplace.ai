import { useEffect, useState } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import API from '../api/client';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ activeUsers: 0, totalItems: 0, avgPrice: 0 });

  const fetchData = async () => {
    try {
      const [dashData, statsData] = await Promise.all([
        API.get('/admin/dashboard'),
        API.get('/stats')
      ]);
      setUsers(dashData.users || []);
      setProducts(dashData.products || []);
      setStats(statsData);
    } catch (err) {
      alert('Error fetching admin data');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const deleteUser = async (id) => {
    if (!confirm('Ban & Delete user?')) return;
    await API.delete(`/admin/users/${id}`);
    fetchData();
  };

  // Grouping for charts
  const courses = users.reduce((acc, u) => ({ ...acc, [u.course]: (acc[u.course] || 0) + 1 }), {});

  return (
    <div className="admin-container">
      <h1>🛡️ Admin Control Center</h1>
      
      <div className="dashboard-grid">
        <div className="stat-item">
          <div className="stat-number">{stats.activeUsers}</div>
          <div className="stat-label">Total Verified Students</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">{stats.totalItems}</div>
          <div className="stat-label">Active Listings</div>
        </div>
      </div>

      <div className="charts-wrapper">
        <div className="chart-container">
          <h3>Students by Course</h3>
          <Doughnut data={{
            labels: Object.keys(courses),
            datasets: [{ data: Object.values(courses), backgroundColor: ['#667eea', '#764ba2', '#10b981'] }]
          }} />
        </div>
      </div>

      <h2>👤 Student Accounts</h2>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Course</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.course}</td>
              <td>
                {u.role !== 'admin' && (
                  <button className="danger-btn" onClick={() => deleteUser(u._id)}>Ban & Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}