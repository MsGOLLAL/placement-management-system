const express = require('express');
const router = express.Router();
const { executeQuery } = require('../config/db');

router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Username, password, and role are required' });
    }

    if (role === 'officer') {
      const result = await executeQuery(
        `SELECT OFFICER_ID, OFFICER_NAME, EMAIL, PHONE
         FROM PLACEMENT_OFFICER
         WHERE UPPER(EMAIL) = UPPER(:username)
            OR TO_CHAR(OFFICER_ID) = :username`,
        { username }
      );

      const officer = result.rows[0];
      if (!officer) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (password !== (process.env.DEFAULT_OFFICER_PASSWORD || 'admin123')) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.json({
        user: {
          id: officer.OFFICER_ID,
          name: officer.OFFICER_NAME,
          email: officer.EMAIL,
          phone: officer.PHONE,
          role: 'officer'
        }
      });
    }

    if (role === 'student') {
      const result = await executeQuery(
        `SELECT STUDENT_ID, STUDENT_NAME, USN, BRANCH, CGPA, EMAIL, PHONE
         FROM STUDENTS
         WHERE UPPER(USN) = UPPER(:username)
            OR UPPER(EMAIL) = UPPER(:username)
            OR TO_CHAR(STUDENT_ID) = :username`,
        { username }
      );

      const student = result.rows[0];
      if (!student) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (password !== (process.env.DEFAULT_STUDENT_PASSWORD || 'student123')) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      return res.json({
        user: {
          id: student.STUDENT_ID,
          name: student.STUDENT_NAME,
          usn: student.USN,
          branch: student.BRANCH,
          cgpa: student.CGPA,
          email: student.EMAIL,
          phone: student.PHONE,
          role: 'student'
        }
      });
    }

    res.status(400).json({ error: 'Invalid role selected' });
  } catch (err) {
    console.error('Login error:', err);
    let message = 'Login failed. Check database connection.';
    if (err.message?.includes('ORA-01017')) {
      message = 'Invalid Oracle username or password. Update ORACLE_USER and ORACLE_PASSWORD in .env';
    } else if (err.message?.includes('NJS-518') || err.message?.includes('not registered')) {
      message = 'Oracle service not found. For Oracle 11g XE use ORACLE_CONNECT_STRING=localhost:1521/xe';
    } else if (err.message?.includes('NJS-138')) {
      message = 'Oracle 11g requires Thick mode. Set ORACLE_CLIENT_LIB_DIR in .env and restart the server.';
    } else if (process.env.ORACLE_PASSWORD === 'your_password') {
      message = 'Set your real Oracle password in the .env file (ORACLE_PASSWORD).';
    }
    res.status(500).json({ error: message });
  }
});

module.exports = router;
