import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma';
import { env } from '../utils/env';
import { createLogger } from '../utils/logger';

const logger = createLogger('ocr-service');
const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface OcrResult {
  text: string;
  metadata: Record<string, unknown>;
}

export async function performOcr(documentId: string, versionId: string, buffer: Buffer, mimeType: string): Promise<OcrResult> {
  const base64 = buffer.toString('base64');
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an OCR assistant. Return JSON with {"text": string, "entities": object}.',
      },
      {
        role: 'user',
        content: `Extract text and entities from this document. Base64 (${mimeType}): ${base64}`,
      },
    ],
    response_format: { type: 'json_object' },
  });

  const raw = response.choices[0].message.content || '{}';
  let parsed: { text?: string; entities?: Record<string, unknown> } = {};
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logger.warn('Failed to parse OCR response', error as Error);
  }

  const text = parsed.text || '';
  const metadata = parsed.entities || {};

  await prisma.auditLog.create({
    data: {
      id: randomUUID(),
      userId: null,
      action: 'DOCUMENT_OCR',
      targetType: 'DOCUMENT_VERSION',
      targetId: versionId,
      details: { documentId, metadataSize: Object.keys(metadata).length },
    },
  });

  return { text, metadata };
}
