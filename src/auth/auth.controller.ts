import { Request, Response } from "express";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  // TEMP: deterministic auth for pipeline validation
  if (email === "staff@example.com" && password === "password123") {
    return res.status(200).json({
      token: "dev-token",
      user: {
        id: "dev-user",
        email,
        role: "staff",
      },
    });
  }

  return res.status(401).json({ error: "Invalid credentials" });
};

export const logout = async (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true });
};

export const refresh = async (_req: Request, res: Response) => {
  return res.status(200).json({ token: "dev-token" });
};

export const me = async (_req: Request, res: Response) => {
  return res.status(200).json({
    id: "dev-user",
    email: "staff@example.com",
    role: "staff",
  });
};

export const status = async (_req: Request, res: Response) => {
  return res.status(200).json({ auth: "ok" });
};
