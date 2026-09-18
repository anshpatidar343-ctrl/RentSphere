const db = require('../config/db');

// Get all campuses for the authenticated owner with room statistics (Total Rooms, Occupied, Available)
const getCampuses = (req, res) => {
  const ownerId = req.owner.id;

  const sql = `
    SELECT 
      c.id,
      c.owner_id,
      c.name,
      COUNT(r.id) AS totalRooms,
      COUNT(CASE WHEN r.status = 'occupied' THEN 1 END) AS occupied,
      COUNT(CASE WHEN r.id IS NOT NULL AND (r.status = 'available' OR r.status IS NULL) THEN 1 END) AS available
    FROM campuses c
    LEFT JOIN rooms r ON c.id = r.campus_id
    WHERE c.owner_id = ?
    GROUP BY c.id
    ORDER BY c.id ASC
  `;

  db.query(sql, [ownerId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
};

// Get single campus by ID with room statistics (with owner isolation)
const getCampusById = (req, res) => {
  const { id } = req.params;
  const ownerId = req.owner.id;

  const sql = `
    SELECT 
      c.id,
      c.owner_id,
      c.name,
      COUNT(r.id) AS totalRooms,
      COUNT(CASE WHEN r.status = 'occupied' THEN 1 END) AS occupied,
      COUNT(CASE WHEN r.id IS NOT NULL AND (r.status = 'available' OR r.status IS NULL) THEN 1 END) AS available
    FROM campuses c
    LEFT JOIN rooms r ON c.id = r.campus_id
    WHERE c.id = ? AND c.owner_id = ?
    GROUP BY c.id
  `;

  db.query(sql, [id, ownerId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Campus not found or access denied' });
    }
    res.json(results[0]);
  });
};

// Create a new campus with validation (strictly linked to authenticated owner)
const createCampus = (req, res) => {
  const ownerId = req.owner.id;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Campus name is required' });
  }

  const trimmedName = String(name).trim();
  if (trimmedName === '') {
    return res.status(400).json({ message: 'Campus name cannot be empty' });
  }

  // Check for duplicate campus name under this owner
  const checkDuplicateSql = 'SELECT id FROM campuses WHERE owner_id = ? AND name = ?';

  db.query(checkDuplicateSql, [ownerId, trimmedName], (checkErr, checkResults) => {
    if (checkErr) {
      return res.status(500).json({ error: checkErr.message });
    }

    if (checkResults.length > 0) {
      return res.status(400).json({ message: `Campus "${trimmedName}" already exists` });
    }

    const sql = 'INSERT INTO campuses (owner_id, name) VALUES (?, ?)';

    db.query(sql, [ownerId, trimmedName], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.status(201).json({
        id: result.insertId,
        owner_id: ownerId,
        name: trimmedName
      });
    });
  });
};

// Update a campus with ownership validation
const updateCampus = (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const ownerId = req.owner.id;

  if (!name) {
    return res.status(400).json({ message: 'Campus name is required' });
  }

  const trimmedName = String(name).trim();
  if (trimmedName === '') {
    return res.status(400).json({ message: 'Campus name cannot be empty' });
  }

  // 1. Verify campus exists and belongs to the authenticated owner
  db.query('SELECT id FROM campuses WHERE id = ? AND owner_id = ?', [id, ownerId], (fetchErr, campusResults) => {
    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message });
    }
    if (campusResults.length === 0) {
      return res.status(404).json({ message: 'Campus not found or access denied' });
    }

    // 2. Check duplicate name under same owner (excluding current campus)
    const checkDuplicateSql = 'SELECT id FROM campuses WHERE owner_id = ? AND name = ? AND id != ?';

    db.query(checkDuplicateSql, [ownerId, trimmedName, id], (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({ error: checkErr.message });
      }

      if (checkResults.length > 0) {
        return res.status(400).json({ message: `Another campus with name "${trimmedName}" already exists` });
      }

      const sql = 'UPDATE campuses SET name = ? WHERE id = ? AND owner_id = ?';

      db.query(sql, [trimmedName, id, ownerId], (err, result) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({ message: 'Campus updated successfully', id, name: trimmedName });
      });
    });
  });
};

// Delete a campus with ownership validation
const deleteCampus = (req, res) => {
  const { id } = req.params;
  const ownerId = req.owner.id;

  // Verify campus exists and belongs to the authenticated owner
  db.query('SELECT id FROM campuses WHERE id = ? AND owner_id = ?', [id, ownerId], (fetchErr, campusResults) => {
    if (fetchErr) {
      return res.status(500).json({ error: fetchErr.message });
    }
    if (campusResults.length === 0) {
      return res.status(404).json({ message: 'Campus not found or access denied' });
    }

    const sql = 'DELETE FROM campuses WHERE id = ? AND owner_id = ?';

    db.query(sql, [id, ownerId], (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Campus deleted successfully', id });
    });
  });
};

module.exports = {
  getCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus
};
