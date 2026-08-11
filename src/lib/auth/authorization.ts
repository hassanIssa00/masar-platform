import 'server-only';
import { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME, SessionPayload } from './session.server';

export type UserRole = 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';

export interface AuthCheckResult {
  authorized: boolean;
  user: SessionPayload | null;
  reason?: 'missing_token' | 'invalid_token' | 'expired' | 'forbidden_role' | 'unauthorized_object';
}

/**
 * Extract and verify session token from NextRequest cookies or Authorization header.
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthCheckResult> {
  // 1. Try HttpOnly session cookie
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  
  // 2. Try Authorization Bearer header
  const authHeader = req.headers.get('authorization');
  let bearerToken: string | undefined;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  const token = cookie || bearerToken;

  if (!token) {
    return { authorized: false, user: null, reason: 'missing_token' };
  }

  const user = await verifySessionToken(token);
  if (!user) {
    return { authorized: false, user: null, reason: 'invalid_token' };
  }

  return { authorized: true, user };
}

/**
 * Require valid authentication for a route handler.
 */
export async function requireAuth(req: NextRequest): Promise<SessionPayload | null> {
  const check = await authenticateRequest(req);
  if (!check.authorized || !check.user) {
    return null;
  }
  return check.user;
}

/**
 * Require specific role(s) for a route handler.
 */
export async function requireRole(
  req: NextRequest,
  allowedRoles: UserRole[]
): Promise<{ authorized: boolean; user: SessionPayload | null }> {
  const user = await requireAuth(req);
  if (!user) {
    return { authorized: false, user: null };
  }

  if (!allowedRoles.includes(user.role)) {
    return { authorized: false, user };
  }

  return { authorized: true, user };
}

/**
 * Enforce Object-Level Authorization (BOLA / IDOR protection).
 */
export async function requireOwnership(
  req: NextRequest,
  resourceType: 'student' | 'report' | 'certificate' | 'classroom' | 'admin_action',
  resourceMeta: {
    resourceId?: string;
    studentName?: string;
    parentPhone?: string;
    parentEmail?: string;
    teacherId?: string;
  }
): Promise<{ authorized: boolean; user: SessionPayload | null }> {
  const user = await requireAuth(req);
  if (!user) {
    return { authorized: false, user: null };
  }

  // Doctor / Admin has full management access across all resources
  if (user.role === 'doctor') {
    return { authorized: true, user };
  }

  switch (resourceType) {
    case 'admin_action':
      // Strictly restricted to Doctor / Admin role
      // Note: doctor is already allowed above, so this is always false for other roles here
      return { authorized: false, user };

    case 'student':
      if (user.role === 'student') {
        // Student can ONLY access their own profile
        const isSelf = resourceMeta.studentName === user.name || resourceMeta.resourceId === user.id;
        return { authorized: isSelf, user };
      }
      if (user.role === 'parent') {
        // Parent can ONLY access their linked child
        const isLinkedChild = !!(
          resourceMeta.parentPhone === user.phone ||
          resourceMeta.parentEmail === user.email ||
          (resourceMeta.parentEmail && resourceMeta.parentEmail.toLowerCase() === user.email.toLowerCase())
        );
        return { authorized: isLinkedChild, user };
      }
      if (user.role === 'teacher' || user.role === 'specialist') {
        // Teacher / Specialist access allowed for assigned branch/class
        return { authorized: true, user };
      }
      return { authorized: false, user };

    case 'report':
    case 'certificate':
      if (user.role === 'student') {
        const isSelf = resourceMeta.studentName === user.name;
        return { authorized: isSelf, user };
      }
      if (user.role === 'parent') {
        const isLinkedChild =
          resourceMeta.parentPhone === user.phone ||
          resourceMeta.parentEmail === user.email;
        return { authorized: isLinkedChild, user };
      }
      if (user.role === 'teacher' || user.role === 'specialist') {
        return { authorized: true, user };
      }
      return { authorized: false, user };

    case 'classroom':
      if (user.role === 'teacher' || user.role === 'specialist') {
        const isTeacherClass = !resourceMeta.teacherId || resourceMeta.teacherId === user.id;
        return { authorized: !!isTeacherClass, user };
      }
      if (user.role === 'student' || user.role === 'parent') {
        // Students/Parents can view assigned classrooms, but CANNOT publish as host
        return { authorized: true, user };
      }
      return { authorized: false, user };

    default:
      return { authorized: false, user };
  }
}
