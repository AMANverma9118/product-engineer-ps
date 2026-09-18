import { describe, expect, it } from "vitest";
import {
  MESSAGE_MAX_LENGTH,
  parseAfterSequence,
  validateIncidentId,
  validateUpdate,
} from "./validateUpdate.js";

describe("validateIncidentId", () => {
  it("accepts the default incident id", () => {
    expect(validateIncidentId("incident-123")).toEqual({
      ok: true,
      incidentId: "incident-123",
    });
  });

  it("rejects empty or malformed incident ids", () => {
    expect(validateIncidentId("")).toMatchObject({ ok: false });
    expect(validateIncidentId("incident 123")).toMatchObject({ ok: false });
    expect(validateIncidentId("incident/123")).toMatchObject({ ok: false });
  });
});

describe("validateUpdate", () => {
  it("trims a valid message", () => {
    expect(
      validateUpdate({
        incidentId: "incident-123",
        message: "  Database latency increased  ",
      })
    ).toEqual({
      ok: true,
      incidentId: "incident-123",
      message: "Database latency increased",
    });
  });

  it("rejects empty messages", () => {
    expect(
      validateUpdate({ incidentId: "incident-123", message: "   " })
    ).toMatchObject({ ok: false, error: "message must not be empty" });
  });

  it("rejects oversized messages", () => {
    expect(
      validateUpdate({
        incidentId: "incident-123",
        message: "x".repeat(MESSAGE_MAX_LENGTH + 1),
      })
    ).toMatchObject({ ok: false });
  });
});

describe("parseAfterSequence", () => {
  it("defaults missing values to 0", () => {
    expect(parseAfterSequence(undefined)).toEqual({
      ok: true,
      afterSequence: 0,
    });
  });

  it("rejects negative or non-integer values", () => {
    expect(parseAfterSequence("-1")).toMatchObject({ ok: false });
    expect(parseAfterSequence("1.5")).toMatchObject({ ok: false });
    expect(parseAfterSequence("abc")).toMatchObject({ ok: false });
  });
});
