const express = require('express');
const router = express.Router();
const { executeQuery, oracledb, getConnection } = require('../config/db');
const { authMiddleware, officerOnly } = require('../middleware/auth');

router.use(authMiddleware);
router.use(officerOnly);

router.get('/eligible-students', async (req, res) => {
  const jobId = req.query.jobId;

  if (!jobId) {
    return res.status(400).json({ error: 'jobId query parameter is required' });
  }

  let connection;
  try {
    connection = await getConnection();

    const result = await connection.execute(
      `BEGIN GetEligibleStudents(:jobId, :cursor); END;`,
      {
        jobId: parseInt(jobId, 10),
        cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR }
      }
    );

    const resultSet = result.outBinds.cursor;
    const rows = await resultSet.getRows(500);
    await resultSet.close();

    res.json(rows);
  } catch (err) {
    try {
      const fallback = await executeQuery(
        `SELECT s.STUDENT_ID, s.STUDENT_NAME, s.USN, s.BRANCH, s.CGPA, s.EMAIL, s.PHONE
         FROM STUDENTS s
         JOIN COMPANY c ON c.COMPANY_ID = (
           SELECT COMPANY_ID FROM JOB_POSTING WHERE JOB_ID = :jobId
         )
         WHERE s.CGPA >= c.MIN_CGPA
         ORDER BY s.CGPA DESC`,
        { jobId: parseInt(jobId, 10) }
      );
      res.json(fallback.rows);
    } catch (fallbackErr) {
      res.status(500).json({ error: err.message });
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (e) {
        console.error(e);
      }
    }
  }
});

router.get('/selected-students', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT s.STUDENT_ID, s.STUDENT_NAME, s.USN, s.BRANCH, s.CGPA, s.EMAIL, s.PHONE,
              c.COMPANY_NAME, j.JOB_ROLE, c.PACKAGE, a.APPLICATION_DATE
       FROM APPLICATION a
       JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
       JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       WHERE a.STATUS = 'Selected'
       ORDER BY a.APPLICATION_DATE DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/company-wise', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT c.COMPANY_NAME, c.LOCATION, c.PACKAGE,
              COUNT(a.APPLICATION_ID) AS PLACEMENTS
       FROM APPLICATION a
       JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
       JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
       WHERE a.STATUS = 'Selected'
       GROUP BY c.COMPANY_NAME, c.LOCATION, c.PACKAGE
       ORDER BY PLACEMENTS DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/branch-wise', async (req, res) => {
  try {
    const result = await executeQuery(
      `SELECT s.BRANCH,
              COUNT(a.APPLICATION_ID) AS PLACEMENTS,
              ROUND(COUNT(a.APPLICATION_ID) * 100.0 /
                NULLIF((SELECT COUNT(*) FROM STUDENTS st WHERE st.BRANCH = s.BRANCH), 0), 2) AS PLACEMENT_RATE
       FROM APPLICATION a
       JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
       WHERE a.STATUS = 'Selected'
       GROUP BY s.BRANCH
       ORDER BY PLACEMENTS DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const [totalStudents, selected, companies, jobs, applications] = await Promise.all([
      executeQuery('SELECT COUNT(*) AS CNT FROM STUDENTS'),
      executeQuery(`SELECT COUNT(*) AS CNT FROM APPLICATION WHERE STATUS = 'Selected'`),
      executeQuery('SELECT COUNT(*) AS CNT FROM COMPANY'),
      executeQuery('SELECT COUNT(*) AS CNT FROM JOB_POSTING'),
      executeQuery('SELECT COUNT(*) AS CNT FROM APPLICATION')
    ]);

    const total = totalStudents.rows[0].CNT;
    const selectedCount = selected.rows[0].CNT;

    res.json({
      totalStudents: total,
      selectedStudents: selectedCount,
      placementPercentage: total ? Math.round((selectedCount / total) * 100) : 0,
      totalCompanies: companies.rows[0].CNT,
      totalJobs: jobs.rows[0].CNT,
      totalApplications: applications.rows[0].CNT
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
