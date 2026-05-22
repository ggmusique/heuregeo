import { describe, expect, it } from "vitest";

import { getMobileLabRoute, shouldRenderMobileLab } from "../../dev/mobile-lab/mobileLabRouting";

describe("mobile lab routing", () => {
  it("keeps the mobile lab dev-only", () => {
    expect(shouldRenderMobileLab("/mobile-lab", true)).toBe(true);
    expect(shouldRenderMobileLab("/mobile-lab/navbar", true)).toBe(true);
    expect(shouldRenderMobileLab("/mobile-lab", false)).toBe(false);
    expect(shouldRenderMobileLab("/", true)).toBe(false);
  });

  it("normalizes known mobile lab routes", () => {
    expect(getMobileLabRoute("/mobile-lab")).toBe("overview");
    expect(getMobileLabRoute("/mobile-lab/navbar")).toBe("navbar");
    expect(getMobileLabRoute("/mobile-lab/modals")).toBe("modals");
    expect(getMobileLabRoute("/mobile-lab/drawer")).toBe("drawer");
    expect(getMobileLabRoute("/mobile-lab/banque-heures")).toBe("banque-heures");
    expect(getMobileLabRoute("/mobile-lab/unknown")).toBe("overview");
  });
});
