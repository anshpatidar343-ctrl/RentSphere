const express = require('express');
const router = express.Router();
const {
  getTenantByRoom,
  createTenant,
  updateTenant,
  deleteTenant,
  getAllTenantsForOwner
} = require('../controllers/tenantController');

// GET /api/tenants -> Fetch all tenants across all rooms for the logged-in owner
router.get('/', getAllTenantsForOwner);

// GET /api/tenants/room/:roomId -> Fetch tenant for a specific room
router.get('/room/:roomId', getTenantByRoom);

// POST /api/tenants -> Add a tenant to a room
router.post('/', createTenant);

// PUT /api/tenants/:id -> Update an existing tenant
router.put('/:id', updateTenant);

// DELETE /api/tenants/:id -> Delete/unassign a tenant
router.delete('/:id', deleteTenant);

module.exports = router;
