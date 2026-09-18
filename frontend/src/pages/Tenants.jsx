import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import '../styles/campus.css';
import '../styles/room.css';

function Tenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = tenants.filter((t) => {
    const term = searchTerm.toLowerCase();
    return (
      t.name?.toLowerCase().includes(term) ||
      t.phone?.toLowerCase().includes(term) ||
      t.email?.toLowerCase().includes(term) ||
      t.room_number?.toLowerCase().includes(term) ||
      t.campus_name?.toLowerCase().includes(term)
    );
  });

  const uniqueCampuses = new Set(tenants.map((t) => t.campus_name).filter(Boolean)).size;

  return (
    <div className="container">
      <div className="campus-header">
        <h1 className="campus-title">Tenants</h1>
        <p className="home-subtitle">
          All active tenants across your properties with quick access to their room, payments, and records.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="stats-card">
        <div className="stats-row">
          <div className="stats-item">
            Total Active Tenants: <strong style={{ color: 'var(--primary, #4f46e5)' }}>{tenants.length}</strong>
          </div>
          <div className="stats-item">
            Campuses Represented: <strong>{uniqueCampuses}</strong>
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-wrap">
          <input
            type="text"
            className="filter-input"
            placeholder="Search by name, phone, email, room, or campus..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tenants Content */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading tenants...</span>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
            {tenants.length === 0 ? 'No active tenants found' : 'No matching tenants'}
          </p>
          <p style={{ color: '#64748b' }}>
            {tenants.length === 0
              ? 'When you assign tenants to rooms, they will appear in this unified directory.'
              : 'Try searching with a different name, phone, room, or campus.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="history-table">
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Campus</th>
                <th>Room</th>
                <th>Joining Date</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td style={{ fontWeight: '600', color: 'var(--text-primary, #0f172a)' }}>
                    👤 {tenant.name}
                  </td>
                  <td>{tenant.phone || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td>{tenant.email || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                  <td>
                    <Link
                      to={`/campus/${tenant.campus_id}`}
                      className="tenant-campus-link"
                    >
                      🏢 {tenant.campus_name}
                    </Link>
                  </td>
                  <td>
                    <span className="tenant-room-badge">
                      Room {tenant.room_number}
                    </span>
                  </td>
                  <td>
                    {tenant.joining_date
                      ? new Date(tenant.joining_date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      : <span style={{ color: '#94a3b8' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <Link
                      to={`/room/${tenant.room_id}`}
                      className="btn btn-primary btn-sm"
                    >
                      View Room &amp; Payments
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Tenants;
