const express = require('express');
const router = express.Router();
const { executeQuery, oracledb } = require('../config/db');
const { authMiddleware, officerOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT STUDENT_ID, STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE
       FROM STUDENTS
       ORDER BY STUDENT_ID`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT STUDENT_ID, STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE
       FROM STUDENTS WHERE STUDENT_ID = :id`,
      { id: req.params.id }
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', officerOnly, async (req, res) => {
  try {
    const { STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE } = req.body;

    const result = await executeQuery(
      `INSERT INTO STUDENTS (STUDENT_ID, STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE)
       VALUES ((SELECT NVL(MAX(STUDENT_ID), 0) + 1 FROM STUDENTS),
               :STUDENT_NAME, :USN, :BRANCH, :CGPA, :EMAIL, :PHONE)
       RETURNING STUDENT_ID INTO :newId`,
      {
        STUDENT_NAME,
        USN,
        BRANCH,
        CGPA: parseFloat(CGPA),
        EMAIL,
        PHONE,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    res.status(201).json({
      STUDENT_ID: result.outBinds.newId[0],
      message: 'Student created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', officerOnly, async (req, res) => {
  try {
    const { STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE } = req.body;

    const result = await executeQuery(
      `UPDATE STUDENTS
       SET STUDENT_NAME = :STUDENT_NAME, USN = :USN, BRANCH = :BRANCH,
           CGPA = :CGPA, EMAIL = :EMAIL, PHONE = :PHONE
       WHERE STUDENT_ID = :id`,
      {
        STUDENT_NAME,
        USN,
        BRANCH,
        CGPA: parseFloat(CGPA),
        EMAIL,
        PHONE,
        id: req.params.id
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', officerOnly, async (req, res) => {
  try {
    const result = await executeQuery(
      `DELETE FROM STUDENTS WHERE STUDENT_ID = :id`,
      { id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
