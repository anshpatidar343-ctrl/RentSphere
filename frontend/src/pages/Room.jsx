import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import ConfirmModal from '../components/ConfirmModal';
import '../styles/room.css';

function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [editingTenantId, setEditingTenantId] = useState(null);
  const [rent, setRent] = useState(null);
  const [rentHistory, setRentHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [documents, setDocuments] = useState([]);

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

  // Modal active states: null | 'tenant_add' | 'tenant_edit' | 'mark_paid' | 'document_add'
  const [activeModal, setActiveModal] = useState(null);

  // Form states
  const [tenantForm, setTenantForm] = useState({ name: '', phone: '', email: '', joining_date: '' });
  const [markPaidForm, setMarkPaidForm] = useState({
    rent_id: null,
    amount: '',
    payment_date: '',
    payment_method: 'UPI',
    note: ''
  });
  const [documentForm, setDocumentForm] = useState({ tenant_id: '', document_name: '', file: null });

  // 1. Fetch Room Details
  const fetchRoom = async () => {
    try {
      const response = await api.get(`/api/rooms/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRoom(data);
      }
    } catch (error) {
      console.error('Error fetching room:', error);
    }
  };

  // 2. Fetch Documents for tenant
  const fetchDocuments = async (tenantId) => {
    if (!tenantId) return;
    try {
      const response = await api.get(`/api/documents/tenant/${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  // 3. Fetch Tenants for this room
  const fetchTenants = async () => {
    try {
      const response = await api.get(`/api/tenants/room/${id}`);
      if (response.ok) {
        const data = await response.json();
        const tenantList = Array.isArray(data) ? data : (data ? [data] : []);
        setTenants(tenantList);
        if (tenantList.length > 0) {
          fetchDocuments(tenantList[0].id);
        } else {
          setDocuments([]);
        }
      } else {
        setTenants([]);
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  // 4. Fetch Current Rent for this room (auto-fetched / initialized for current month)
  const fetchRent = async () => {
    try {
      const response = await api.get(`/api/rent/room/${id}`);
      if (response.ok) {
        const data = await response.json();
        setRent(data);
      }
    } catch (error) {
      console.error('Error fetching rent:', error);
    }
  };

  // 5. Fetch Rent History for this room
  const fetchRentHistory = async () => {
    try {
      const response = await api.get(`/api/rent/room/${id}/history`);
      if (response.ok) {
        const data = await response.json();
        setRentHistory(data);
      }
    } catch (error) {
      console.error('Error fetching rent history:', error);
    }
  };

  // 6. Fetch Payments for this room
  const fetchPayments = async () => {
    try {
      const response = await api.get(`/api/payments/room/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  useEffect(() => {
    fetchRoom();
    fetchTenants();
    fetchRent();
    fetchRentHistory();
    fetchPayments();
  }, [id]);

  const closeModal = () => {
    setActiveModal(null);
    setEditingTenantId(null);
  };

  // Tenant Handlers
  const openAddTenantModal = () => {
    setEditingTenantId(null);
    setTenantForm({ name: '', phone: '', email: '', joining_date: '' });
    setActiveModal('tenant_add');
  };

  const openEditTenantModal = (targetTenant) => {
    if (!targetTenant) return;
    setEditingTenantId(targetTenant.id);
    setTenantForm({
      name: targetTenant.name,
      phone: targetTenant.phone || '',
      email: targetTenant.email || '',
      joining_date: targetTenant.joining_date ? targetTenant.joining_date.substring(0, 10) : ''
    });
    setActiveModal('tenant_edit');
  };

  const handleSaveTenant = async (e) => {
    e.preventDefault();
    if (!tenantForm.name.trim()) return;

    try {
      if (activeModal === 'tenant_add') {
        const response = await api.post('/api/tenants', {
          room_id: id,
          name: tenantForm.name.trim(),
          phone: tenantForm.phone.trim() || null,
          email: tenantForm.email.trim() || null,
          joining_date: tenantForm.joining_date || null
        });

        if (response.ok) {
          fetchTenants();
          fetchRoom();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to add tenant', 'Add Tenant Error', 'warning');
        }
      } else if (activeModal === 'tenant_edit' && editingTenantId) {
        const response = await api.put(`/api/tenants/${editingTenantId}`, {
          name: tenantForm.name.trim(),
          phone: tenantForm.phone.trim() || null,
          email: tenantForm.email.trim() || null,
          joining_date: tenantForm.joining_date || null
        });

        if (response.ok) {
          fetchTenants();
          closeModal();
        } else {
          const err = await response.json();
          showAlert(err.message || 'Failed to update tenant', 'Update Tenant Error', 'warning');
        }
      }
    } catch (error) {
      console.error('Error saving tenant:', error);
      showAlert('An error occurred while saving the tenant.', 'Error', 'danger');
    }
  };

  // In-app confirmation for removing tenant
  const handleDeleteTenant = (targetTenant) => {
    if (!targetTenant) return;

    showConfirm({
      title: 'Remove Tenant',
      message: `Are you sure you want to remove tenant "${targetTenant.name}" from this room? This action cannot be undone.`,
      confirmText: 'Remove Tenant',
      type: 'danger',
      onConfirm: () => executeDeleteTenant(targetTenant)
    });
  };

  const executeDeleteTenant = async (targetTenant) => {
    closeConfirmDialog();
    try {
      const response = await api.delete(`/api/tenants/${targetTenant.id}`);

      if (response.ok) {
        fetchTenants();
        fetchRoom();
      } else {
        const err = await response.json();
        showAlert(err.message || 'Failed to remove tenant', 'Cannot Remove Tenant', 'warning');
      }
    } catch (error) {
      console.error('Error removing tenant:', error);
      showAlert('An error occurred while removing the tenant.', 'Error', 'danger');
    }
  };

  // Mark Rent as Paid Handlers
  const openMarkPaidModal = (targetRent = rent) => {
    if (!targetRent) return;
    const today = new Date().toISOString().substring(0, 10);
    setMarkPaidForm({
      rent_id: targetRent.id,
      amount: String(targetRent.remaining_amount > 0 ? targetRent.remaining_amount : targetRent.rent_amount),
      payment_date: today,
      payment_method: 'UPI',
      note: ''
    });
    setActiveModal('mark_paid');
  };

  const handleConfirmMarkPaid = async (e) => {
    e.preventDefault();
    if (!markPaidForm.payment_date || !markPaidForm.amount) return;

    try {
      const response = await api.post('/api/payments', {
        rent_id: markPaidForm.rent_id,
        amount: Number(markPaidForm.amount),
        payment_date: markPaidForm.payment_date,
        payment_method: markPaidForm.payment_method,
        note: markPaidForm.note.trim()
      });

      if (response.ok) {
        await fetchRent();
        await fetchRentHistory();
        await fetchPayments();
        closeModal();
      } else {
        const errData = await response.json();
        showAlert(errData.error || errData.message || 'Failed to mark rent as paid', 'Payment Error', 'warning');
      }
    } catch (error) {
      console.error('Error marking rent as paid:', error);
      showAlert('An error occurred while recording the payment.', 'Error', 'danger');
    }
  };

  // Document Handlers
  const openAddDocumentModal = () => {
    if (tenants.length === 0) {
      showAlert('Please assign a tenant to this room before adding documents.', 'No Tenant Assigned', 'info');
      return;
    }
    setDocumentForm({ tenant_id: String(tenants[0].id), document_name: '', file: null });
    setActiveModal('document_add');
  };

  const handleSaveDocument = async (e) => {
    e.preventDefault();
    if (!documentForm.document_name.trim() || !documentForm.file) return;

    const assignedTenantId = documentForm.tenant_id || (tenants.length > 0 ? tenants[0].id : null);
    if (!assignedTenantId) {
      showAlert('Please select a tenant for this document.', 'Select Tenant', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('tenant_id', assignedTenantId);
    formData.append('document_name', documentForm.document_name.trim());
    formData.append('file', documentForm.file);

    try {
      const response = await api.post('/api/documents', formData);

      if (response.ok) {
        fetchDocuments(assignedTenantId);
        closeModal();
      } else {
        const errData = await response.json();
        showAlert(errData.error || errData.message || 'Failed to upload document', 'Upload Error', 'warning');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showAlert('An error occurred while uploading the document.', 'Error', 'danger');
    }
  };

  return (
    <div>
      <div className="room-header">
        <Link to={room ? `/campus/${room.campus_id}` : '/'} className="back-link">
          ← Back to Campus
        </Link>
        <h1 className="room-title">Room {room ? room.room_number : 'Loading...'} Details</h1>
      </div>

      {/* 1. Room Information */}
      <section className="room-section">
        <h2 className="section-heading">1. Room Information</h2>
        <div className="detail-grid">
          <span className="detail-row">Room Number: <strong>{room ? room.room_number : 'Loading...'}</strong></span>
          <span className="detail-row">
            Status:{' '}
            <span className={`badge ${room && room.status === 'occupied' ? 'badge-occupied' : 'badge-available'}`}>
              {room ? (room.status === 'occupied' ? 'Occupied' : 'Available') : 'Loading...'}
            </span>
          </span>
          <span className="detail-row">Monthly Rent: <strong>₹{room ? room.monthly_rent : '0'}</strong></span>
          <span className="detail-row">Security Deposit: <strong>₹{room ? (room.security_deposit || 0) : '0'}</strong></span>
        </div>
      </section>

      {/* 2. Current Rent Information */}
      <section className="room-section">
        <div className="section-header-row">
          <h2 className="section-heading-clean">2. Current Rent Information</h2>
          {rent && rent.status === 'Due' && (
            <button className="btn btn-primary" onClick={() => openMarkPaidModal(rent)}>
              Mark as Paid
            </button>
          )}
        </div>

        {rent ? (
          <div>
            <div className="detail-grid">
              <span className="detail-row">Month: <strong>{rent.month}</strong></span>
              <span className="detail-row">Monthly Rent: <strong>₹{rent.rent_amount}</strong></span>
              <span className="detail-row">Paid Amount: <strong>₹{rent.paid_amount}</strong></span>
              <span className="detail-row">Remaining Amount: <strong>₹{rent.remaining_amount}</strong></span>
              <span className="detail-row">
                Status:{' '}
                <span className={`status-tag ${rent.status === 'Paid' ? 'status-paid' : 'status-due'}`}>
                  {rent.status}
                </span>
              </span>
              {rent.status === 'Paid' && rent.payment_date && (
                <span className="detail-row">
                  Payment Date: <strong>{rent.payment_date.substring(0, 10)}</strong>
                </span>
              )}
            </div>

            {rent.status === 'Due' && (
              <div className="actions-row">
                <button className="btn btn-primary" onClick={() => openMarkPaidModal(rent)}>
                  Mark as Paid
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="detail-row">Loading current month rent details...</p>
        )}
      </section>

      {/* 3. Tenant Information */}
      <section className="room-section">
        <div className="section-header-row">
          <h2 className="section-heading-clean">3. Tenant Information</h2>
          <button className="btn btn-primary" onClick={openAddTenantModal}>
            + Add Tenant
          </button>
        </div>
        <div>
          {tenants.length > 0 ? (
            <div className="table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Tenant Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Joining Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.name}</strong></td>
                      <td>{t.phone || 'N/A'}</td>
                      <td>{t.email || 'N/A'}</td>
                      <td>{t.joining_date ? t.joining_date.substring(0, 10) : 'N/A'}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-secondary" onClick={() => openEditTenantModal(t)}>
                            Edit
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDeleteTenant(t)}>
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div>
              <p className="detail-row">No tenants assigned to this room yet.</p>
              <div className="actions-row">
                <button className="btn btn-primary" onClick={openAddTenantModal}>
                  + Add Tenant
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Payment History */}
      <section className="room-section">
        <div className="section-header-row">
          <h2 className="section-heading-clean">4. Payment History</h2>
        </div>
        <div className="table-container">
          {rentHistory && rentHistory.length > 0 ? (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Payment Date</th>
                  <th>Rent Amount</th>
                  <th>Paid Amount</th>
                  <th>Remaining Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rentHistory.map((row) => (
                  <tr key={row.id}>
                    <td><strong>{row.month}</strong></td>
                    <td>{row.payment_date ? row.payment_date.substring(0, 10) : '—'}</td>
                    <td>₹{row.rent_amount}</td>
                    <td>
                      <strong style={{ color: row.paid_amount > 0 ? '#059669' : '#64748b' }}>
                        ₹{row.paid_amount}
                      </strong>
                    </td>
                    <td>₹{row.remaining_amount}</td>
                    <td>
                      <span className={`status-tag ${row.status === 'Paid' ? 'status-paid' : 'status-due'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="detail-row">No rent or payment history for this room yet.</p>
          )}
        </div>
      </section>

      {/* 5. Documents */}
      <section className="room-section">
        <div className="section-header-row">
          <h2 className="section-heading-clean">5. Documents</h2>
          {tenants.length > 0 && (
            <button className="btn btn-secondary" onClick={openAddDocumentModal}>
              + Add Document
            </button>
          )}
        </div>
        <div className="table-container">
          {tenants.length > 0 ? (
            <>
              {documents.length > 0 ? (
                <ul className="doc-list">
                  {documents.map((doc) => (
                    <li key={doc.id} className="doc-item">
                      <div>
                        <span className="doc-name">{doc.document_name}</span>
                        <span style={{ display: 'block', fontSize: '12px', color: '#64748b' }}>
                          Uploaded: {doc.upload_date ? doc.upload_date.substring(0, 10) : 'N/A'}
                        </span>
                      </div>
                      {doc.file_path && (
                        <a
                          href={`http://localhost:8080/${doc.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary"
                        >
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="detail-row">No documents uploaded for this tenant yet.</p>
              )}
            </>
          ) : (
            <p className="detail-row">No tenant assigned. Assign a tenant first to manage documents.</p>
          )}
        </div>
      </section>

      {/* Modal Dialogs */}
      {activeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Tenant Add/Edit Modal */}
            {(activeModal === 'tenant_add' || activeModal === 'tenant_edit') && (
              <div>
                <h3>{activeModal === 'tenant_add' ? 'Add Tenant' : 'Edit Tenant'}</h3>
                <form onSubmit={handleSaveTenant}>
                  <div className="form-group">
                    <label>Tenant Name:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={tenantForm.name}
                      onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number:</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={tenantForm.phone}
                      onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address:</label>
                    <input
                      type="email"
                      className="form-input"
                      value={tenantForm.email}
                      onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                      placeholder="e.g. rahul@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Joining Date:</label>
                    <input
                      type="date"
                      className="form-input"
                      value={tenantForm.joining_date}
                      onChange={(e) => setTenantForm({ ...tenantForm, joining_date: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {activeModal === 'tenant_add' ? 'Add Tenant' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Mark Rent as Paid Modal */}
            {activeModal === 'mark_paid' && (
              <div>
                <h3>Mark Rent as Paid ({rent ? rent.month : ''})</h3>
                <form onSubmit={handleConfirmMarkPaid}>
                  <div className="form-group">
                    <label>Rent Amount (₹):</label>
                    <input
                      type="number"
                      className="form-input"
                      value={markPaidForm.amount}
                      onChange={(e) => setMarkPaidForm({ ...markPaidForm, amount: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Date:</label>
                    <input
                      type="date"
                      className="form-input"
                      value={markPaidForm.payment_date}
                      onChange={(e) => setMarkPaidForm({ ...markPaidForm, payment_date: e.target.value })}
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Method:</label>
                    <select
                      className="form-input"
                      value={markPaidForm.payment_method}
                      onChange={(e) => setMarkPaidForm({ ...markPaidForm, payment_method: e.target.value })}
                    >
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Note (optional):</label>
                    <input
                      type="text"
                      className="form-input"
                      value={markPaidForm.note}
                      onChange={(e) => setMarkPaidForm({ ...markPaidForm, note: e.target.value })}
                      placeholder="e.g. Paid in full via UPI"
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Confirm &amp; Mark Paid
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Add Document Modal */}
            {activeModal === 'document_add' && (
              <div>
                <h3>Upload Document</h3>
                <form onSubmit={handleSaveDocument}>
                  {tenants.length > 1 && (
                    <div className="form-group">
                      <label>Select Tenant:</label>
                      <select
                        className="form-input"
                        value={documentForm.tenant_id}
                        onChange={(e) => setDocumentForm({ ...documentForm, tenant_id: e.target.value })}
                      >
                        {tenants.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Document Name:</label>
                    <input
                      type="text"
                      className="form-input"
                      value={documentForm.document_name}
                      onChange={(e) => setDocumentForm({ ...documentForm, document_name: e.target.value })}
                      placeholder="e.g. Aadhaar Card, Rent Agreement"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="form-group">
                    <label>Select File:</label>
                    <input
                      type="file"
                      className="form-input"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      onChange={(e) => setDocumentForm({ ...documentForm, file: e.target.files[0] || null })}
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Upload
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

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

export default Room;
