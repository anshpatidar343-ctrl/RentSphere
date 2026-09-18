const express = require('express');
const router = express.Router();
const {
  getCurrentRentByRoom,
  getRentHistoryByRoom,
  createRentRecord
} = require('../controllers/rentController');

// GET /api/rent/room/:roomId -> Fetch current (latest) rent bill for a specific room
router.get('/room/:roomId', getCurrentRentByRoom);

// GET /api/rent/room/:roomId/history -> Fetch full rent bills history for a room
router.get('/room/:roomId/history', getRentHistoryByRoom);

// POST /api/rent -> Create a new monthly rent bill for a room
router.post('/', createRentRecord);

module.exports = router;
