import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import '../styles/campus.css';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const filteredRooms = rooms.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.room_number?.toLowerCase().includes(term) ||
      r.campus_name?.toLowerCase().includes(term) ||
      (r.tenant_name && r.tenant_name.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'all' || r.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const totalRooms = rooms.length;
  const occupiedCount = rooms.filter((r) => r.status?.toLowerCase() === 'occupied').length;
  const availableCount = rooms.filter((r) => r.status?.toLowerCase() === 'available').length;

  return (
    <div className="container">
      <div className="campus-header">
        <h1 className="campus-title">Rooms</h1>
        <p className="home-subtitle">
          All rooms across your campuses with occupancy and quick access to payments &amp; records.
        </p>
      </div>

      {/* Stats Summary */}
      <div className="stats-card">
        <div className="stats-row">
          <div className="stats-item">
            Total Rooms: <strong>{totalRooms}</strong>
          </div>
          <div className="stats-item">
            Occupied: <strong style={{ color: '#d97706' }}>{occupiedCount}</strong>
          </div>
          <div className="stats-item">
            Available: <strong style={{ color: '#059669' }}>{availableCount}</strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="filter-toolbar">
        <div className="filter-search-wrap">
          <input
            type="text"
            className="filter-input"
            placeholder="Search by room, campus, or tenant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-control-group">
          <label style={{ fontSize: '13px', color: 'var(--text-secondary, #64748b)', fontWeight: '600' }}>
            Status:
          </label>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="occupied">Occupied</option>
          </select>
        </div>
      </div>

      {/* Rooms Content */}
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <span>Loading rooms...</span>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
            {rooms.length === 0 ? 'No rooms found across your campuses' : 'No matching rooms'}
          </p>
          <p style={{ color: '#64748b' }}>
            {rooms.length === 0
              ? 'Create campuses and rooms to see them listed here.'
              : 'Try adjusting your search query or status filter.'}
          </p>
        </div>
      ) : (
        <div className="room-grid">
          {filteredRooms.map((room) => (
            <div key={room.id} className="room-card">
              <div className="room-card-top">
                <div>
                  <Link
                    to={`/campus/${room.campus_id}`}
                    className="room-campus-tag"
                  >
                    🏢 {room.campus_name}
                  </Link>
                  <h3>Room {room.room_number}</h3>
                </div>
                <span className={`badge badge-${room.status?.toLowerCase()}`}>
                  {room.status}
                </span>
              </div>

              <div className="room-details">
                <div>
                  <span>Monthly Rent:</span>
                  <strong>₹{Number(room.monthly_rent).toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span>Deposit:</span>
                  <span>₹{Number(room.security_deposit || 0).toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span>Occupant:</span>
                  <span style={{ fontWeight: room.tenant_name ? '600' : 'normal', color: room.tenant_name ? '#0f172a' : '#94a3b8' }}>
                    {room.tenant_name || 'None'}
                  </span>
                </div>
              </div>

              <div className="card-actions">
                <Link
                  to={`/room/${room.id}`}
                  className="btn btn-primary"
                >
                  View Room
                </Link>
                <Link
                  to={`/campus/${room.campus_id}`}
                  className="btn btn-secondary"
                >
                  Campus
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Rooms;
