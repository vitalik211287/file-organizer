import path from "node:path";
import cleanup from "./lib/cleanup.js";
import Scanner from "./lib/scanner.js";

const getArguments = () => {
  const [command, ...args] = process.argv.slice(2);

  return {
    command,
    filePath: path.join(...args),
  };
};

const { command, filePath } = getArguments();

const scanner = new Scanner();

scanner.on("file-found", (file) => {
  console.log(`Знайдено файл: ${file.name}`);
});

scanner.on("scan-complete", (statistics) => {
  console.log("\nСканування завершено");
  console.log(`Файлів: ${statistics.filesLength}`);
  console.log(
    `Загальний розмір: ${(statistics.totalSize / 1024 ** 3).toFixed(2)} ГБ`
  );
  console.log(`Розширення: ${statistics.totalExtensions.join(", ")}`);
});

try {
  switch (command) {
    case "cleanup":
      await cleanup(filePath);
      break;

    case "scan":
      await scanner.scan(filePath);
      break;

    default:
      console.log(`Невідома команда: ${command}`);
      console.log("Доступні команди: scan, cleanup");
  }
} catch (error) {
  console.error(`Помилка: ${error.message}`);
}


// import fs from "node:fs/promises";
// import path from "node:path";
// import cleanup from "./lib/cleanup.js";
// import scanner from "./lib/scanner.js";
// import EventEmitter from "node:events";

// const getArguments = () => {
//   const [command, ...args] = process.argv.slice(2);
//   console.log({ command, args });

//   return {
//     command,
//     filePath: path.join(...args),
//   };
// };

// const { command, filePath } = getArguments();

// try {
//   switch (command) {
//     case "cleanup":
//       await cleanup();
//       break;
//     case "scan":
//       const filesCount = await scanner(filePath);
//       scanner.on("file-found", (file) => {
//     console.log(file.name);
// });
//       // console.log(filesCount);
//       break;
//     default:
//       console.log(`Unknown command: ${command}`);
//   }
// } catch (error) {
//   console.error(`Error: ${error.message}`);
// }
