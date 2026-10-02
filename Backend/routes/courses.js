const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Read only, any signed in role
router.get('/', courseController.getCourses);
router.get('/:id', courseController.getCourseById);

// Write, admin only
router.post('/', requireRole('admin'), courseController.addCourse);
router.put('/:id', requireRole('admin'), courseController.updateCourse);
router.delete('/:id', requireRole('admin'), courseController.deleteCourse);

module.exports = router;
