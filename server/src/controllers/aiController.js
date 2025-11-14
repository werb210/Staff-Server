// controllers/aiController.js
// -----------------------------------------------------
// Minimal AI controller (placeholder / functional stubs)
// No external AI calls. Safe for local + Azure.
// -----------------------------------------------------

// -----------------------------------------------------
// GET /api/ai/ping
// -----------------------------------------------------
export async function aiPing(req, res) {
  res.status(200).json({
    ok: true,
    service: "ai-engine",
    time: new Date().toISOString(),
  });
}

// -----------------------------------------------------
// POST /api/ai/summarize
// Very simple placeholder summarizer
// -----------------------------------------------------
export async function aiSummarize(req, res) {
  const { text } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      ok: false,
      error: "Missing 'text' in request body",
    });
  }

  // Fake “summary”: return first 200 chars
  const summary = text.length > 200 ? text.slice(0, 200) + "..." : text;

  res.status(200).json({
    ok: true,
    summary,
  });
}

// -----------------------------------------------------
// POST /api/ai/extract-fields
// Simple placeholder: returns detected "fields" from text
// -----------------------------------------------------
export async function aiExtractFields(req, res) {
  const { text } = req.body || {};

  if (!text || typeof text !== "string") {
    return res.status(400).json({
      ok: false,
      error: "Missing 'text' in request body",
    });
  }

  // Very simple pattern matching (placeholder only)
  const fields = {
    email: text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] || null,
    phone: text.match(/(\+?\d[\d -]{8,}\d)/)?.[0] || null,
    amount: text.match(/\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g) || [],
  };

  res.status(200).json({
    ok: true,
    extracted: fields,
  });
}
