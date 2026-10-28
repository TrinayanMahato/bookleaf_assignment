import jwt from 'jsonwebtoken';

// Verifies the Bearer token and attaches { id, role } to req.user.
export const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing' });
  }

  try {
    const { id, role } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id, role };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Usage: router.get('/tickets', authenticate, authorize('admin'), handler)
export const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'You do not have access to this resource' });
  }
  return next();
};
