import { describe, expect, it } from "vitest";
import * as ui from "../../index";

describe("barrel de @transparencia/ui", () => {
  it.each([
    "SectionHeader",
    "ExternalLinkPill",
    "StatRow",
    "KPICard",
    "SegmentedButton",
    "Badge",
    "ModalDialog",
    "ThresholdMeter",
    "AlertBox",
    "corDoGrafico",
    "coresDoGrafico",
  ])("exporta %s", (nome) => {
    expect(ui).toHaveProperty(nome);
  });
});
