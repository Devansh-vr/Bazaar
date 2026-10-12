/**
 * Restricts access to users whose role is included in `roles`.
 * Expects `req.user` to already be populated by authMiddleware.protect.
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: insufficient permissions",
      });
    }
    next();
  };
};

export default authorizeRoles;
