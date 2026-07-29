import path from "node:path";
import cleanup from "./lib/cleanup.js";
import Scanner from "./lib/scanner.js";
import DuplicateFinder from "./lib/duplicates.js";

const getArguments = () => {
  const [command, ...args] = process.argv.slice(2);

  return {
    command,
    filePath: path.join(...args),
  };
};

const getDaysAgo = (date) => {
  const differenceMilliseconds = new Date() - date;

  return Math.floor(
    differenceMilliseconds / (1000 * 60 * 60 * 24),
  );
};

const { command, filePath } = getArguments();

const scanner = new Scanner();
const duplicateFinder = new DuplicateFinder();
let processedFiles = 0;

scanner.on("file-found", () => {
  processedFiles++;

  process.stdout.write(`\rProcessing... ${processedFiles} files`);
});                                  

scanner.on("scan-complete", (statistics) => {
  console.log("\nСканування завершено");

  console.log(`Файлів: ${statistics.filesLength}`);

  console.log(
    `Загальний розмір: ${(statistics.totalSize / 1024 ** 3).toFixed(5)} ГБ`,
  );

  console.log("\nЗа типом файлів:");

  for (const [ext, data] of Object.entries(
    statistics.filesByExtension,
  )) {
    console.log(
      `${ext}: ${data.count} файлів, ${(data.size / 1024 ** 3).toFixed(5)} ГБ`,
    );
  }

  console.log("\nFile Age:");

  console.log(
    `  Last 7 days:   ${statistics.fileAge.last7Days}`,
  );

  console.log(
    `  Last 30 days:  ${statistics.fileAge.last30Days}`,
  );

  console.log(
    `  Older than 90: ${statistics.fileAge.olderThan90Days}`,
  );

  console.log("\nLargest files:");

  console.log(
    statistics.fileSizes
      .map(
        (file, index) =>
          `${index + 1}. ${file.name}    ${(file.size / 1024 ** 2).toFixed(2)} MB`,
      )
      .join("\n"),
  );

  if (statistics.oldestFile) {
    const daysAgo = getDaysAgo(statistics.oldestFile.mtime);

    console.log(
      `\nOldest file: ${statistics.oldestFile.name} ` +
        `(modified ${daysAgo} days ago)`,
    );
  }
});

try {
  switch (command) {
    case "cleanup":
      await cleanup(filePath);
      break;

    case "scan":
      console.log(`📂 Scanning: ${filePath}`);
      await scanner.scan(filePath);
      break;

      case "duplicates":
      console.log(`📂 Searching for duplicates in: ${filePath}`);
      await duplicateFinder.find(filePath);
      break;
      

    default:
      console.log(`Невідома команда: ${command}`);
      console.log("Доступні команди: scan, cleanup");
  }
} catch (error) {
  console.error(`Помилка: ${error.message}`);
}