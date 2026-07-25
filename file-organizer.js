import fs from 'node:fs/promises';
import path from 'node:path';
// // import process.argv from 'node:process';

// const path = process.argv[2];
// console.log(`Cleaning up ${path}...`);
import cleanup from "./lib/cleanup.js";
import scanner from "./lib/scanner.js";

const fullPath = () => {
  const[command, ...args] = process.argv.slice(2);
//   console.log({command, args});

  return path.join(...args);
};

const pathR = fullPath();
// console.log(fullPath());



//  const stats = await fs.stat(pathR);

//     if (stats.isFile()) {
//       const sizeInKb = (stats.size / 1024).toFixed(2);
//       const creationDate = stats.birthtime.toLocaleDateString('uk-UA');

//       console.dir(`Файл: ${path.basename(pathR)}`);
//       console.dir(`- Розмір: ${sizeInKb} КБ`);
//       console.dir(`- Створено: ${creationDate}`);
//     } else if (stats.isDirectory()) {
//       console.log(`${pathR} — це папка, а не файл.`);
//     }




const filesCount = await scanner(pathR);
console.log(filesCount);
await cleanup();
