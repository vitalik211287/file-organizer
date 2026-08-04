import path from "node:path";
import Scanner from "./lib/scanner.js";
import DuplicateFinder from "./lib/duplicates.js";
import Organizer from "./lib/organizer.js";
import Cleanup from "./lib/cleanup.js";

const getArguments = () => {
  const [command, ...args] = process.argv.slice(2);

  if (command === "organize") {
    const outputIndex = args.indexOf("--output");

    return {
      command,
      filePath: path.join(...args.slice(0, outputIndex)),
      outputPath: path.join(...args.slice(outputIndex + 1)),
    };
  }

  if (command === "cleanup") {
    const olderThanIndex = args.indexOf("--older-than");

    return {
      command,
      filePath: path.join(...args.slice(0, olderThanIndex)),
      olderThan: olderThanIndex !== -1 ? Number(args[olderThanIndex + 1]) : 90,
      confirm: args.includes("--confirm"),
    };
  }

  return {
    command,
    filePath: path.join(...args),
  };
};
// console.log(getArguments());
const getDaysAgo = (date) => {
  const differenceMilliseconds = Date.now() - date.getTime();

  return Math.floor(differenceMilliseconds / (1000 * 60 * 60 * 24));
};
const formatSize = (bytes) => {
  if (bytes >= 1024 ** 3) {
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  }

  if (bytes >= 1024 ** 2) {
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
  }

  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${bytes} B`;
};

const { command, filePath, outputPath, olderThan, confirm } = getArguments();

// console.log(`Output path: ${outputPath}`);
const scanner = new Scanner();
const duplicateFinder = new DuplicateFinder();
const organizer = new Organizer();
const cleanup = new Cleanup();

let scannedFiles = 0;
let hashedFiles = 0;

scanner.on("file-found", () => {
  scannedFiles++;

  process.stdout.write(`\rProcessing... ${scannedFiles} files`);
});

scanner.on("scan-complete", (statistics) => {
  process.stdout.write("\n");

  console.log("\n📊 Scan Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log(`Total files: ${statistics.filesLength}`);
  console.log(`Total size: ${formatSize(statistics.totalSize)}`);

  console.log("\nBy File Type:");

  for (const [extension, data] of Object.entries(statistics.filesByExtension)) {
    console.log(
      `  ${extension.padEnd(10)} ` +
        `${String(data.count).padStart(4)} files   ` +
        `${formatSize(data.size)}`,
    );
  }

  console.log("\nFile Age:");
  console.log(`  Last 7 days:    ${statistics.fileAge.last7Days} files`);
  console.log(`  Last 30 days:   ${statistics.fileAge.last30Days} files`);
  console.log(`  Older than 90:  ${statistics.fileAge.olderThan90Days} files`);

  console.log("\nLargest files:");

  if (statistics.fileSizes.length === 0) {
    console.log("  No files found");
  } else {
    statistics.fileSizes.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name}    ${formatSize(file.size)}`);
    });
  }

  if (statistics.oldestFile) {
    const daysAgo = getDaysAgo(statistics.oldestFile.mtime);

    console.log(
      `\nOldest file: ${statistics.oldestFile.name} ` +
        `(modified ${daysAgo} days ago)`,
    );
  }
});

duplicateFinder.on("file-processed", () => {
  hashedFiles++;

  process.stdout.write(`\rCalculating hashes... ${hashedFiles} files`);
});

duplicateFinder.on("duplicates-found", (statistics) => {
  process.stdout.write("\n\n");

  console.log(
    `Found ${statistics.groupsCount} duplicate groups ` +
      `(${formatSize(statistics.totalWastedSpace)} wasted):`,
  );

  for (const [index, group] of statistics.groups.entries()) {
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    console.log(
      `Group ${index + 1} ` +
        `(${group.copies} copies, ${formatSize(group.fileSize)} each):`,
    );

    console.log(`  SHA-256: ${group.hash.slice(0, 12)}...`);
    console.log();

    for (const file of group.files) {
      console.log(`  📄 ${file.path}`);
    }

    console.log(`\n  Wasted space: ${formatSize(group.wastedSpace)}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    `💾 Total wasted space: ${formatSize(statistics.totalWastedSpace)}`,
  );
});

let copiedFiles = 0;

organizer.on("copy-complete", () => {
  copiedFiles++;

  process.stdout.write(`\rCopying files... ${copiedFiles} files`);
});

organizer.on("copy-error", (fileData) => {
  console.error(
    `\nПомилка копіювання ${fileData.name}: ${fileData.error.message}`,
  );
});

organizer.on("organize-complete", (statistics) => {
  process.stdout.write("\n");

  console.log("\n✅ Organization complete!");
  console.log("\nSummary:");

  for (const [category, count] of Object.entries(statistics.categories)) {
    const categoryPath = path.join(outputPath, category);

    console.log(
      `  ${category.padEnd(10)} ${String(count).padStart(4)} files → ${categoryPath}`,
    );
  }

  console.log(
    `\nTotal copied: ${statistics.totalFiles} files ` +
      `(${(statistics.totalSize / 1024 ** 3).toFixed(2)} GB)`,
  );
});

try {
  switch (command) {

    case "scan":
      console.log(`📂 Scanning: ${filePath}`);
      await scanner.scan(filePath);
      break;

    case "duplicates":
      console.log(`🔍 Searching for duplicates in: ${filePath}`);
      await duplicateFinder.find(filePath);
      break;

    case "organize":
      console.log(
        `📦 Organizing: ${filePath}
        Target: ${outputPath}`,
      );
      await organizer.organize(filePath, outputPath);
      break;

    case "cleanup": {
      const olderThan = 90;

      console.log(`🧹 Cleanup: ${filePath}`);
      console.log(`Looking for files older than ${olderThan} days...\n`);

      await cleanup.cleanup(filePath, olderThan, confirm);
      break;
    }

    default:
      console.log(`Невідома команда: ${command}`);
      console.log("Доступні команди: scan, duplicates, cleanup");
  }
} catch (error) {
  console.error(`Помилка: ${error.message}`);
}
