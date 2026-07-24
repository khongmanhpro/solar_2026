import "dotenv/config";

import { db } from "../src/lib/db";
import { CalculationRepository } from "../src/server/repositories";

const repository = new CalculationRepository(db);

try {
  const deletedCount = await repository.purgeExpiredUnlinked();
  process.stdout.write(
    `${JSON.stringify({ deletedCount, completedAt: new Date().toISOString() })}\n`,
  );
} finally {
  await db.$disconnect();
}
