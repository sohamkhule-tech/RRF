/**
 * AuthUser interface
 * Matches the shape returned by JwtStrategy.validate() and attached to request.user
 */
export interface AuthUser {
  id: number;
  userId: string;
  email: string;
  fullName: string;
  role: {
    id: number;
    roleCode: string;
    roleName: string;
  };
  department: string;
}
