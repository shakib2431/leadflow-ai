const fs = require('fs');
const path = require('path');

// Usage: node scripts/restore_hrms_backup.js <backupFolder> [--dry]
async function copyRecursive(src, dest) {
  const stat = await fs.promises.stat(src);
  if (stat.isDirectory()) {
    await fs.promises.mkdir(dest, { recursive: true });
    const entries = await fs.promises.readdir(src);
    for (const e of entries) {
      await copyRecursive(path.join(src, e), path.join(dest, e));
    }
  } else {
    await fs.promises.copyFile(src, dest);
  }
}

async function main() {
  const backup = process.argv[2];
  const dry = process.argv.includes('--dry');
  if (!backup) {
    console.error('Specify backup folder: node scripts/restore_hrms_backup.js backups/hrms-backup-YYYY-MM-DD');
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, '..');
  const src = path.resolve(repoRoot, backup);
  if (!fs.existsSync(src)) {
    console.error('Backup path not found:', src);
    process.exit(1);
  }

  console.log('Restoring from', src);
  if (dry) { console.log('[dry run] Listing files:'); }

  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const from = path.join(src, e.name);
    const to = path.join(repoRoot, e.name);
    if (dry) console.log(from, '->', to);
    else {
      await copyRecursive(from, to);
      console.log('Copied', from, '->', to);
    }
  }

  console.log('Restore complete. Run tests/build to verify.');
}

main().catch(err => { console.error(err); process.exit(2); });
