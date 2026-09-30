const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware);     // every route below needs a valid token

// Read only, any signed in role
router.get('/classes', studentController.getClasses);
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);

// Write, admin only
router.post('/', requireRole('admin'), studentController.addStudent);
router.put('/:id', requireRole('admin'), studentController.updateStudent);
router.delete('/:id', requireRole('admin'), studentController.deleteStudent);

module.exports = router;
