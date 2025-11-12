import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { findUserByEmail, createUserRepo, addUserRole, getUserRoles } from "../../users/user.repo.js";
import { findRoleByName } from "../../roles/roles.repo.js";

const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

const registerSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(100),
  fullName: z.string().max(160).optional().nullable(),
  roles: z.array(z.string().min(1)).optional().default([])
});

const loginSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(100)
});

function toTokenPayload(user, roles) {
  return {
    sub: user.email,
    uid: user.id,
    roles: roles || []
  };
}

export async function registerSvc(input) {
  const data = registerSchema.parse(input);
  const exists = await findUserByEmail(data.email);
  if (exists) throw new Error("Email ya registrado");

  const hash = await bcrypt.hash(data.password, 10);
  const user = await createUserRepo({
    email: data.email,
    passwordHash: hash,
    fullName: data.fullName || null,
    active: true
  });

  if (data.roles && data.roles.length) {
    for (const rn of data.roles) {
      const role = await findRoleByName(rn);
      if (!role) throw new Error(`Rol no encontrado: ${rn}`);
      await addUserRole(user.id, role.id);
    }
  }

  const roles = await getUserRoles(user.id);
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name || null,
    active: user.active === true,
    roles
  };
}

export async function loginSvc(input) {
  const data = loginSchema.parse(input);
  const user = await findUserByEmail(data.email);
  if (!user || user.active === false) throw new Error("Credenciales invalidas");

  const ok = await bcrypt.compare(data.password, user.password);
  if (!ok) throw new Error("Credenciales invalidas");

  const roles = await getUserRoles(user.id);
  const token = jwt.sign(toTokenPayload(user, roles), JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token };
}



