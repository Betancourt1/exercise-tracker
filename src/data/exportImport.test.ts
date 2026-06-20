import { describe, expect, it } from "vitest";
import {
  CORE_STORE_NAMES,
  createDatabaseExport,
  createEmptyExportData,
  EXPORT_FORMAT,
  EXPORT_SCHEMA_VERSION,
  parseImportJson,
  validateImportPayload,
} from "./index";

describe("database export/import helpers", () => {
  it("creates export payload with expected format, schema version, and all stores", () => {
    const exportedAt = "2026-06-20T00:00:00.000Z";
    const payload = createDatabaseExport(createEmptyExportData(), exportedAt);

    expect(payload.format).toBe(EXPORT_FORMAT);
    expect(payload.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(payload.exportedAt).toBe(exportedAt);

    for (const storeName of CORE_STORE_NAMES) {
      expect(Array.isArray(payload.data[storeName])).toBe(true);
    }
  });

  it("validates a serialized export payload", () => {
    const payload = createDatabaseExport(createEmptyExportData());
    const result = parseImportJson(JSON.stringify(payload));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.format).toBe(EXPORT_FORMAT);
    }
  });

  it("rejects invalid JSON and invalid export shape", () => {
    expect(parseImportJson("{invalid").ok).toBe(false);
    expect(validateImportPayload(null).ok).toBe(false);
    expect(validateImportPayload({}).ok).toBe(false);
    expect(
      validateImportPayload({
        format: EXPORT_FORMAT,
        schemaVersion: EXPORT_SCHEMA_VERSION,
        exportedAt: "2026-06-20T00:00:00.000Z",
        data: {},
      }).ok,
    ).toBe(false);
  });

  it("rejects future schema versions", () => {
    const result = validateImportPayload({
      format: EXPORT_FORMAT,
      schemaVersion: EXPORT_SCHEMA_VERSION + 1,
      exportedAt: "2026-06-20T00:00:00.000Z",
      data: createEmptyExportData(),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("versión futura");
    }
  });
});
