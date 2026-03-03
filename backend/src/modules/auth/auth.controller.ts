import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/database";
import { env } from "../../config/env";
import { LoginInput } from "./auth.schema";

export async function login(req: Request, res: Response) {
  const { username, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }
  if (user.status === "PENDING") {
    return res.status(403).json({ error: "Tu cuenta está pendiente de aprobación por el administrador" });
  }
  if (user.status === "DISABLED") {
    return res.status(403).json({ error: "Tu cuenta ha sido deshabilitada" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
    },
  });
}
