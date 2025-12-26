export async function login(req, res) {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: "Missing email" });
    }
    return res.json({
        success: true,
        user: {
            id: "test-user-id",
            email
        }
    });
}
