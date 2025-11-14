// controllers/dealsController.js
// -----------------------------------------------------
// Global Deals Controller
// Backed by in-memory db.deals
// -----------------------------------------------------

import { db } from "../services/db.js";
import { v4 as uuid } from "uuid";

// -----------------------------------------------------
// GET /api/deals
// -----------------------------------------------------
export async function getDeals(req, res) {
  const results = db.deals.data;

  res.status(200).json({
    ok: true,
    count: results.length,
    deals: results,
  });
}

// -----------------------------------------------------
// POST /api/deals
// -----------------------------------------------------
export async function createDeal(req, res) {
  const body = req.body || {};

  const id = uuid();

  const record = {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    // Core deal fields
    title: body.title || "",
    amount: body.amount || null,
    stage: body.stage || "new",

    // Relationships
    contactId: body.contactId || null,
    companyId: body.companyId || null,

    // CRM metadata
    notes: body.notes || "",
    tags: body.tags || [],
    assignedTo: body.assignedTo || null,
    closeDate: body.closeDate || null,
    probability: body.probability || null,
  };

  db.deals.data.push(record);

  res.status(201).json({
    ok: true,
    deal: record,
  });
}

// -----------------------------------------------------
// GET /api/deals/:dealId
// -----------------------------------------------------
export async function getDealById(req, res) {
  const did = req.params.dealId;

  const found = db.deals.data.find((d) => d.id === did);

  if (!found) {
    return res.status(404).json({
      ok: false,
      error: "Deal not found",
    });
  }

  res.status(200).json({
    ok: true,
    deal: found,
  });
}

// -----------------------------------------------------
// PUT /api/deals/:dealId
// -----------------------------------------------------
export async function updateDeal(req, res) {
  const did = req.params.dealId;
  const updates = req.body || {};

  const index = db.deals.data.findIndex((d) => d.id === did);

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: "Deal not found",
    });
  }

  const updated = {
    ...db.deals.data[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  db.deals.data[index] = updated;

  res.status(200).json({
    ok: true,
    deal: updated,
  });
}

// -----------------------------------------------------
// DELETE /api/deals/:dealId
// -----------------------------------------------------
export async function deleteDeal(req, res) {
  const did = req.params.dealId;

  const index = db.deals.data.findIndex((d) => d.id === did);

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: "Deal not found",
    });
  }

  const removed = db.deals.data.splice(index, 1)[0];

  res.status(200).json({
    ok: true,
    deleted: removed,
  });
}
