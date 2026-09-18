const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// 1. Get all documents for a specific tenant (with ownership check)
const getDocumentsByTenant = (req, res) => {
  const { tenantId } = req.params;
  const ownerId = req.owner.id;

  // Verify the tenant belongs to the authenticated owner's room chain
  const verifyTenantSql = `
    SELECT t.id FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN campuses c ON r.campus_id = c.id
    WHERE t.id = ? AND c.owner_id = ?
  `;

  db.query(verifyTenantSql, [tenantId, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      console.error('Error verifying tenant ownership:', verifyErr);
      return res.status(500).json({ error: 'Database error verifying tenant ownership' });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Tenant not found or does not belong to you.' });
    }

    const sql = 'SELECT * FROM documents WHERE tenant_id = ? ORDER BY upload_date DESC';

    db.query(sql, [tenantId], (err, results) => {
      if (err) {
        console.error('Error fetching documents:', err);
        return res.status(500).json({ error: 'Database error fetching documents' });
      }
      res.status(200).json(results);
    });
  });
};

// 2. Add a new document record for a tenant (with ownership check and file upload support)
const createDocument = (req, res) => {
  const { tenant_id, document_name } = req.body;
  const ownerId = req.owner.id;

  if (!tenant_id || !document_name) {
    return res.status(400).json({ error: 'tenant_id and document_name are required' });
  }

  // Verify the tenant belongs to the authenticated owner's room chain
  const verifyTenantSql = `
    SELECT t.id FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN campuses c ON r.campus_id = c.id
    WHERE t.id = ? AND c.owner_id = ?
  `;

  db.query(verifyTenantSql, [tenant_id, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      console.error('Error verifying tenant ownership:', verifyErr);
      return res.status(500).json({ error: 'Database error verifying tenant ownership' });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Tenant not found or does not belong to you.' });
    }

    // Use uploaded file path or fallback to body/default
    const filePath = req.file ? `uploads/${req.file.filename}` : (req.body.file_path || 'uploads/default.pdf');
    const sql = 'INSERT INTO documents (tenant_id, document_name, file_path) VALUES (?, ?, ?)';

    db.query(sql, [tenant_id, document_name, filePath], (err, result) => {
      if (err) {
        console.error('Error adding document:', err);
        return res.status(500).json({ error: 'Database error adding document' });
      }

      res.status(201).json({
        message: 'Document uploaded successfully',
        documentId: result.insertId,
        file_path: filePath
      });
    });
  });
};

module.exports = {
  upload,
  getDocumentsByTenant,
  createDocument
};
