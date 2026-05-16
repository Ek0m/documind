const cp = require('child_process');
const path = require('path');

const targetDir = "C:\\Users\\ekomn\\OneDrive\\Desktop\\New folder\\settlesettle-api";

console.log('Invoking database debug in target:', targetDir);

cp.exec('npx ts-node src/dump-splits.ts', { cwd: targetDir }, (err, stdout, stderr) => {
  if (err) {
    console.error('EXECUTION ERROR:', err.message);
  }
  if (stdout) {
    console.log('=== STDOUT ===\n' + stdout);
  }
  if (stderr) {
    console.error('=== STDERR ===\n' + stderr);
  }
});
