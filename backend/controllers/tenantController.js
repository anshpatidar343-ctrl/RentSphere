const db = require('../config/db');

// Get all tenants for a specific room (with ownership check via room -> campus -> owner)
const getTenantByRoom = (req, res) => {
  const { roomId } = req.params;
  const ownerId = req.owner.id;

  // Verify the room belongs to the authenticated owner before returning tenants
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

    const sql = 'SELECT * FROM tenants WHERE room_id = ? ORDER BY id ASC';

    db.query(sql, [roomId], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(results || []);
    });
  });
};

// Add a tenant to a room (with ownership check: room must belong to authenticated owner)
const createTenant = (req, res) => {
  const { room_id, name, phone, email, joining_date } = req.body;
  const ownerId = req.owner.id;

  if (!room_id || !name) {
    return res.status(400).json({ message: 'room_id and name are required' });
  }

  const trimmedName = String(name).trim();
  if (trimmedName === '') {
    return res.status(400).json({ message: 'Tenant name cannot be empty' });
  }

  // Verify the target room belongs to the authenticated owner
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

    const sql = 'INSERT INTO tenants (room_id, name, phone, email, joining_date) VALUES (?, ?, ?, ?, ?)';

    db.query(
      sql,
      [
        room_id,
        trimmedName,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
        joining_date || null
      ],
      (insertErr, result) => {
        if (insertErr) {
          return res.status(500).json({ error: insertErr.message });
        }

        // Update room status to occupied
        db.query('UPDATE rooms SET status = ? WHERE id = ?', ['occupied', room_id]);

        res.status(201).json({
          id: result.insertId,
          room_id,
          name: trimmedName,
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim() : null,
          joining_date: joining_date || null
        });
      }
    );
  });
};

// Update an existing tenant (with ownership check: tenant's room must belong to authenticated owner)
const updateTenant = (req, res) => {
  const { id } = req.params;
  const { name, phone, email, joining_date } = req.body;
  const ownerId = req.owner.id;

  if (!name) {
    return res.status(400).json({ message: 'Tenant name is required' });
  }

  const trimmedName = String(name).trim();
  if (trimmedName === '') {
    return res.status(400).json({ message: 'Tenant name cannot be empty' });
  }

  // Verify the tenant exists and its room belongs to the authenticated owner
  const verifyTenantSql = `
    SELECT t.id FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN campuses c ON r.campus_id = c.id
    WHERE t.id = ? AND c.owner_id = ?
  `;

  db.query(verifyTenantSql, [id, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      return res.status(500).json({ error: verifyErr.message });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Tenant not found or does not belong to you.' });
    }

    const sql = 'UPDATE tenants SET name = ?, phone = ?, email = ?, joining_date = ? WHERE id = ?';

    db.query(
      sql,
      [
        trimmedName,
        phone !== undefined && phone !== null ? String(phone).trim() : null,
        email !== undefined && email !== null ? String(email).trim() : null,
        joining_date || null,
        id
      ],
      (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ message: 'Tenant not found' });
        }

        res.json({
          message: 'Tenant updated successfully',
          id,
          name: trimmedName,
          phone: phone ? String(phone).trim() : null,
          email: email ? String(email).trim() : null,
          joining_date: joining_date || null
        });
      }
    );
  });
};

// Delete a tenant and update room status if no tenants remain
const deleteTenant = (req, res) => {
  const { id } = req.params;
  const ownerId = req.owner.id;

  // 1. Verify tenant exists and belongs to the authenticated owner's room chain
  const verifyTenantSql = `
    SELECT t.id, t.room_id FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN campuses c ON r.campus_id = c.id
    WHERE t.id = ? AND c.owner_id = ?
  `;

  db.query(verifyTenantSql, [id, ownerId], (verifyErr, verifyResults) => {
    if (verifyErr) {
      return res.status(500).json({ error: verifyErr.message });
    }
    if (verifyResults.length === 0) {
      return res.status(403).json({ message: 'Access denied. Tenant not found or does not belong to you.' });
    }

    const roomId = verifyResults[0].room_id;

    // 2. Delete the tenant record
    const deleteSql = 'DELETE FROM tenants WHERE id = ?';

    db.query(deleteSql, [id], (delErr) => {
      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }

      // 3. Check if any remaining tenants exist for this room
      if (roomId) {
        db.query('SELECT COUNT(*) AS count FROM tenants WHERE room_id = ?', [roomId], (countErr, countResults) => {
          if (!countErr && countResults && countResults[0].count === 0) {
            db.query('UPDATE rooms SET status = ? WHERE id = ?', ['available', roomId]);
          }
        });
      }

      res.json({ message: 'Tenant removed successfully', id, roomId });
    });
  });
};

// Get all tenants across all rooms for the logged-in owner
const getAllTenantsForOwner = (req, res) => {
  const ownerId = req.owner?.id;

  let sql = `
    SELECT 
      t.id,
      t.room_id,
      t.name,
      t.phone,
      t.email,
      t.joining_date,
      r.room_number,
      c.id AS campus_id,
      c.name AS campus_name
    FROM tenants t
    JOIN rooms r ON t.room_id = r.id
    JOIN campuses c ON r.campus_id = c.id
  `;
  const params = [];

  if (ownerId) {
    sql += ' WHERE c.owner_id = ?';
    params.push(ownerId);
  }

  sql += ' ORDER BY c.name ASC, r.room_number ASC, t.name ASC';

  db.query(sql, params, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results || []);
  });
};

module.exports = {
  getTenantByRoom,
  createTenant,
  updateTenant,
  deleteTenant,
  getAllTenantsForOwner
};
