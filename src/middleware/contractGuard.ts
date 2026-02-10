import type { NextFunction, Request, Response } from "express";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { loadOpenApiV1, openApiPathToExpress, resolveSchemaRefs } from "../contracts/v1/openapi";

type ValidatorEntry = {
  key: string;
  validate: ((data: unknown) => boolean) | null;
};

const isEnabled =
  process.env.NODE_ENV !== "production" && process.env.CONTRACT_GUARD_ENABLED !== "false";

const validators = new Map<string, ValidatorEntry>();

if (isEnabled) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const doc = loadOpenApiV1();
  Object.entries(doc.paths).forEach(([openApiPath, operations]) => {
    Object.entries(operations).forEach(([method, operation]) => {
      const expressPath = openApiPathToExpress(openApiPath);
      const responses = operation.responses ?? {};
      const preferred = responses["200"] ?? responses["201"] ?? responses.default;
      const schema = preferred?.content?.["application/json"]?.schema;
      const key = `${method.toUpperCase()} ${expressPath}`;
      if (schema) {
        validators.set(key, { key, validate: ajv.compile(resolveSchemaRefs(schema, doc) as object) });
      } else {
        validators.set(key, { key, validate: null });
      }
    });
  });
}

export function contractGuard(req: Request, res: Response, next: NextFunction): void {
  if (!isEnabled) {
    next();
    return;
  }
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    const routePath = `${req.baseUrl}${req.route?.path ?? ""}`;
    const key = `${req.method.toUpperCase()} ${routePath}`;
    const validator = validators.get(key);
    if (validator?.validate && !validator.validate(body)) {
      throw new Error(
        `Contract guard response mismatch for ${key}: ${JSON.stringify(
          (validator.validate as { errors?: unknown }).errors
        )}`
      );
    }
    return originalJson(body);
  }) as Response["json"];
  next();
}
