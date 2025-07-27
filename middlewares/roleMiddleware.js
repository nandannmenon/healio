exports.requireRole = (roles) => (req, res, next) => {
  if (!req.session || !roles.includes(req.session.role)) {
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  }
  next();
}; 