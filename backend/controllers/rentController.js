const db = require('../config/db');

// Helper to get standard current month string, e.g. "September 2026"
const getCurrentMonthString = () => {
  const now = new Date();
  return now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
};

// Get current month rent record for a room (auto-creates for current month if missing, strictly isolated per room)
const getCurrentRentByRoom = (req, res) => {
  const { roomId } = req.params;
  const ownerId = req.owner.id;
  const currentMonthStr = getCurrentMonthString();
  const currentMonthSimple = new Date().toLocaleString('en-US', { month: 'long' });

  // 1. Verify the room belongs to the authenticated owner
  const verifyRoomSql = `
    SELECT r.id, r.monthly_rent FROM rooms r
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

    const roomMonthlyRent = parseFloat(verifyResults[0].monthly_rent) || 0;

    // 2. Look for existing rent record for this specific room for the current month
    const findSql = `
      SELECT 
        r.id,
        r.room_id,
        r.month,
        r.due_date,
        r.rent_amount,
        COALESCE(SUM(p.amount), 0) AS paid_amount,
        MAX(p.payment_date) AS payment_date
      FROM rent r
      LEFT JOIN payments p ON r.id = p.rent_id
      WHERE r.room_id = ? AND (r.month = ? OR r.month = ? OR r.month LIKE ?)
      GROUP BY r.id
      ORDER BY r.id DESC
      LIMIT 1
    `;

    db.query(findSql, [roomId, currentMonthStr, currentMonthSimple, `%${currentMonthSimple}%`], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (results.length > 0) {
        const rent = results[0];
        let rentAmount = parseFloat(rent.rent_amount);
        const paidAmount = parseFloat(rent.paid_amount);

        // If unpaid, sync rent amount if room's monthly_rent was updated
        if (paidAmount === 0 && roomMonthlyRent !== rentAmount) {
          db.query('UPDATE rent SET rent_amount = ? WHERE id = ?', [roomMonthlyRent, rent.id]);
          rentAmount = roomMonthlyRent;
        }

        const remainingAmount = Math.max(0, rentAmount - paidAmount);
        const status = paidAmount >= rentAmount ? 'Paid' : 'Due';

        return res.json({
          id: rent.id,
          room_id: rent.room_id,
          month: rent.month,
          due_date: rent.due_date,
          rent_amount: rentAmount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          status,
          payment_date: rent.payment_date || null
        });
      }

      // 3. No record for current month — auto-create it
      const today = new Date().toISOString().substring(0, 10);
      const insertSql = 'INSERT INTO rent (room_id, month, due_date, rent_amount) VALUES (?, ?, ?, ?)';

      db.query(insertSql, [roomId, currentMonthStr, today, roomMonthlyRent], (insertErr, insertResult) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        res.json({
          id: insertResult.insertId,
          room_id: parseInt(roomId),
          month: currentMonthStr,
          due_date: today,
          rent_amount: roomMonthlyRent,
          paid_amount: 0,
          remaining_amount: roomMonthlyRent,
          status: 'Due',
          payment_date: null
        });
      });
    });
  });
};

// Get all rent records / history for a room (with ownership check)
const getRentHistoryByRoom = (req, res) => {
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
        r.id,
        r.room_id,
        r.month,
        r.due_date,
        r.rent_amount,
        COALESCE(SUM(p.amount), 0) AS paid_amount,
        MAX(p.payment_date) AS payment_date
      FROM rent r
      LEFT JOIN payments p ON r.id = p.rent_id
      WHERE r.room_id = ?
      GROUP BY r.id
      ORDER BY r.id DESC
    `;

    db.query(sql, [roomId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const rentHistory = results.map((rent) => {
        const rentAmount = parseFloat(rent.rent_amount);
        const paidAmount = parseFloat(rent.paid_amount);
        const remainingAmount = Math.max(0, rentAmount - paidAmount);
        const status = paidAmount >= rentAmount ? 'Paid' : 'Due';

        return {
          id: rent.id,
          room_id: rent.room_id,
          month: rent.month,
          due_date: rent.due_date,
          rent_amount: rentAmount,
          paid_amount: paidAmount,
          remaining_amount: remainingAmount,
          status,
          payment_date: rent.payment_date || null
        };
      });

      res.json(rentHistory);
    });
  });
};

// Create a new monthly rent bill for a room (with ownership check)
const createRentRecord = (req, res) => {
  const { room_id, month, due_date, rent_amount } = req.body;
  const ownerId = req.owner.id;

  if (!room_id || !month || !due_date || !rent_amount) {
    return res.status(400).json({ message: 'room_id, month, due_date, and rent_amount are required' });
  }

  // Verify the room belongs to the authenticated owner
  const verifyRoomSql = `
    SELECT r.id FROM rooms r
    JOIN campuses c ON r.campus_id = c.id
    WHERE r.id = ? AND c.owner_id = ?
  `;

  db.query(verifyRoomSql, [room_id, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      return res.status(500).json({ error: verifyErr.message });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Room not found or does not belong to you.' });
    }

    const sql = 'INSERT INTO rent (room_id, month, due_date, rent_amount) VALUES (?, ?, ?, ?)';

    db.query(sql, [room_id, month, due_date, rent_amount], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: result.insertId,
        room_id: parseInt(room_id),
        month,
        due_date,
        rent_amount: parseFloat(rent_amount),
        paid_amount: 0,
        remaining_amount: parseFloat(rent_amount),
        status: 'Due'
      });
    });
  });
};

module.exports = {
  getCurrentRentByRoom,
  getRentHistoryByRoom,
  createRentRecord
};
