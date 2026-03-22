import { access, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "@/lib/prisma";
import { getAppBackupRoot, getAppDataRoot, getWrongNoteStorageRoot, resolveWrongNoteImageLocation } from "@/modules/mistake-note/upload";
import { logStorageInfo } from "@/modules/shared/structured-log";
import { loadLocalEnv } from "./load-local-env";

type MissingEntry = {
  wrongNoteId: string;
  studentId: string;
  imagePath: string;
  kind: "storage" | "legacy" | "invalid";
  deleted: boolean;
};

async function pathExists(pathValue: string) {
  try {
    await access(pathValue);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root: string, currentPath = root): Promise<string[]> {
  const entries = await readdir(currentPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = resolve(currentPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(root, absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath.slice(root.length + 1).replace(/\\/g, "/"));
    }
  }

  return files;
}

async function main() {
  loadLocalEnv();

  const dryRun = !process.argv.includes("--apply");
  const json = process.argv.includes("--json");
  const storageRoot = getWrongNoteStorageRoot();
  const appDataRoot = getAppDataRoot();
  const appBackupRoot = getAppBackupRoot();

  logStorageInfo("wrong_note_storage_audit_started", {
    dryRun,
    appDataRoot,
    appBackupRoot,
    wrongNoteStorageRoot: storageRoot,
  });

  const wrongNotes = await prisma.wrongNote.findMany({
    select: {
      id: true,
      studentId: true,
      imagePath: true,
      deletedAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const referencedStorageKeys = new Set<string>();
  const missing: MissingEntry[] = [];

  for (const wrongNote of wrongNotes) {
    const resolvedLocation = resolveWrongNoteImageLocation(wrongNote.imagePath);

    if (!resolvedLocation) {
      missing.push({
        wrongNoteId: wrongNote.id,
        studentId: wrongNote.studentId,
        imagePath: wrongNote.imagePath,
        kind: "invalid",
        deleted: Boolean(wrongNote.deletedAt),
      });
      continue;
    }

    if (resolvedLocation.kind === "storage" && resolvedLocation.storageKey) {
      referencedStorageKeys.add(resolvedLocation.storageKey);
    }

    if (!(await pathExists(resolvedLocation.absolutePath))) {
      missing.push({
        wrongNoteId: wrongNote.id,
        studentId: wrongNote.studentId,
        imagePath: wrongNote.imagePath,
        kind: resolvedLocation.kind,
        deleted: Boolean(wrongNote.deletedAt),
      });
    }
  }

  const storageRootExists = await pathExists(storageRoot);
  const existingFiles = storageRootExists ? await collectFiles(storageRoot) : [];
  const orphans = existingFiles.filter((filePath) => !referencedStorageKeys.has(filePath));

  const result = {
    dryRun,
    appDataRoot,
    appBackupRoot,
    wrongNoteStorageRoot: storageRoot,
    wrongNoteCount: wrongNotes.length,
    missingCount: missing.length,
    orphanCount: orphans.length,
    missing,
    orphans,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`[AUDIT] wrong-note storage root: ${storageRoot}`);
  console.log(`[AUDIT] app data root: ${appDataRoot}`);
  console.log(`[AUDIT] app backup root: ${appBackupRoot}`);
  console.log(`[AUDIT] mode: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`[AUDIT] wrongNotes=${wrongNotes.length} missing=${missing.length} orphans=${orphans.length}`);

  if (missing.length) {
    console.log("[AUDIT] missing files:");

    for (const entry of missing) {
      console.log(
        `  - wrongNoteId=${entry.wrongNoteId} studentId=${entry.studentId} kind=${entry.kind} deleted=${entry.deleted} imagePath=${entry.imagePath}`,
      );
    }
  }

  if (orphans.length) {
    console.log("[AUDIT] orphan files:");

    for (const orphan of orphans) {
      console.log(`  - ${orphan}`);
    }
  }

  if (!missing.length && !orphans.length) {
    console.log("[AUDIT] no missing or orphan wrong-note files detected.");
  }
}

main()
  .catch((error) => {
    console.error("[AUDIT] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
