import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = __dirname;

const listFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? listFiles(entryPath)
      : /\.(ts|tsx)$/.test(entry.name)
        ? [entryPath]
        : [];
  });

const nextImportPattern =
  /(from\s+|import\s*\(\s*|require\(\s*|vi\.mock\(\s*|import\s+)["']next(\/[^"']*)?["']/;

describe("arquitetura de packages/ui", () => {
  it("nao importa nem mocka next em packages/ui/src", () => {
    const offenders = listFiles(rootDir)
      .filter((file) => file !== __filename)
      .filter((file) => nextImportPattern.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(rootDir, file));
    expect(offenders).toEqual([]);
  });
});
