const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { initializePool, closePool, executeQuery } = require('./config/db');

const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const companyRoutes = require('./routes/companies');
const jobRoutes = require('./routes/jobs');
const applicationRoutes = require('./routes/applications');
const interviewRoutes = require('./routes/interviews');
const reportRoutes = require('./routes/reports');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [students, companies, jobs, applications, selected] = await Promise.all([
      executeQuery('SELECT COUNT(*) AS CNT FROM STUDENTS'),
      executeQuery('SELECT COUNT(*) AS CNT FROM COMPANY'),
      executeQuery('SELECT COUNT(*) AS CNT FROM JOB_POSTING'),
      executeQuery('SELECT COUNT(*) AS CNT FROM APPLICATION'),
      executeQuery(`SELECT COUNT(*) AS CNT FROM APPLICATION WHERE STATUS = 'Selected'`)
    ]);

    res.json({
      totalStudents: students.rows[0].CNT,
      totalCompanies: companies.rows[0].CNT,
      totalJobs: jobs.rows[0].CNT,
      totalApplications: applications.rows[0].CNT,
      selectedStudents: selected.rows[0].CNT
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/charts', async (req, res) => {
  try {
    const totalStudents = (await executeQuery('SELECT COUNT(*) AS CNT FROM STUDENTS')).rows[0].CNT;
    const selected = (await executeQuery(`SELECT COUNT(*) AS CNT FROM APPLICATION WHERE STATUS = 'Selected'`)).rows[0].CNT;

    const companyWise = await executeQuery(`
      SELECT c.COMPANY_NAME, COUNT(a.APPLICATION_ID) AS PLACED
      FROM APPLICATION a
      JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
      JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
      WHERE a.STATUS = 'Selected'
      GROUP BY c.COMPANY_NAME
      ORDER BY PLACED DESC
    `);

    const branchWise = await executeQuery(`
      SELECT s.BRANCH, COUNT(a.APPLICATION_ID) AS PLACED
      FROM APPLICATION a
      JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
      WHERE a.STATUS = 'Selected'
      GROUP BY s.BRANCH
      ORDER BY PLACED DESC
    `);

    const monthlyTrend = await executeQuery(`
      SELECT TO_CHAR(APPLICATION_DATE, 'Mon YYYY') AS MONTH, COUNT(*) AS CNT
      FROM APPLICATION
      WHERE STATUS = 'Selected'
      GROUP BY TO_CHAR(APPLICATION_DATE, 'Mon YYYY'), TO_CHAR(APPLICATION_DATE, 'YYYY-MM')
      ORDER BY TO_CHAR(APPLICATION_DATE, 'YYYY-MM')
    `);

    res.json({
      placementPercentage: totalStudents ? Math.round((selected / totalStudents) * 100) : 0,
      selected,
      notSelected: Math.max(totalStudents - selected, 0),
      companyWise: companyWise.rows,
      branchWise: branchWise.rows,
      monthlyTrend: monthlyTrend.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dashboard/activities', async (req, res) => {
  try {
    const limited = await executeQuery(`
      SELECT * FROM (
        SELECT a.APPLICATION_ID, a.STATUS, a.APPLICATION_DATE,
               s.STUDENT_NAME, c.COMPANY_NAME, j.JOB_ROLE
        FROM APPLICATION a
        JOIN STUDENTS s ON a.STUDENT_ID = s.STUDENT_ID
        JOIN JOB_POSTING j ON a.JOB_ID = j.JOB_ID
        JOIN COMPANY c ON j.COMPANY_ID = c.COMPANY_ID
        ORDER BY a.APPLICATION_DATE DESC
      ) WHERE ROWNUM <= 8
    `);

    res.json(limited.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  try {
    await initializePool();
    app.listen(PORT, () => {
      console.log(`Placement Management System running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

startServer();
