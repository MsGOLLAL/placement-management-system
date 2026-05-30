const express = require('express');
const router = express.Router();
const { executeQuery, oracledb } = require('../config/db');
const { authMiddleware, officerOnly, studentOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT a.APPLICATION_ID, a.STUDENT_ID, a.JOB_ID, a.APPLICATION_DATE, a.STATUS,
             s.STUDENT_NAME, s.USN, s.BRANCH, s.CGPA,
             j.JOB_ROLE, j.ELIGIBILITY,
             c.COMPANY_NAME, c.PACKAGE
      FROM APPLICATION a
      JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
      JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
      JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
    `;

    const binds = {};

    if (req.user.role === 'student') {
      sql += ` WHERE a.STUDENT_ID = :studentId`;
      binds.studentId = req.user.id;
    }

    sql += ` ORDER BY a.APPLICATION_DATE DESC`;

    const result = await executeQuery(sql, binds);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT a.APPLICATION_ID, a.STUDENT_ID, a.JOB_ID, a.APPLICATION_DATE, a.STATUS,
              s.STUDENT_NAME, s.USN, j.JOB_ROLE, c.COMPANY_NAME
       FROM APPLICATION a
       JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
       JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       WHERE a.APPLICATION_ID = :id`,
      { id: req.params.id }
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Application not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', studentOnly, async (req, res) => {
  try {
    const { JOB_ID } = req.body;
    const studentId = req.user.id;

    const existing = await executeQuery(
      `SELECT APPLICATION_ID FROM APPLICATION
       WHERE STUDENT_ID = :studentId AND JOB_ID = :jobId`,
      { studentId, jobId: JOB_ID }
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    const result = await executeQuery(
      `INSERT INTO APPLICATION (APPLICATION_ID, STUDENT_ID, JOB_ID, APPLICATION_DATE, STATUS)
       VALUES ((SELECT NVL(MAX(APPLICATION_ID), 0) + 1 FROM APPLICATION),
               :studentId, :jobId, SYSDATE, 'Applied')
       RETURNING APPLICATION_ID INTO :newId`,
      {
        studentId,
        jobId: parseInt(JOB_ID, 10),
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    res.status(201).json({
      APPLICATION_ID: result.outBinds.newId[0],
      message: 'Application submitted successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', officerOnly, async (req, res) => {
  try {
    const { STATUS } = req.body;

    const result = await executeQuery(
      `UPDATE APPLICATION SET STATUS = :STATUS WHERE APPLICATION_ID = :id`,
      { STATUS, id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application status updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', officerOnly, async (req, res) => {
  try {
    const result = await executeQuery(
      `DELETE FROM APPLICATION WHERE APPLICATION_ID = :id`,
      { id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ message: 'Application deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
