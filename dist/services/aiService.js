"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRelevantKnowledge = getRelevantKnowledge;
const db_1 = require("../db");
async function getRelevantKnowledge(query) {
    const knowledge = await (0, db_1.dbQuery)(`select id, title, content, source_type, created_at
     from ai_knowledge
     where content ilike $1
     order by created_at desc
     limit 5`, [`%${query}%`]);
    return knowledge.rows;
}
