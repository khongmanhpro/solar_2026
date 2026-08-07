import { describe, expect, it } from "vitest";

import { CUSTOMER_REFERENCE_PACKAGES } from "@/config/customer-reference-packages";
import { STANDARD_PACKAGE_CATALOG } from "@/config/standard-package-catalog";
import {
  validateStandardPackage,
  validateStandardPackageCatalog,
} from "@/lib/standard-package-validation";
import type { StandardPackageDefinition } from "@/types/standard-package";

describe("standard package validation", () => {
  it("keeps the seven-package catalog arithmetically valid", () => {
    expect(CUSTOMER_REFERENCE_PACKAGES).toHaveLength(7);
    expect(STANDARD_PACKAGE_CATALOG).toHaveLength(7);

    const result = validateStandardPackageCatalog(
      CUSTOMER_REFERENCE_PACKAGES.map((solarPackage) => ({
        id: solarPackage.code,
        ...solarPackage,
      })),
      STANDARD_PACKAGE_CATALOG,
    );

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((item) => item.code === "BOM_NOT_ITEMIZED")).toBe(
      true,
    );
    expect(
      result.warnings.some(
        (item) => item.code === "TECHNICAL_REVIEW_NOT_APPROVED",
      ),
    ).toBe(true);
  });

  it("retains known source-document risks instead of silently correcting them", () => {
    const samplePackage = CUSTOMER_REFERENCE_PACKAGES.find(
      (item) => item.code === "HOME-HY-1P-7K2-16K",
    );
    const sampleDefinition = STANDARD_PACKAGE_CATALOG.find(
      (item) => item.code === "HOME-HY-1P-7K2-16K",
    );

    expect(samplePackage).toBeDefined();
    expect(sampleDefinition).toBeDefined();

    const result = validateStandardPackage(
      { id: samplePackage!.code, ...samplePackage! },
      sampleDefinition!,
    );
    const warningCodes = result.warnings.map((item) => item.code);

    expect(warningCodes).toContain("VAT_BASIS_UNCLEAR");
    expect(warningCodes).toContain("SOURCE_WRITTEN_TOTAL_MISMATCH");
    expect(warningCodes).not.toContain("DETAIL_SUBTOTAL_ROUNDING_MISMATCH");
    expect(warningCodes).toContain("ENGINEERING_REVIEW_REQUIRED");
    expect(warningCodes).toContain("SOURCE_INVERTER_MODEL_MISMATCH");
  });

  it("requires an explicit technical exception for every draft package below its DC/AC policy", () => {
    const definitionsBelowPolicy = STANDARD_PACKAGE_CATALOG.filter(
      (definition) => {
        if (definition.technicalReview.status !== "draft") return false;
        const ratio =
          (definition.panel.powerWp * definition.panel.quantity) /
          1_000 /
          definition.inverter.powerKw;
        return ratio < definition.technicalDesign.dcAcRatioPolicy.minimum;
      },
    );

    expect(definitionsBelowPolicy).not.toHaveLength(0);
    expect(
      definitionsBelowPolicy.every(
        (definition) =>
          (definition.technicalDesign.dcAcRatioPolicy.exceptionReason?.trim()
            .length ?? 0) > 0,
      ),
    ).toBe(true);
  });

  it("records the corrected 8 kW single-phase inverter model from its datasheet", () => {
    const definition = STANDARD_PACKAGE_CATALOG.find(
      (item) => item.code === "HOME-GT-1P-8K",
    );

    expect(definition?.inverter.model).toBe("ASW8000-S");
    expect(definition?.technicalReview.status).toBe("draft");
    expect(
      definition?.technicalReview.sourceReferences.some(
        (source) => source.reportedModel === "ASW8000-S",
      ),
    ).toBe(true);
  });

  it("blocks an approved package when its cold string voltage exceeds the inverter limit", () => {
    const packageToValidate = CUSTOMER_REFERENCE_PACKAGES.find(
      (item) => item.code === "HOME-GT-1P-5K",
    );
    const definition = STANDARD_PACKAGE_CATALOG.find(
      (item) => item.code === "HOME-GT-1P-5K",
    );
    const approvedDefinition: StandardPackageDefinition = {
      ...definition!,
      technicalReview: {
        ...definition!.technicalReview,
        status: "approved",
      },
      technicalDesign: {
        ...definition!.technicalDesign,
        panelElectrical: {
          vocV: 55,
          vmpV: 42,
          iscA: 14,
          impA: 13,
          tempCoeffVocPctPerC: -0.25,
          tempCoeffVmpPctPerC: -0.3,
          maxSystemVoltageV: 1_500,
        },
        stringPlan: {
          minAmbientC: 0,
          maxCellC: 70,
          strings: [
            {
              mppt: 1,
              panelCount: 4,
              vocColdV: 601,
              vmpHotV: 160,
              inputCurrentA: 13,
            },
            {
              mppt: 2,
              panelCount: 4,
              vocColdV: 220,
              vmpHotV: 160,
              inputCurrentA: 13,
            },
          ],
        },
      },
    };

    const result = validateStandardPackage(
      { id: packageToValidate!.code, ...packageToValidate! },
      approvedDefinition,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((item) => item.code)).toContain(
      "STRING_VOC_ABOVE_INVERTER_LIMIT",
    );
  });

  it("blocks a package when its panel count no longer matches DC capacity", () => {
    const packageToBreak = CUSTOMER_REFERENCE_PACKAGES.find(
      (item) => item.code === "HOME-GT-1P-5K",
    );
    const definition = STANDARD_PACKAGE_CATALOG.find(
      (item) => item.code === "HOME-GT-1P-5K",
    );

    const result = validateStandardPackage(
      {
        id: packageToBreak!.code,
        ...packageToBreak!,
        capacityKwp: 6.57,
      },
      definition!,
    );

    expect(result.valid).toBe(false);
    expect(result.errors.map((item) => item.code)).toContain(
      "DC_CAPACITY_MISMATCH",
    );
  });
});
