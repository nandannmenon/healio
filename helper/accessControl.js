// Helper for user-specific or admin access
function userOrAdminSelfOrAdmin(req, targetId) {
  if (!req.user || (req.user.role !== 'user' && req.user.role !== 'admin' && req.user.role !== 'super_admin')) {
    return { allowed: false, status: 401, error: 'Unauthorized' };
  }
  
  // Convert both IDs to numbers for proper comparison
  const currentUserId = parseInt(req.user.userId);
  const targetUserId = parseInt(targetId);
  
  if (req.user.role === 'user' && currentUserId !== targetUserId) {
    return { allowed: false, status: 403, error: 'Forbidden: You can only access your own resource.' };
  }
  return { allowed: true };
}

// Helper for role-based access
function roleCheck(req, ...roles) {
  if (!req.user || !roles.includes(req.user.role)) {
    return { allowed: false, status: 403, error: 'Forbidden' };
  }
  return { allowed: true };
}

// Admin-only role check
function adminRoleCheck(req) {
  if (!req.user || req.user.role !== 'admin') {
    return { allowed: false, status: 403, error: 'Forbidden: Admins only.' };
  }
  return { allowed: true };
}

// User or admin role check
function userRoleCheck(req) {
  if (!req.user || (req.user.role !== 'user' && req.user.role !== 'admin')) {
    return { allowed: false, status: 403, error: 'Forbidden: Users or Admins only.' };
  }
  return { allowed: true };
}

module.exports = {
  userOrAdminSelfOrAdmin,
  roleCheck,
  adminRoleCheck,
  userRoleCheck
}; 