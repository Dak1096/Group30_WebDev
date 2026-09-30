const express = require('express');
const router = express.Router();
const gradeController = require('../controllers/gradeController');
const authMiddleware = require('../middleware/authMiddleware');
const requireRole = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Read only, any signed in role
router.get('/', gradeController.getGrades);

// Write, admin only
router.post('/', requireRole('admin'), gradeController.saveGrade);

// Delete by the pair, id is not needed: DELETE /api/grades?student_id=1&course_id=2
router.delete('/', requireRole('admin'), gradeController.deleteGradeByPair);

// Delete by row id: DELETE /api/grades/7
router.delete('/:id', requireRole('admin'), gradeController.deleteGradeById);

module.exports = router;
