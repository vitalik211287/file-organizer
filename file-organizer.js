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
  console.log(`Загальний розмір: ${statistics.totalSize.toFixed(5)} ГБ`);
  console.log("\nЗа типом файлів:");

  for (const [ext, data] of Object.entries(statistics.filesByExtension)) {
    console.log(`${ext}: ${data.count} файлів, ${data.size.toFixed(5)} ГБ`);
  }
});
scanner.on("scan-complete", (statistics) => {
  console.log("File Age:");
  console.log(`  Last 7 days:   ${statistics.fileAge.last7Days}`);
  console.log(`  Last 30 days:  ${statistics.fileAge.last30Days}`);
  console.log(`  Older than 90: ${statistics.fileAge.olderThan90Days}`);
});
scanner.on("scan-complete", (statistics) => {
  console.log("Largest files:");
  console.log(
    statistics.fileSizes
      .map(
        (file, index) =>
          `${index + 1}. ${file.name}    ${(file.size / 1024 ** 2).toFixed(2)} MB`,
      )
      .join("\n"),
  );
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
