import { CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION_PREFIX } from "@/config/customer-reference-packages";

export function assertReferencePackageOwnership(
  packageCode: string,
  existingDataVersion: string | null | undefined,
): void {
  if (
    existingDataVersion &&
    !existingDataVersion.startsWith(
      CUSTOMER_REFERENCE_PACKAGE_DATA_VERSION_PREFIX,
    )
  ) {
    throw new Error(
      `Không ghi đè gói ${packageCode} vì record hiện tại không thuộc catalog tham khảo.`,
    );
  }
}
