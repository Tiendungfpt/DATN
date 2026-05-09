import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Chạy ngay khi module được import (phải là import đầu tiên trong app.js)
 * để process.env có sẵn trước khi các controller singleton đọc biến môi trường.
 */
(function loadEnvForProcess() {
  const cwd = process.cwd();
  const candidates = [
    path.resolve(cwd, ".env"),
    path.resolve(cwd, "TP_BE", ".env"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      return;
    }
  }
  dotenv.config();
})();
