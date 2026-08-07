import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, describe, expect, it } from "vitest";

const migrationPath = new URL(
  "../prisma/migrations/20260806090000_add_electrical_phase/migration.sql",
  import.meta.url,
);

describe("electrical phase migration", () => {
  let databaseDirectory: string | undefined;

  afterEach(async () => {
    if (databaseDirectory) await rm(databaseDirectory, { recursive: true, force: true });
    databaseDirectory = undefined;
  });

  it("preserves rows, defaults old packages to single phase, and keeps historical calculations null", async () => {
    databaseDirectory = await mkdtemp(path.join(tmpdir(), "solar-electrical-phase-"));
    const sqlite = new DatabaseSync(path.join(databaseDirectory, "test.db"));
    sqlite.exec(`
      CREATE TABLE "SolarPackage" ("id" TEXT PRIMARY KEY, "code" TEXT NOT NULL UNIQUE);
      CREATE TABLE "Calculation" ("id" TEXT PRIMARY KEY, "monthlyBill" INTEGER NOT NULL);
      INSERT INTO "SolarPackage" VALUES ('one', 'HOME-GT-1P-5K'), ('three', 'HOME-HY-3P-8K-16K'), ('three-two', 'HOME-HY-3P-12K-16K');
      INSERT INTO "Calculation" VALUES ('historic', 2000000);
    `);
    sqlite.exec(await readFile(migrationPath, "utf8"));

    expect(sqlite.prepare(`SELECT "electricalPhase" FROM "SolarPackage" WHERE "id" = 'one'`).get()).toMatchObject({ electricalPhase: "SINGLE_PHASE" });
    expect(sqlite.prepare(`SELECT "electricalPhase" FROM "SolarPackage" WHERE "id" = 'three'`).get()).toMatchObject({ electricalPhase: "THREE_PHASE" });
    expect(sqlite.prepare(`SELECT "electricalPhase" FROM "SolarPackage" WHERE "id" = 'three-two'`).get()).toMatchObject({ electricalPhase: "THREE_PHASE" });
    expect(sqlite.prepare(`SELECT "electricalPhase" FROM "Calculation" WHERE "id" = 'historic'`).get()).toMatchObject({ electricalPhase: null });
    sqlite.close();
  });
});
