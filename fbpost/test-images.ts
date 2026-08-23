import fs from 'fs';
import path from 'path';
import { IMAGE_FOLDER } from './config';

async function main() {
  if (!fs.existsSync(IMAGE_FOLDER)) {
    console.error('❌ Không tìm thấy folder:');
    console.error(IMAGE_FOLDER);
    process.exit(1);
  }

  const files = fs.readdirSync(IMAGE_FOLDER)
    .filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

  console.log(`\n✅ Tìm thấy ${files.length} ảnh.\n`);

  files.slice(0, 20).forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
  });

  if (files.length > 20) {
    console.log(`\n... và ${files.length - 20} ảnh khác.`);
  }
}

main();