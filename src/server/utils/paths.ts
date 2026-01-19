import path from "path";

export function getBackupsDir() {
  const dir = process.env.BACKUPS_DIR || path.join(process.cwd(), "backups");
  return dir;
}
