const db = require('../config/db');

// Get payment history for a specific room (with ownership check)
const getPaymentsByRoom = (req, res) => {
  const { roomId } = req.params;
  const ownerId = req.owner.id;

  // Verify the room belongs to the authenticated owner
  const verifyRoomSql = `
    SELECT r.id FROM rooms r
    JOIN campuses c ON r.campus_id = c.id
    WHERE r.id = ? AND c.owner_id = ?
  `;

  db.query(verifyRoomSql, [roomId, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      return res.status(500).json({ error: verifyErr.message });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Room not found or does not belong to you.' });
    }

    const sql = `
      SELECT 
        p.id,
        p.rent_id,
        p.amount,
        p.payment_date,
        p.payment_method,
        p.note,
        r.month,
        r.due_date,
        r.rent_amount
      FROM payments p
      JOIN rent r ON p.rent_id = r.id
      WHERE r.room_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `;

    db.query(sql, [roomId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results);
    });
  });
};

// Record a new payment against a rent bill with validation (with ownership check)
const createPayment = (req, res) => {
  const { rent_id, amount, payment_date, payment_method, note } = req.body;
  const ownerId = req.owner.id;

  if (!rent_id || amount === undefined || !payment_date) {
    return res.status(400).json({ message: 'rent_id, amount, and payment_date are required' });
  }

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ message: 'Payment amount must be a positive number greater than 0' });
  }

  // 1. Verify rent bill exists and belongs to the authenticated owner's room
  const checkRentSql = `
    SELECT 
      r.id,
      r.rent_amount,
      COALESCE(SUM(p.amount), 0) AS paid_amount
    FROM rent r
    JOIN rooms rm ON r.room_id = rm.id
    JOIN campuses c ON rm.campus_id = c.id
    LEFT JOIN payments p ON r.id = p.rent_id
    WHERE r.id = ? AND c.owner_id = ?
    GROUP BY r.id
  `;

  db.query(checkRentSql, [rent_id, ownerId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Rent bill not found or access denied' });
    }

    const rent = results[0];
    const rentAmount = parseFloat(rent.rent_amount);
    const paidAmount = parseFloat(rent.paid_amount);
    const remainingAmount = Math.max(0, rentAmount - paidAmount);

    if (remainingAmount <= 0) {
      return res.status(400).json({ message: 'This rent bill is already paid in full' });
    }

    if (numAmount > remainingAmount) {
      return res.status(400).json({
        message: `Payment amount (₹${numAmount}) exceeds the remaining balance (₹${remainingAmount})`
      });
    }

    // 2. Insert payment record
    const sql = 'INSERT INTO payments (rent_id, amount, payment_date, payment_method, note) VALUES (?, ?, ?, ?, ?)';

    db.query(
      sql,
      [rent_id, numAmount, payment_date, payment_method || 'Cash', note || ''],
      (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        res.status(201).json({
          id: result.insertId,
          rent_id,
          amount: numAmount,
          payment_date,
          payment_method: payment_method || 'Cash',
          note: note || ''
        });
      }
    );
  });
};

module.exports = {
  getPaymentsByRoom,
  createPayment
};
