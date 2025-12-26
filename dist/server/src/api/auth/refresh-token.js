export async function refreshToken(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({
        success: true,
        userId: req.user.id
    });
}
