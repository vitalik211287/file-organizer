import path from "node:path";
import Scanner from "./lib/scanner.js";
import DuplicateFinder from "./lib/duplicates.js";
import Organizer from "./lib/organizer.js";
import Cleanup from "./lib/cleanup.js";

const AVAILABLE_COMMANDS = ["scan", "duplicates", "organize", "cleanup"];

const getArguments = () => {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    return {
      command: null,
      filePath: null,
    };
  }

  if (command === "organize") {
    const outputIndex = args.indexOf("--output");

    const sourceArguments =
      outputIndex === -1 ? args : args.slice(0, outputIndex);

    const outputArguments =
      outputIndex === -1 ? [] : args.slice(outputIndex + 1);

    return {
      command,
      filePath:
        sourceArguments.length > 0 ? path.join(...sourceArguments) : null,
      outputPath:
        outputArguments.length > 0 ? path.join(...outputArguments) : null,
    };
  }

  if (command === "cleanup") {
    const olderThanIndex = args.indexOf("--older-than");
    const confirm = args.includes("--confirm");

    const flagIndexes = [olderThanIndex, args.indexOf("--confirm")].filter(
      (index) => index !== -1,
    );

    const firstFlagIndex =
      flagIndexes.length > 0 ? Math.min(...flagIndexes) : args.length;

    const pathArguments = args.slice(0, firstFlagIndex);

    return {
      command,
      filePath: pathArguments.length > 0 ? path.join(...pathArguments) : null,
      olderThan: olderThanIndex === -1 ? 90 : Number(args[olderThanIndex + 1]),
      confirm,
    };
  }

  return {
    command,
    filePath: args.length > 0 ? path.join(...args) : null,
  };
};

const getDaysAgo = (date) => {
  const differenceMilliseconds = Date.now() - date.getTime();

  return Math.floor(differenceMilliseconds / (1000 * 60 * 60 * 24));
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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

const validateArguments = ({ command, filePath, outputPath, olderThan }) => {
  if (!command) {
    throw new Error("Command is required.");
  }

  if (!AVAILABLE_COMMANDS.includes(command)) {
    throw new Error(`Unknown command: ${command}`);
  }

  if (!filePath) {
    throw new Error(`Directory path is required for command "${command}".`);
  }

  if (command === "organize" && !outputPath) {
    throw new Error('The organize command requires "--output <directory>".');
  }

  if (command === "cleanup" && (!Number.isFinite(olderThan) || olderThan < 0)) {
    throw new Error('The "--older-than" value must be a non-negative number.');
  }
};

const handleError = (error, targetPath) => {
  if (error.code === "ENOENT") {
    console.error(`❌ Error: Path not found: ${targetPath}`);
  } else if (error.code === "EACCES" || error.code === "EPERM") {
    console.error(`❌ Error: Permission denied: ${targetPath}`);
  } else if (error.code === "EISDIR") {
    console.error(
      `❌ Error: Expected a file but received a directory: ${targetPath}`,
    );
  } else {
    console.error(`❌ Error: ${error.message}`);
  }

  process.exitCode = 1;
};

const argumentsData = getArguments();

const { command, filePath, outputPath, olderThan, confirm } = argumentsData;

const scanner = new Scanner();
const duplicateFinder = new DuplicateFinder();
const organizer = new Organizer();
const cleanup = new Cleanup();

let scannedFiles = 0;
let hashedFiles = 0;
let copiedFiles = 0;
let foundOldFiles = 0;
let deletedFiles = 0;

/* -------------------- SCAN -------------------- */

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

/* ----------------- DUPLICATES ----------------- */

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
        `(${group.copies} copies, ` +
        `${formatSize(group.fileSize)} each):`,
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
    `💾 Total wasted space: ` + `${formatSize(statistics.totalWastedSpace)}`,
  );
});

/* ------------------ ORGANIZE ------------------ */

organizer.on("copy-complete", () => {
  copiedFiles++;

  process.stdout.write(`\rCopying files... ${copiedFiles} files`);
});

organizer.on("copy-error", (fileData) => {
  console.error(
    `\nCopy error for ${fileData.name}: ` + `${fileData.error.message}`,
  );
});

organizer.on("organize-complete", (statistics) => {
  process.stdout.write("\n");

  console.log("\n✅ Organization complete!");
  console.log("\nSummary:");

  for (const [category, count] of Object.entries(statistics.categories)) {
    const categoryPath = path.join(outputPath, category);

    console.log(
      `  ${category.padEnd(10)} ` +
        `${String(count).padStart(4)} files → ` +
        `${categoryPath}`,
    );
  }

  console.log(
    `\nTotal copied: ${statistics.totalFiles} files ` +
      `(${formatSize(statistics.totalSize)})`,
  );
});

/* ------------------- CLEANUP ------------------ */

cleanup.on("file-found", () => {
  foundOldFiles++;
});

cleanup.on("cleanup-ready", (statistics) => {
  console.log(`Found ${statistics.filesCount} files to delete:\n`);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  for (const file of statistics.oldFiles) {
    console.log(file.name);
    console.log(`  Size: ${formatSize(file.size)}`);
    console.log(
      `  Modified: ${file.daysOld} days ago ` + `(${formatDate(file.mtime)})`,
    );
    console.log();
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  console.log(
    `Total: ${statistics.filesCount} files ` +
      `(${formatSize(statistics.totalSize)})`,
  );

  if (!statistics.confirm) {
    console.log("\n⚠️ DRY RUN MODE: No files were deleted.");
    console.log(
      "To actually delete these files, " + "run with --confirm flag.",
    );
  } else if (statistics.filesCount > 0) {
    console.log(
      `\n⚠️ DELETING ${statistics.filesCount} files ` +
        `(${formatSize(statistics.totalSize)}). ` +
        "This action cannot be undone!\n",
    );
  }
});

cleanup.on("file-deleted", () => {
  deletedFiles++;

  process.stdout.write(`\rDeleting... ${deletedFiles}/${foundOldFiles}`);
});

cleanup.on("cleanup-complete", (statistics) => {
  if (!statistics.deleted) {
    return;
  }

  if (statistics.filesCount === 0) {
    console.log("\n✅ Cleanup complete!");
    console.log("No files were deleted.");
    return;
  }

  process.stdout.write("\n");

  console.log("\n✅ Cleanup complete!");

  console.log(
    `Deleted: ${statistics.deletedFilesCount} files ` +
      `(${formatSize(statistics.deletedSize)} freed)`,
  );
});

/* --------------------- CLI -------------------- */

try {
  validateArguments(argumentsData);

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
      console.log(`📦 Organizing: ${filePath}`);
      console.log(`Target: ${outputPath}\n`);

      console.log("Creating folders...");
      console.log("  ✓ Documents/");
      console.log("  ✓ Images/");
      console.log("  ✓ Archives/");
      console.log("  ✓ Code/");
      console.log("  ✓ Videos/");
      console.log("  ✓ Other/\n");

      await organizer.organize(filePath, outputPath);
      break;

    case "cleanup":
      console.log(`🧹 Cleanup: ${filePath}`);
      console.log(`Looking for files older than ` + `${olderThan} days...\n`);

      await cleanup.cleanup(filePath, olderThan, confirm);
      break;
  }
} catch (error) {
  handleError(error, outputPath || filePath || "unknown path");
}
