import { describe, expect, it } from "vitest";
import { buildPhotoVisionPromptSection } from "./vision";

describe("buildPhotoVisionPromptSection", () => {
  it("includes photo observations in the quote prompt", () => {
    const section = buildPhotoVisionPromptSection({
      summary: "Rusted condenser coil and damaged drain line visible.",
      visibleIssues: [
        {
          text: "Corrosion on outdoor condenser fins",
          confidence: 88,
          photoIndex: 0,
        },
      ],
      equipmentIdentified: [
        {
          text: "Carrier 3-ton condenser (label partially readable)",
          confidence: 72,
          photoIndex: 1,
        },
      ],
      suggestedScope: [
        { text: "Clean condenser coil", photoIndex: 0 },
        { text: "Replace PVC drain line", photoIndex: 1 },
      ],
    });

    expect(section).toContain("Photo Analysis");
    expect(section).toContain("Rusted condenser coil");
    expect(section).toContain("Carrier 3-ton condenser");
    expect(section).toContain("Replace PVC drain line");
    expect(section).toContain("confidence 88%");
    expect(section).toContain("photo 0");
    expect(section).toContain("confidence 72%");
    expect(section).toContain("photo 1");
  });
});