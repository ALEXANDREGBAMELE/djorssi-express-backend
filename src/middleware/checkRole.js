function checkRole(...allowedTypes) {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.user_type)) {
      return res.status(403).json({ message: 'Accès refusé pour ce type de compte' });
    }
    next();
  };
}

module.exports = checkRole;