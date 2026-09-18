const express = require('express');
const router = express.Router();
const {
  upload,
  getDocumentsByTenant,
  createDocument
} = require('../controllers/documentController');

// GET /api/documents/tenant/:tenantId -> Fetch all documents for a specific tenant
router.get('/tenant/:tenantId', getDocumentsByTenant);

// POST /api/documents -> Upload and record a new document for a tenant
router.post('/', upload.single('file'), createDocument);

module.exports = router;
