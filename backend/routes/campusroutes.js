const express = require('express');
const router = express.Router();
const {
  getCampuses,
  getCampusById,
  createCampus,
  updateCampus,
  deleteCampus
} = require('../controllers/campusController');

// GET /api/campuses -> Fetch all campuses
router.get('/', getCampuses);

// GET /api/campuses/:id -> Fetch single campus
router.get('/:id', getCampusById);

// POST /api/campuses -> Create a new campus
router.post('/', createCampus);

// PUT /api/campuses/:id -> Update campus
router.put('/:id', updateCampus);

// DELETE /api/campuses/:id -> Delete campus
router.delete('/:id', deleteCampus);

module.exports = router;
