import { v4 as uuid } from "uuid";

export type UserRole = "user" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

const users: User[] = [];

export function createUser(name: string, email: string, role: UserRole = "user"): User {
  const user: User = { id: uuid(), name, email, role };
  users.push(user);
  return user;
}

export function getUserById(id: string) {
  return users.find((u) => u.id === id);
}

export function getAllUsers() {
  return users;
}
