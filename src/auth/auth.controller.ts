import { Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const ACCESS_EXPIRES = "15m";
const REFRESH_EXPIRES = "30d";

/* TEMP USER — matches your curl test */
const USER = {
  id: "c41b878d-ca33-48c1-8032-374a0074c8b6",
  email: "staff@example.com",
  password: "password123",
};

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (email !== USER.email || password !== USER.password) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = jwt.sign(
    { sub: USER.id, email: USER.email },
    JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );

  const refreshToken = jwt.sign(
    { sub: USER.id },
    JWT_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );

  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refresh_token", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    user: {
      id: USER.id,
      email: USER.email,
    },
  });
}
