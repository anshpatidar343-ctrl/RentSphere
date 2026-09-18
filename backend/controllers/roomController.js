const db = require('../config/db');

// Get all rooms for a specific campus (with tenant names and current rent status, strictly isolated)
const getRoomsByCampus = (req, res) => {
  const { campusId } = req.params;
  const ownerId = req.owner?.id;

  let sql = `
    SELECT 
      r.id,
      r.campus_id,
      r.room_number,
      r.monthly_rent,
      r.security_deposit,
      r.status,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.id SEPARATOR ', ') AS tenant_name
    FROM rooms r
    JOIN campuses c ON r.campus_id = c.id
    LEFT JOIN tenants t ON r.id = t.room_id
    WHERE r.campus_id = ?
  `;
  const params = [campusId];

  if (ownerId) {
    sql += ' AND c.owner_id = ?';
    params.push(ownerId);
  }

  sql += ' GROUP BY r.id ORDER BY r.id ASC';

  db.query(sql, params, (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rooms.length === 0) {
      return res.json([]);
    }

    const roomIds = rooms.map((r) => r.id);

    // Fetch latest rent and payments for these rooms
    const rentSql = `
      SELECT 
        r.room_id,
        r.id AS rent_id,
        r.rent_amount,
        COALESCE(SUM(p.amount), 0) AS paid_amount
      FROM rent r
      LEFT JOIN payments p ON r.id = p.rent_id
      WHERE r.room_id IN (?)
      GROUP BY r.id, r.room_id, r.rent_amount
      ORDER BY r.id DESC
    `;

    db.query(rentSql, [roomIds], (rentErr, rentRows) => {
      if (rentErr) {
        return res.json(rooms.map((r) => ({ ...r, current_rent_status: null })));
      }

      // Map each room to its latest rent bill status
      const latestRentMap = {};
      for (const row of rentRows) {
        if (!latestRentMap[row.room_id]) {
          const rentAmount = parseFloat(row.rent_amount);
          const paidAmount = parseFloat(row.paid_amount);
          latestRentMap[row.room_id] = paidAmount >= rentAmount ? 'Paid' : 'Due';
        }
      }

      const enrichedRooms = rooms.map((room) => ({
        ...room,
        current_rent_status: latestRentMap[room.id] || null
      }));

      res.json(enrichedRooms);
    });
  });
};

// Get single room by ID
const getRoomById = (req, res) => {
  const { id } = req.params;
  const ownerId = req.owner?.id;

  let sql = 'SELECT r.* FROM rooms r JOIN campuses c ON r.campus_id = c.id WHERE r.id = ?';
  const params = [id];

  if (ownerId) {
    sql += ' AND c.owner_id = ?';
    params.push(ownerId);
  }

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }
    res.json(results[0]);
  });
};

// Create a new room in a campus with validation
const createRoom = (req, res) => {
  const { campus_id, room_number, monthly_rent, security_deposit } = req.body;
  const ownerId = req.owner?.id;

  if (!campus_id || !room_number || monthly_rent === undefined) {
    return res.status(400).json({ message: 'campus_id, room_number, and monthly_rent are required' });
  }

  const trimmedRoomNumber = String(room_number).trim();
  const numRent = Number(monthly_rent);
  const numDeposit = Number(security_deposit) || 0;

  if (trimmedRoomNumber === '') {
    return res.status(400).json({ message: 'Room number cannot be empty' });
  }

  if (isNaN(numRent) || numRent <= 0) {
    return res.status(400).json({ message: 'Monthly rent must be a positive number greater than 0' });
  }

  if (isNaN(numDeposit) || numDeposit < 0) {
    return res.status(400).json({ message: 'Security deposit must be a non-negative number' });
  }

  // 1. Verify campus ownership
  let campusSql = 'SELECT id FROM campuses WHERE id = ?';
  const campusParams = [campus_id];
  if (ownerId) {
    campusSql += ' AND owner_id = ?';
    campusParams.push(ownerId);
  }

  db.query(campusSql, campusParams, (cErr, cResults) => {
    if (cErr) {
      return res.status(500).json({ error: cErr.message });
    }
    if (cResults.length === 0) {
      return res.status(403).json({ message: 'Campus not found or access denied' });
    }

    // 2. Check for duplicate room number in this campus
    const checkDuplicateSql = 'SELECT id FROM rooms WHERE campus_id = ? AND room_number = ?';

    db.query(checkDuplicateSql, [campus_id, trimmedRoomNumber], (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({ error: checkErr.message });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ message: `Room "${trimmedRoomNumber}" already exists in this campus` });
      }

      const sql = 'INSERT INTO rooms (campus_id, room_number, monthly_rent, security_deposit, status) VALUES (?, ?, ?, ?, ?)';

      db.query(sql, [campus_id, trimmedRoomNumber, numRent, numDeposit, 'available'], (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          id: result.insertId,
          campus_id: parseInt(campus_id),
          room_number: trimmedRoomNumber,
          monthly_rent: numRent,
          security_deposit: numDeposit,
          status: 'available'
        });
      });
    });
  });
};

