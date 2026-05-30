const express = require('express');
const router = express.Router();
const { executeQuery, oracledb } = require('../config/db');
const { authMiddleware, officerOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT i.INTERVIEW_ID, i.APPLICATION_ID, i.INTERVIEW_DATE, i.RESULT,
              a.STUDENT_ID, a.JOB_ID, a.STATUS AS APPLICATION_STATUS,
              s.STUDENT_NAME, s.USN, s.BRANCH,
              j.JOB_ROLE, c.COMPANY_NAME
       FROM INTERVIEW i
       JOIN APPLICATION a ON i.APPLICATION_ID = a.APPLICATION_ID
       JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
       JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       ORDER BY i.INTERVIEW_DATE DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT i.*, a.STUDENT_ID, a.STATUS AS APPLICATION_STATUS,
              s.STUDENT_NAME, j.JOB_ROLE, c.COMPANY_NAME
       FROM INTERVIEW i
       JOIN APPLICATION a ON i.APPLICATION_ID = a.APPLICATION_ID
       JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
       JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       WHERE i.INTERVIEW_ID = :id`,
      { id: req.params.id }
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Interview not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', officerOnly, async (req, res) => {
  try {
    const { APPLICATION_ID, INTERVIEW_DATE, RESULT } = req.body;

    const existing = await executeQuery(
      `SELECT INTERVIEW_ID FROM INTERVIEW WHERE APPLICATION_ID = :appId`,
      { appId: APPLICATION_ID }
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Interview already scheduled for this application' });
    }

    const result = await executeQuery(
      `INSERT INTO INTERVIEW (INTERVIEW_ID, APPLICATION_ID, INTERVIEW_DATE, RESULT)
       VALUES ((SELECT NVL(MAX(INTERVIEW_ID), 0) + 1 FROM INTERVIEW),
               :APPLICATION_ID, TO_DATE(:INTERVIEW_DATE, 'YYYY-MM-DD'), :RESULT)
       RETURNING INTERVIEW_ID INTO :newId`,
      {
        APPLICATION_ID: parseInt(APPLICATION_ID, 10),
        INTERVIEW_DATE,
        RESULT: RESULT || 'Pending',
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    await executeQuery(
      `UPDATE APPLICATION SET STATUS = 'Interview Scheduled'
       WHERE APPLICATION_ID = :appId`,
      { appId: APPLICATION_ID }
    );

    res.status(201).json({
      INTERVIEW_ID: result.outBinds.newId[0],
      message: 'Interview scheduled successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', officerOnly, async (req, res) => {
  try {
    const { INTERVIEW_DATE, RESULT } = req.body;

    const result = await executeQuery(
      `UPDATE INTERVIEW
       SET INTERVIEW_DATE = TO_DATE(:INTERVIEW_DATE, 'YYYY-MM-DD'), RESULT = :RESULT
       WHERE INTERVIEW_ID = :id`,
      { INTERVIEW_DATE, RESULT, id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    let message = 'Interview updated successfully';
    if (RESULT === 'Selected') {
      message = 'Interview result set to Selected. Oracle trigger Update_Selection_Status will automatically update the application status.';
    }

    res.json({ message, triggerNote: RESULT === 'Selected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', officerOnly, async (req, res) => {
  try {
    const result = await executeQuery(
      `DELETE FROM INTERVIEW WHERE INTERVIEW_ID = :id`,
      { id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Interview not found' });
    }

    res.json({ message: 'Interview deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
