const express = require('express');
const router = express.Router();
const { executeQuery, oracledb } = require('../config/db');
const { authMiddleware, officerOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT j.JOB_ID, j.COMPANY_ID, j.JOB_ROLE, j.ELIGIBILITY,
              c.COMPANY_NAME, c.LOCATION, c.PACKAGE, c.MIN_CGPA
       FROM JOB_POSTING j
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       ORDER BY j.JOB_ID`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT j.JOB_ID, j.COMPANY_ID, j.JOB_ROLE, j.ELIGIBILITY,
              c.COMPANY_NAME, c.LOCATION, c.PACKAGE, c.MIN_CGPA
       FROM JOB_POSTING j
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       WHERE j.JOB_ID = :id`,
      { id: req.params.id }
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', officerOnly, async (req, res) => {
  try {
    const { COMPANY_ID, JOB_ROLE, ELIGIBILITY } = req.body;

    const result = await executeQuery(
      `INSERT INTO JOB_POSTING (JOB_ID, COMPANY_ID, JOB_ROLE, ELIGIBILITY)
       VALUES ((SELECT NVL(MAX(JOB_ID), 0) + 1 FROM JOB_POSTING),
               :COMPANY_ID, :JOB_ROLE, :ELIGIBILITY)
       RETURNING JOB_ID INTO :newId`,
      {
        COMPANY_ID: parseInt(COMPANY_ID, 10),
        JOB_ROLE,
        ELIGIBILITY,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    res.status(201).json({
      JOB_ID: result.outBinds.newId[0],
      message: 'Job posting created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', officerOnly, async (req, res) => {
  try {
    const { COMPANY_ID, JOB_ROLE, ELIGIBILITY } = req.body;

    const result = await executeQuery(
      `UPDATE JOB_POSTING
       SET COMPANY_ID = :COMPANY_ID, JOB_ROLE = :JOB_ROLE, ELIGIBILITY = :ELIGIBILITY
       WHERE JOB_ID = :id`,
      {
        COMPANY_ID: parseInt(COMPANY_ID, 10),
        JOB_ROLE,
        ELIGIBILITY,
        id: req.params.id
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job posting updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', officerOnly, async (req, res) => {
  try {
    const result = await executeQuery(
      `DELETE FROM JOB_POSTING WHERE JOB_ID = :id`,
      { id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job posting deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