// Update an existing room with validation (isolated strictly to target room ID)
const updateRoom = (req, res) => {
  const { id } = req.params;
  const { room_number, monthly_rent, security_deposit } = req.body;
  const ownerId = req.owner?.id;

  if (!room_number || monthly_rent === undefined) {
    return res.status(400).json({ message: 'room_number and monthly_rent are required' });
  }

  const trimmedRoomNumber = String(room_number).trim();
  const numRent = Number(monthly_rent);
  const numDeposit = Number(security_deposit) || 0;

  if (trimmedRoomNumber === '') {
    return res.status(400).json({ message: 'Room number cannot be empty' });
  }

  if (isNaN(numRent) || numRent <= 0) {
    return res.status(400).json({ message: 'Monthly rent must be a positive number greater than 0' });
  }

  if (isNaN(numDeposit) || numDeposit < 0) {
    return res.status(400).json({ message: 'Security deposit must be a non-negative number' });
  }

  // 1. Get campus_id and check ownership
  let checkSql = 'SELECT r.id, r.campus_id, c.owner_id FROM rooms r JOIN campuses c ON r.campus_id = c.id WHERE r.id = ?';
  const checkParams = [id];
  if (ownerId) {
    checkSql += ' AND c.owner_id = ?';
    checkParams.push(ownerId);
  }

  db.query(checkSql, checkParams, (fetchErr, roomResults) => {
    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message });
    }
    if (roomResults.length === 0) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }

    const campusId = roomResults[0].campus_id;

    // 2. Check for duplicate room number in the same campus (excluding current room)
    const checkDuplicateSql = 'SELECT id FROM rooms WHERE campus_id = ? AND room_number = ? AND id != ?';

    db.query(checkDuplicateSql, [campusId, trimmedRoomNumber, id], (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({ error: checkErr.message });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ message: `Another room with number "${trimmedRoomNumber}" already exists in this campus` });
      }

      // Update THIS specific room only
      const sql = 'UPDATE rooms SET room_number = ?, monthly_rent = ?, security_deposit = ? WHERE id = ?';

      db.query(sql, [trimmedRoomNumber, numRent, numDeposit, id], (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        // Also update any unpaid (0 payments) rent bill for this specific room
        const updateUnpaidRentSql = `
          UPDATE rent 
          SET rent_amount = ? 
          WHERE room_id = ? 
            AND id NOT IN (SELECT DISTINCT rent_id FROM payments)
        `;
        db.query(updateUnpaidRentSql, [numRent, id], () => {
          res.json({
            message: 'Room updated successfully',
            id: parseInt(id),
            room_number: trimmedRoomNumber,
            monthly_rent: numRent,
            security_deposit: numDeposit
          });
        });
      });
    });
  });
};

// Delete a room (with safety check for active tenant)
const deleteRoom = (req, res) => {
  const { id } = req.params;
  const ownerId = req.owner?.id;

  // 1. Verify room and ownership
  let checkRoomSql = 'SELECT r.id FROM rooms r JOIN campuses c ON r.campus_id = c.id WHERE r.id = ?';
  const checkParams = [id];
  if (ownerId) {
    checkRoomSql += ' AND c.owner_id = ?';
    checkParams.push(ownerId);
  }

  db.query(checkRoomSql, checkParams, (rErr, rResults) => {
    if (rErr) {
      return res.status(500).json({ error: rErr.message });
    }
    if (rResults.length === 0) {
      return res.status(404).json({ message: 'Room not found or access denied' });
    }

    // 2. Check if an active tenant is assigned to this room
    const checkTenantSql = 'SELECT id FROM tenants WHERE room_id = ?';

    db.query(checkTenantSql, [id], (err, tenantResults) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (tenantResults.length > 0) {
        return res.status(400).json({
          message: 'Cannot delete room with an active tenant. Please unassign or remove the tenant first.'
        });
      }

      // 3. Delete only this specific room
      const deleteSql = 'DELETE FROM rooms WHERE id = ?';

      db.query(deleteSql, [id], (deleteErr, result) => {
        if (deleteErr) {
          return res.status(500).json({ error: deleteErr.message });
        }

        res.json({ message: 'Room deleted successfully', id: parseInt(id) });
      });
    });
  });
};

// Get all rooms across all campuses for the logged-in owner
const getAllRoomsForOwner = (req, res) => {
  const ownerId = req.owner?.id;

  let sql = `
    SELECT 
      r.id, 
      r.campus_id,
      r.room_number, 
      r.monthly_rent, 
      r.security_deposit,
      r.status,
      c.name AS campus_name,
      GROUP_CONCAT(DISTINCT t.name ORDER BY t.id SEPARATOR ', ') AS tenant_name
    FROM rooms r
    JOIN campuses c ON r.campus_id = c.id
    LEFT JOIN tenants t ON r.id = t.room_id
  `;
  const params = [];

  if (ownerId) {
    sql += ' WHERE c.owner_id = ?';
    params.push(ownerId);
  }

  sql += ' GROUP BY r.id, c.id ORDER BY c.name ASC, r.room_number ASC';

  db.query(sql, params, (err, rooms) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rooms);
  });
};

module.exports = {
  getRoomsByCampus,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getAllRoomsForOwner
};
