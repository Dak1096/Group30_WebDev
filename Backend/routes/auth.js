const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Login needs no token, there is no token yet at this point
router.post('/login', authController.login);

// Current account, needs a token
router.get('/me', authMiddleware, authController.me);

module.exports = router;
