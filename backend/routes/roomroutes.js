const express = require('express');
const router = express.Router();
const {
  getRoomsByCampus,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAllRoomsForOwner
} = require('../controllers/roomController');

// GET /api/rooms -> Fetch all rooms across all campuses for the logged-in owner
router.get('/', getAllRoomsForOwner);

// GET /api/rooms/campus/:campusId -> Fetch all rooms in a campus
router.get('/campus/:campusId', getRoomsByCampus);

// GET /api/rooms/:id -> Fetch single room by ID
router.get('/:id', getRoomById);

// POST /api/rooms -> Create a new room
router.post('/', createRoom);

// PUT /api/rooms/:id -> Update an existing room
router.put('/:id', updateRoom);

// DELETE /api/rooms/:id -> Delete a room
router.delete('/:id', deleteRoom);

module.exports = router;
