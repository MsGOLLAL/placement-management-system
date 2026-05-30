const express = require('express');
const router = express.Router();
const { executeQuery, oracledb } = require('../config/db');
const { authMiddleware, officerOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT c.COMPANY_ID, c.COMPANY_NAME, c.LOCATION, c.PACKAGE, c.MIN_CGPA, c.OFFICER_ID,
              p.OFFICER_NAME
       FROM COMPANY c
       LEFT JOIN PLACEMENT_OFFICER p ON c.OFFICER_ID = p.OFFICER_ID
       ORDER BY c.COMPANY_ID`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT COMPANY_ID, COMPANY_NAME, LOCATION, PACKAGE, MIN_CGPA, OFFICER_ID
       FROM COMPANY WHERE COMPANY_ID = :id`,
      { id: req.params.id }
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', officerOnly, async (req, res) => {
  try {
    const { COMPANY_NAME, LOCATION, PACKAGE, MIN_CGPA, OFFICER_ID } = req.body;

    const result = await executeQuery(
      `INSERT INTO COMPANY (COMPANY_ID, COMPANY_NAME, LOCATION, PACKAGE, MIN_CGPA, OFFICER_ID)
       VALUES ((SELECT NVL(MAX(COMPANY_ID), 0) + 1 FROM COMPANY),
               :COMPANY_NAME, :LOCATION, :PACKAGE, :MIN_CGPA, :OFFICER_ID)
       RETURNING COMPANY_ID INTO :newId`,
      {
        COMPANY_NAME,
        LOCATION,
        PACKAGE: parseFloat(PACKAGE),
        MIN_CGPA: parseFloat(MIN_CGPA),
        OFFICER_ID: OFFICER_ID || req.user.id,
        newId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
      }
    );

    res.status(201).json({
      COMPANY_ID: result.outBinds.newId[0],
      message: 'Company created successfully'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', officerOnly, async (req, res) => {
  try {
    const { COMPANY_NAME, LOCATION, PACKAGE, MIN_CGPA, OFFICER_ID } = req.body;

    const result = await executeQuery(
      `UPDATE COMPANY
       SET COMPANY_NAME = :COMPANY_NAME, LOCATION = :LOCATION,
           PACKAGE = :PACKAGE, MIN_CGPA = :MIN_CGPA, OFFICER_ID = :OFFICER_ID
       WHERE COMPANY_ID = :id`,
      {
        COMPANY_NAME,
        LOCATION,
        PACKAGE: parseFloat(PACKAGE),
        MIN_CGPA: parseFloat(MIN_CGPA),
        OFFICER_ID: OFFICER_ID || req.user.id,
        id: req.params.id
      }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Company updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', officerOnly, async (req, res) => {
  try {
    const result = await executeQuery(
      `DELETE FROM COMPANY WHERE COMPANY_ID = :id`,
      { id: req.params.id }
    );

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Company not found' });
    }

    res.json({ message: 'Company deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
