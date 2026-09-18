import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/campus.css';

function Campus() {
  const { id } = useParams();
  const [campus, setCampus] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal form states for Add / Edit Room
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [roomFormData, setRoomFormData] = useState({
    room_number: '',
    monthly_rent: '',
    security_deposit: '0'
  });

  // In-app Confirm & Alert Dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Delete',
    type: 'danger',
    isAlert: false,
    onConfirm: () => {}
  });

  const showConfirm = ({ title, message, confirmText = 'Delete', type = 'danger', onConfirm }) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText,
      type,
      isAlert: false,
      onConfirm
    });
  };

  const showAlert = (message, title = 'Notice', type = 'warning') => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      type,
      isAlert: true,
      onConfirm: () => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
  };

  // Fetch campus details
  const fetchCampus = async () => {
    try {
      const response = await api.get(`/api/campuses/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCampus(data);
      }
    } catch (error) {
      console.error('Error fetching campus:', error);
    }
  };

  // Fetch rooms for this campus
  const fetchRooms = async () => {
    try {
      const response = await api.get(`/api/rooms/campus/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchCampus(), fetchRooms()]);
      setLoading(false);
    };
    loadAll();
  }, [id]);

  // Open modal for adding room
  const openAddRoomModal = () => {
    setModalMode('add');
    setEditingRoomId(null);
    setRoomFormData({
      room_number: '',
      monthly_rent: '',
      security_deposit: '0'
    });
    setShowModal(true);
  };

  // Open modal for editing room
  const openEditRoomModal = (room) => {
    setModalMode('edit');
    setEditingRoomId(room.id);
    setRoomFormData({
      room_number: room.room_number,
      monthly_rent: String(room.monthly_rent),
      security_deposit: String(room.security_deposit || 0)
    });
    setShowModal(true);
  };

  // Close room add/edit modal
  const closeModal = () => {
    setShowModal(false);
    setEditingRoomId(null);
    setRoomFormData({
      room_number: '',
      monthly_rent: '',
      security_deposit: '0'
    });
  };

  // Handle Save Room (Add / Edit)
  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!roomFormData.room_number.trim() || !roomFormData.monthly_rent) return;

    try {
      if (modalMode === 'add') {
        const response = await api.post('/api/rooms', {
          campus_id: id,
          room_number: roomFormData.room_number.trim(),
          monthly_rent: Number(roomFormData.monthly_rent),
          security_deposit: Number(roomFormData.security_deposit) || 0
        });

        if (response.ok) {
          fetchRooms();
          fetchCampus();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to create room', 'Room Creation Error', 'warning');
        }
      } else {
        const response = await api.put(`/api/rooms/${editingRoomId}`, {
          room_number: roomFormData.room_number.trim(),
          monthly_rent: Number(roomFormData.monthly_rent),
          security_deposit: Number(roomFormData.security_deposit) || 0
        });

        if (response.ok) {
          fetchRooms();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to update room', 'Room Update Error', 'warning');
        }
      }
    } catch (error) {
      console.error('Error saving room:', error);
      showAlert('An error occurred while saving the room.', 'Error', 'danger');
    }
  };

  // Trigger on-screen in-app confirmation for deleting room
  const handleDeleteRoom = (room) => {
    showConfirm({
      title: 'Delete Room',
      message: `Are you sure you want to delete Room ${room.room_number}? This will permanently remove the room.`,
      confirmText: 'Delete Room',
      type: 'danger',
      onConfirm: () => executeDeleteRoom(room)
    });
  };

  const executeDeleteRoom = async (room) => {
    closeConfirmDialog();
    try {
      const response = await api.delete(`/api/rooms/${room.id}`);

      if (response.ok) {
        fetchRooms();
        fetchCampus();
      } else {
        const err = await response.json();
        showAlert(err.message || 'Failed to delete room', 'Cannot Delete Room', 'warning');
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      showAlert('An error occurred while deleting the room.', 'Error', 'danger');
    }
  };

  // Dynamic live statistics calculated directly from loaded rooms
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length;
  const availableRooms = rooms.filter((r) => r.status !== 'occupied').length;

  return (
    <div>
      <div className="campus-header">
        <Link to="/" className="back-link">
          ← Back to Campuses
        </Link>
        <h1 className="campus-title">{campus ? campus.name : 'Loading Campus...'}</h1>
      </div>

      {/* Campus Statistics */}
      <div className="stats-card">
        <h2>Campus Statistics</h2>
        <div className="stats-row">
          <span className="stats-item">Total Rooms: <strong>{totalRooms}</strong></span>
          <span className="stats-item">Occupied: <strong>{occupiedRooms}</strong></span>
          <span className="stats-item">Available: <strong>{availableRooms}</strong></span>
        </div>
      </div>

      <div className="section-header">
        <h2 className="section-title">Rooms List</h2>
        <button className="btn btn-primary" onClick={openAddRoomModal}>
          + Add Room
        </button>
      </div>

      {/* Modal Dialog for Add / Edit Room */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === 'add' ? 'Add New Room' : 'Edit Room'}</h3>
            <form onSubmit={handleSaveRoom}>
              <div className="form-group">
                <label>Room Number:</label>
                <input
                  type="text"
                  className="form-input"
                  value={roomFormData.room_number}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, room_number: e.target.value })
                  }
                  placeholder="e.g. 101"
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Monthly Rent (₹):</label>
                <input
                  type="number"
                  className="form-input"
                  value={roomFormData.monthly_rent}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, monthly_rent: e.target.value })
                  }
                  placeholder="e.g. 5000"
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Security Deposit (₹):</label>
                <input
                  type="number"
                  className="form-input"
                  value={roomFormData.security_deposit}
                  onChange={(e) =>
                    setRoomFormData({ ...roomFormData, security_deposit: e.target.value })
                  }
                  placeholder="e.g. 10000"
                  min="0"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Create Room' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <span>Loading rooms...</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
              No rooms in this campus yet
            </p>
            <p style={{ color: '#64748b' }}>
              Click <strong>"+ Add Room"</strong> above to add your first room to this campus.
            </p>
          </div>
        ) : (
          <div className="room-grid">
            {rooms.map((room) => (
              <div key={room.id} className="room-card">
                <div className="room-card-top">
                  <h3>Room {room.room_number}</h3>
                  <span className={`badge ${room.status === 'occupied' ? 'badge-occupied' : 'badge-available'}`}>
                    {room.status === 'occupied' ? 'Occupied' : 'Available'}
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
                    <span>Rent Status:</span>
                    {room.current_rent_status ? (
                      <span className={`badge ${room.current_rent_status === 'Paid' ? 'badge-paid' : 'badge-due'}`}>
                        {room.current_rent_status}
                      </span>
                    ) : (
                      <span className="badge badge-available">N/A</span>
                    )}
                  </div>
                </div>
                <div className="card-actions">
                  <Link to={`/room/${room.id}`} className="btn btn-primary">
                    View
                  </Link>
                  <button className="btn btn-secondary" onClick={() => openEditRoomModal(room)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDeleteRoom(room)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* In-App On-Screen Confirmation and Alert Dialog */}
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        type={confirmDialog.type}
        isAlert={confirmDialog.isAlert}
        onConfirm={confirmDialog.onConfirm}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}

export default Campus;
