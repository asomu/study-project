import { execFileSync } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { getAppBackupRoot, getAppDataRoot, getWrongNoteStorageRoot } from "@/modules/mistake-note/upload";
import { logStorageInfo } from "@/modules/shared/structured-log";
import { loadLocalEnv } from "./load-local-env";

function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}${month}${day}-${hour}${minute}${second}`;
}

async function main() {
  loadLocalEnv();

  const appDataRoot = getAppDataRoot();
  const appBackupRoot = getAppBackupRoot();
  const wrongNoteStorageRoot = getWrongNoteStorageRoot();

  logStorageInfo("wrong_note_storage_backup_started", {
    appDataRoot,
    appBackupRoot,
    wrongNoteStorageRoot,
  });

  await access(appDataRoot);
  await mkdir(appBackupRoot, { recursive: true });

  const archivePath = resolve(appBackupRoot, `study-project-${formatTimestamp(new Date())}.tar.gz`);

  execFileSync("tar", ["-czf", archivePath, "-C", dirname(appDataRoot), basename(appDataRoot)], {
    stdio: "inherit",
  });

  console.log(`[BACKUP] created ${archivePath}`);
}

main().catch((error) => {
  console.error("[BACKUP] failed", error);
  process.exitCode = 1;
});
