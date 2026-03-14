import { UserRole } from "@prisma/client";

export function isGuardianRole(role: UserRole) {
  return role === UserRole.guardian || role === UserRole.admin;
}

export function isStudentRole(role: UserRole) {
  return role === UserRole.student;
}

export function getRoleHomePath(role: UserRole) {
  return isStudentRole(role) ? "/student/dashboard" : "/dashboard";
}
