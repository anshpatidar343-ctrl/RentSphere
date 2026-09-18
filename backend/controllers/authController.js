const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

// 1. Owner Signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const [existing] = await db.promise().query('SELECT id FROM owners WHERE email = ?', [trimmedEmail]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email is already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert new owner
    const [result] = await db.promise().query(
      'INSERT INTO owners (name, email, password) VALUES (?, ?, ?)',
      [name.trim(), trimmedEmail, hashedPassword]
    );

    const ownerId = result.insertId;

    // Generate JWT token
    const token = jwt.sign({ id: ownerId, email: trimmedEmail }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Owner registered successfully',
      token,
      owner: { id: ownerId, name: name.trim(), email: trimmedEmail }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
};

// 2. Owner Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find owner by email
    const [owners] = await db.promise().query('SELECT * FROM owners WHERE email = ?', [trimmedEmail]);
    if (owners.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const owner = owners[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: owner.id, email: owner.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      owner: { id: owner.id, name: owner.name, email: owner.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

// 3. Get Current Owner Profile
exports.getProfile = async (req, res) => {
  try {
    const [owners] = await db.promise().query('SELECT id, name, email FROM owners WHERE id = ?', [req.owner.id]);
    if (owners.length === 0) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    res.json(owners[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
