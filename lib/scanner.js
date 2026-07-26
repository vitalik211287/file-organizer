import fs from "node:fs/promises";
import path from "node:path";
import EventEmitter from "node:events";

class Scanner extends EventEmitter {
  constructor() {
    super();
  }

  async scan(filePath) {
    let filesLength = 0;
    let totalSize = 0;
    let totalExtensions = [];

    const files = await fs.readdir(filePath, {
      withFileTypes: true,
    });

    for (const file of files) {
      const fullPath = path.join(filePath, file.name);

      if (file.isDirectory()) {
        filesLength += await this.scan(fullPath);
      }

      if (file.isFile()) {
        const stats = await fs.stat(fullPath);
        const sizeInKb = (stats.size / 1024).toFixed(2);
        const creationDate = stats.mtime.toLocaleDateString("uk-UA");

        console.dir(`Файл: ${path.basename(fullPath)}`);
        console.dir(`- Розмір: ${sizeInKb} КБ`);
        console.dir(`- Створено: ${creationDate}`);

        const ext = path.extname(file.name).toLowerCase();

        if (!totalExtensions.includes(ext)) {
          totalExtensions.push(ext);
        }

        filesLength++;
        totalSize += stats.size;

        // повідомляємо про знайдений файл
        this.emit("file-found", {
          name: file.name,
          path: fullPath,
          size: stats.size,
          extension: ext,
        });
      }
    }

    console.log(`Total size: ${(totalSize / 1024 ** 3).toFixed(5)} ГБ`);
    console.log(`Total extensions: ${totalExtensions}`);
    console.log(`Total files: ${filesLength}`);

    // повідомляємо про завершення
    this.emit("scan-complete", {
      filesLength,
      totalSize,
      totalExtensions,
    });

    return filesLength;
  }
}

export default Scanner;



// .import fs from "node:fs/promises";
// import path from "node:path";

// const scanner = async (filePath) => {
//   let filesLength = 0;
//   let totalSize = 0;
//   let totalExtensions = [];

//   const files = await fs.readdir(filePath, {
//     withFileTypes: true,
//   });

//   for (const file of files) {
//     const fullPath = path.join(filePath, file.name);
//     if (file.isDirectory()) {
//       filesLength += await scanner(fullPath);
//     }
//     if (file.isFile()) {
//       const stats = await fs.stat(fullPath);
//       const sizeInKb = (stats.size / 1024).toFixed(2);
//       const creationDate = stats.mtime.toLocaleDateString("uk-UA");

//       console.dir(`Файл: ${path.basename(fullPath)}`);
//       console.dir(`- Розмір: ${sizeInKb} КБ`);
//       console.dir(`- Створено: ${creationDate}`);
//       const ext = path.extname(file.name).toLowerCase();
//       if (!totalExtensions.includes(ext)) {
//         totalExtensions.push(ext);
//       }

//       console.log(`Файл: ${file.name}, Розширення: ${ext}`);
//       console.log(ext);

//       filesLength++;
//       totalSize += stats.size;
//       //   return ext;
//     }
//   }
//   console.log(`Total size: ${(totalSize / 1024 ** 3).toFixed(5)} ГБ`);
//   console.log(`Total extensions:  ${totalExtensions}`);
//   console.log(`Total files: ${filesLength}`);
//   return filesLength;
// };

// export default scanner;
