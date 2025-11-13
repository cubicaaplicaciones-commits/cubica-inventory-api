import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  findUserByEmail,
  findUserById,
  listUsersRepo,
  createUserRepo,
  updateUserRepo,
  setUserActiveRepo,
  clearUserRolesRepo,
  addUserRole,
  getUserRoles
} from "./user.repo.js";
import { findRoleByName } from "../../roles/roles.repo.js";

/* Esquema para crear usuario desde admin */
const createUserSchema = z.object({
  email: z.string().email().max(160),
  password: z.string().min(6).max(100),
  fullName: z.string().max(160).optional().nullable(),
  roles: z.array(z.string().min(1)).optional().default([]),
  active: z.boolean().optional().default(true)
});

/* Esquema para actualizar usuario */
const updateUserSchema = z.object({
  email: z.string().email().max(160).optional(),
  password: z.string().min(6).max(100).optional(),
  fullName: z.string().max(160).optional().nullable(),
  roles: z.array(z.string().min(1)).optional(),
  active: z.boolean().optional()
});

/* Normaliza salida de usuario */
function toUserDto(user, roles) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name || user.fullName || null,
    active: user.active === true,
    roles: roles || []
  };
}

/* Lista usuarios para el módulo de administración */
export async function listUsersSvc() {
  const users = await listUsersRepo(); 
  const result = [];
  for (const u of users) {
    const roles = await getUserRoles(u.id);
    result.push(toUserDto(u, roles));
  }
  return result;
}

/* Obtiene un usuario por id */
export async function getUserByIdSvc(id) {
  const uid = Number(id);
  if (!Number.isFinite(uid)) throw new Error("Id de usuario inválido");

  const user = await findUserById(uid); 
  if (!user) throw new Error("Usuario no encontrado");

  const roles = await getUserRoles(uid);
  return toUserDto(user, roles);
}

/* Crea usuario (solo admin) */
export async function createUserSvc(input) {
  const data = createUserSchema.parse(input);

  const exists = await findUserByEmail(data.email);
  if (exists) throw new Error("Email ya registrado");

  const hash = await bcrypt.hash(data.password, 10);

  const user = await createUserRepo({
    email: data.email,
    passwordHash: hash,
    fullName: data.fullName || null,
    active: data.active !== false
  });

  if (data.roles && data.roles.length) {
    for (const rn of data.roles) {
      const role = await findRoleByName(rn);
      if (!role) throw new Error(`Rol no encontrado: ${rn}`);
      await addUserRole(user.id, role.id);
    }
  }

  const roles = await getUserRoles(user.id);
  return toUserDto(user, roles);
}

/* Actualiza usuario (nombre, email, password, activo, roles) */
export async function updateUserSvc(id, input) {
  const uid = Number(id);
  if (!Number.isFinite(uid)) throw new Error("Id de usuario inválido");

  const data = updateUserSchema.parse(input);

  const user = await findUserById(uid);
  if (!user) throw new Error("Usuario no encontrado");

  if (data.email && data.email.toLowerCase().trim() !== user.email.toLowerCase().trim()) {
    const exists = await findUserByEmail(data.email);
    if (exists && exists.id !== uid) throw new Error("Email ya registrado");
  }

  let passwordHash = undefined;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  const updated = await updateUserRepo(uid, {
    email: data.email,
    passwordHash,
    fullName: data.fullName,
    active: data.active
  });

  if (data.roles) {
    await clearUserRolesRepo(uid); 
    for (const rn of data.roles) {
      const role = await findRoleByName(rn);
      if (!role) throw new Error(`Rol no encontrado: ${rn}`);
      await addUserRole(uid, role.id);
    }
  }

  const roles = await getUserRoles(uid);
  return toUserDto(updated, roles);
}

/* Desactiva usuario (soft delete) */
export async function deactivateUserSvc(id) {
  const uid = Number(id);
  if (!Number.isFinite(uid)) throw new Error("Id de usuario inválido");

  const user = await findUserById(uid);
  if (!user) throw new Error("Usuario no encontrado");

  const updated = await setUserActiveRepo(uid, false); 
  const roles = await getUserRoles(uid);
  return toUserDto(updated, roles);
}
