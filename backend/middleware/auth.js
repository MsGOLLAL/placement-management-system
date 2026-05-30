function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId || !userRole) {
    return res.status(401).json({ error: 'Unauthorized. Please login again.' });
  }

  req.user = {
    id: parseInt(userId, 10),
    role: userRole
  };
  next();
}

function officerOnly(req, res, next) {
  if (req.user.role !== 'officer') {
    return res.status(403).json({ error: 'Access denied. Placement Officer only.' });
  }
  next();
}

function studentOnly(req, res, next) {
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access denied. Students only.' });
  }
  next();
}

module.exports = { authMiddleware, officerOnly, studentOnly };
