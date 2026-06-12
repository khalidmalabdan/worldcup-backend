import crypto from "crypto";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;   // ⭐ required for login
  avatar?: string;
}

const users: User[] = [];

/* ---------------------------------------------------
   ⭐ CREATE USER
--------------------------------------------------- */
export function createUser(
  name: string,
  email: string,
  password: string,
  avatar?: string
) {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
    password,   // ⭐ store hashed password if you want later
    avatar,
  };

  users.push(user);
  return user;
}

/* ---------------------------------------------------
   ⭐ GET USER BY ID
--------------------------------------------------- */
export function getUserById(id: string) {
  return users.find((u) => u.id === id) || null;
}

/* ---------------------------------------------------
   ⭐ GET USER BY EMAIL (needed for login)
--------------------------------------------------- */
export function getUserByEmail(email: string) {
  return users.find((u) => u.email === email) || null;
}
