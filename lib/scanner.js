import fs from "node:fs/promises";
import path from "node:path";
import EventEmitter from "node:events";

class Scanner extends EventEmitter {
  async scan(filePath) {
    const statistics = await this.scanDirectory(filePath);

    statistics.fileSizes = statistics.fileSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 3);
    this.emit("scan-complete", statistics);

    return statistics;
  }

  async scanDirectory(filePath) {
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
    };

    const files = await fs.readdir(filePath, {
      withFileTypes: true,
    });

    for (const file of files) {
      const fullPath = path.join(filePath, file.name);

      if (file.isDirectory()) {
        const directoryStatistics = await this.scanDirectory(fullPath);
        // console.log(file.name);
        this.mergeStatistics(statistics, directoryStatistics);
      } else if (file.isFile()) {
        const fileStats = await fs.stat(fullPath);
        // console.log(fileStats);
        this.processFile(statistics, file, fileStats);
      }
    }

    return statistics;
  }

  processFile(statistics, file, fileStats) {
    const fileSizeGb = fileStats.size / 1024 ** 3;
    const extension = path.extname(file.name).toLowerCase() || "other";
    statistics.fileSizes.push({ name: file.name, size: fileStats.size });

    statistics.filesLength++;
    statistics.totalSize += fileSizeGb;

    this.updateExtensionStatistics(
      statistics.filesByExtension,
      extension,
      fileSizeGb,
    );

    this.updateFileAge(statistics.fileAge, fileStats.mtime);
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

  mergeStatistics(statistics, directoryStatistics) {
    statistics.filesLength += directoryStatistics.filesLength;
    statistics.totalSize += directoryStatistics.totalSize;
    statistics.fileSizes.push(...directoryStatistics.fileSizes);
    statistics.fileAge.last7Days += directoryStatistics.fileAge.last7Days;

    statistics.fileAge.last30Days += directoryStatistics.fileAge.last30Days;

    statistics.fileAge.olderThan90Days +=
      directoryStatistics.fileAge.olderThan90Days;

    for (const [extension, data] of Object.entries(
      directoryStatistics.filesByExtension,
    )) {
      if (!statistics.filesByExtension[extension]) {
        statistics.filesByExtension[extension] = {
          count: 0,
          size: 0,
        };
      }

      statistics.filesByExtension[extension].count += data.count;
      statistics.filesByExtension[extension].size += data.size;
    }
  }
}

export default Scanner;
