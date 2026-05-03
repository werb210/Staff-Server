// BF_SERVER_BLOCK_v86_PARENT_APPLICATION_ID_FILTER_v1
import { describe, expect, it } from "vitest";

const APP_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function buildParentFilterFragment(parentIdRaw: string, paramIndex: number) {
  if (parentIdRaw && APP_UUID_RE.test(parentIdRaw)) {
    return `a.parent_application_id::text = $${paramIndex}::text`;
  }
  return null;
}

describe("v86 parent_application_id filter", () => {
  it("valid v4 uuid produces the WHERE fragment", () => {
    const id = "11111111-2222-4333-8444-555555555555";
    expect(buildParentFilterFragment(id, 2)).toBe("a.parent_application_id::text = $2::text");
  });

  it("non-uuid input is rejected silently", () => {
    expect(buildParentFilterFragment("not-a-uuid", 2)).toBeNull();
    expect(buildParentFilterFragment("", 2)).toBeNull();
    expect(buildParentFilterFragment("'; DROP TABLE applications;--", 2)).toBeNull();
  });
});
