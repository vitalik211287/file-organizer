import fs from "node:fs/promises";
import path from "node:path";

const scanner = async (pathR) => {
  let filesLength = 0;
  let totalSize = 0;
  let totalExtensions = [];

  const files = await fs.readdir(pathR, {
    withFileTypes: true,
  });

  for (const file of files) {
    if (file.isDirectory()) {
      filesLength += await scanner(path.join(pathR, file.name));
    }
    if (file.isFile()) {
      const stats = await fs.stat(path.join(pathR, file.name));
      const sizeInKb = (stats.size / 1024).toFixed(2);
      const creationDate = stats.birthtime.toLocaleDateString("uk-UA");

      console.dir(`Файл: ${path.basename(path.join(pathR, file.name))}`);
      console.dir(`- Розмір: ${sizeInKb} КБ`);
      console.dir(`- Створено: ${creationDate}`);
      const ext = path.extname(file.name).toLowerCase();
        if (!totalExtensions.includes(ext)) {
          totalExtensions.push(ext);
        }

      console.log(`Файл: ${file.name}, Розширення: ${ext}`);
      console.log(ext );

      filesLength++;
      totalSize += stats.size;
    //   return ext;
    }
  }
  console.log(`Total size: ${(totalSize / 1024 ** 3).toFixed(5)} ГБ`);
  console.log(`Total extensions:  ${totalExtensions}`);
  console.log(`Total files: ${filesLength}`);
  return filesLength;
};

export default scanner;
