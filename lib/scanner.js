import fs from "node:fs/promises";
import path from "node:path";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class Scanner extends EventEmitter {
  async scan(filePath) {
    const statistics = {
      filesLength: 0,
      totalSize: 0,
      filesByExtension: {},
      fileAge: {
        last7Days: 0,
        last30Days: 0,
        olderThan90Days: 0,
      },
      fileSizes: [],
      oldestFile: null,
    };

    await walkDirectory(filePath, async (fullPath, file) => {
      const fileStats = await fs.stat(fullPath);

      this.processFile(statistics, file, fullPath, fileStats);
    });

    statistics.fileSizes = statistics.fileSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 3);

    this.emit("scan-complete", statistics);

    return statistics;
  }

  processFile(statistics, file, fullPath, fileStats) {
    const fileSize = fileStats.size;
    const extension = path.extname(file.name).toLowerCase() || "(other)";

    const fileData = {
      name: file.name,
      path: fullPath,
      size: fileSize,
      mtime: fileStats.mtime,
    };

    this.emit("file-found", fileData);

    statistics.filesLength++;
    statistics.totalSize += fileSize;
    statistics.fileSizes.push(fileData);

    this.updateExtensionStatistics(
      statistics.filesByExtension,
      extension,
      fileSize,
    );

    this.updateFileAge(statistics.fileAge, fileStats.mtime);

    this.updateOldestFile(statistics, fileData);
  }

  updateExtensionStatistics(filesByExtension, extension, fileSize) {
    if (!filesByExtension[extension]) {
      filesByExtension[extension] = {
        count: 0,
        size: 0,
      };
    }

    filesByExtension[extension].count++;
    filesByExtension[extension].size += fileSize;
  }

  updateFileAge(fileAge, mtime) {
    const now = new Date();
    const differenceMilliseconds = now - mtime;
    const differenceDays = differenceMilliseconds / (1000 * 60 * 60 * 24);

    if (differenceDays <= 7) {
      fileAge.last7Days++;
    }

    if (differenceDays <= 30) {
      fileAge.last30Days++;
    }

    if (differenceDays > 90) {
      fileAge.olderThan90Days++;
    }
  }

  updateOldestFile(statistics, fileData) {
    if (
      !statistics.oldestFile ||
      fileData.mtime < statistics.oldestFile.mtime
    ) {
      statistics.oldestFile = fileData;
    }
  }
}

export default Scanner;
