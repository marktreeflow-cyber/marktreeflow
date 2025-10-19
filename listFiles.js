// listFiles.js
// 📂 Menampilkan daftar folder dan file di D:\___MPLAN DASHBOARD\mplan_dashboard_mvp

import fs from "fs";
import path from "path";

// 🔧 Ganti path sesuai lokasi lo
const rootDir = "D:\\___MPLAN DASHBOARD\\mplan_dashboard_mvp";

// Fungsi rekursif untuk ambil semua file & folder
function listFiles(dir, level = 0) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const indent = "  ".repeat(level);
    if (item.isDirectory()) {
      console.log(`${indent}📁 ${item.name}`);
      listFiles(fullPath, level + 1);
    } else {
      console.log(`${indent}📄 ${item.name}`);
    }
  }
}

// Jalankan fungsi
console.log(`\n📂 Daftar isi dari: ${rootDir}\n`);
listFiles(rootDir);
