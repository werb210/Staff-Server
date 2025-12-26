import { pool } from "../../db/pool.js";
export async function getUserById(req, res) {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT id, email FROM users WHERE id = $1", [id]);
    if (rows.length === 0) {
        res.status(404).json({ error: "User not found" });
        return;
    }
    res.json(rows[0]);
}
