import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/home.css';

function Home() {
  const navigate = useNavigate();
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [campusName, setCampusName] = useState('');
  const [editingCampusId, setEditingCampusId] = useState(null);

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

  // Get logged-in owner
  const storedOwner = localStorage.getItem('owner');
  const owner = storedOwner ? JSON.parse(storedOwner) : null;

  // Fetch all campuses for this authenticated owner
  const fetchCampuses = async () => {
    try {
      const response = await api.get('/api/campuses');
      if (response.ok) {
        const data = await response.json();
        setCampuses(data);
      }
    } catch (error) {
      console.error('Error fetching campuses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampuses();
  }, []);

  // Open modal to add a new campus
  const openAddModal = () => {
    setModalMode('add');
    setCampusName('');
    setEditingCampusId(null);
    setShowModal(true);
  };

  // Open modal to edit an existing campus
  const openEditModal = (campus) => {
    setModalMode('edit');
    setCampusName(campus.name);
    setEditingCampusId(campus.id);
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setCampusName('');
    setEditingCampusId(null);
  };

  // Handle Save (Add or Edit)
  const handleSaveCampus = async (e) => {
    e.preventDefault();
    if (!campusName.trim()) return;

    try {
      if (modalMode === 'add') {
        const response = await api.post('/api/campuses', { name: campusName.trim() });

        if (response.ok) {
          fetchCampuses();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to create campus', 'Campus Creation Error', 'warning');
        }
      } else {
        const response = await api.put(`/api/campuses/${editingCampusId}`, { name: campusName.trim() });

        if (response.ok) {
          fetchCampuses();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to update campus', 'Campus Update Error', 'warning');
        }
      }
    } catch (error) {
      console.error('Error saving campus:', error);
      showAlert('An error occurred while saving the campus.', 'Error', 'danger');
    }
  };

  // Trigger on-screen in-app confirmation for deleting campus
  const handleDeleteCampus = (campus) => {
    showConfirm({
      title: 'Delete Campus',
      message: `Are you sure you want to delete campus "${campus.name}"? This will permanently delete all rooms, rent, and payment records inside this campus.`,
      confirmText: 'Delete Campus',
      type: 'danger',
      onConfirm: () => executeDeleteCampus(campus)
    });
  };

  const executeDeleteCampus = async (campus) => {
    closeConfirmDialog();
    try {
      const response = await api.delete(`/api/campuses/${campus.id}`);

      if (response.ok) {
        fetchCampuses();
      } else {
        const err = await response.json();
        showAlert(err.message || 'Failed to delete campus', 'Cannot Delete Campus', 'warning');
      }
    } catch (error) {
      console.error('Error deleting campus:', error);
      showAlert('An error occurred while deleting the campus.', 'Error', 'danger');
    }
  };

  const firstName = owner?.name ? owner.name.trim().split(' ')[0] : '';

  return (
    <div>
      <div className="home-header">
        <h1 className="home-title">
          {firstName ? `Welcome, ${firstName}` : 'Welcome to RentSphere'}
        </h1>
        <p className="home-subtitle">Rental Management Dashboard</p>
      </div>

      <div className="section-header">
        <h2 className="section-title">My Campuses</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Campus
        </button>
      </div>

      {/* Modal Dialog for Add / Edit Campus */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{modalMode === 'add' ? 'Add New Campus' : 'Edit Campus'}</h3>
            <form onSubmit={handleSaveCampus}>
              <div className="form-group">
                <label>Campus Name:</label>
                <input
                  type="text"
                  className="form-input"
                  value={campusName}
                  onChange={(e) => setCampusName(e.target.value)}
                  placeholder="e.g. Green Valley Campus"
                  required
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {modalMode === 'add' ? 'Create Campus' : 'Save Changes'}
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
            <span>Loading campuses...</span>
          </div>
        ) : campuses.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', marginBottom: '6px' }}>
              No campuses found yet
            </p>
            <p style={{ color: '#64748b' }}>
              Click <strong>"+ Add Campus"</strong> above to create your first property campus.
            </p>
          </div>
        ) : (
          <div className="campus-grid">
            {campuses.map((campus) => (
              <div key={campus.id} className="campus-card">
                <h3>{campus.name}</h3>
                <div className="campus-stats">
                  <span>Total Rooms: <strong>{campus.totalRooms || 0}</strong></span>
                  <span>Occupied: <strong>{campus.occupied || 0}</strong></span>
                  <span>Available: <strong>{campus.available || 0}</strong></span>
                </div>
                <div className="card-actions">
                  <Link to={`/campus/${campus.id}`} className="btn btn-primary">
                    View
                  </Link>
                  <button className="btn btn-secondary" onClick={() => openEditModal(campus)}>
                    Edit
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDeleteCampus(campus)}>
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

export default Home;
