const express = require('express');
const router = express.Router();
const { getPaymentsByRoom, createPayment } = require('../controllers/paymentController');

// GET /api/payments/room/:roomId -> Fetch payment history for a specific room
router.get('/room/:roomId', getPaymentsByRoom);

// POST /api/payments -> Record a new payment against a rent bill
router.post('/', createPayment);

module.exports = router;
