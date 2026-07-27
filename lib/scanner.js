import fs from "node:fs/promises";
import path from "node:path";
import EventEmitter from "node:events";

class Scanner extends EventEmitter {
  constructor() {
    super();
  }

  async scan(filePath) {
    const statistics = await this.scanDirectory(filePath);

    this.emit("scan-complete", statistics);

    return statistics;
  }

  async scanDirectory(filePath) {
    let filesLength = 0;
    let totalSize = 0;
    let lastChange = null;

    const filesByExtension = {};

    const files = await fs.readdir(filePath, {
      withFileTypes: true,
    });

    for (const file of files) {
      const fullPath = path.join(filePath, file.name);

      if (file.isDirectory()) {
        const directoryStatistics = await this.scanDirectory(fullPath);

        filesLength += directoryStatistics.filesLength;
        totalSize += directoryStatistics.totalSize;

        for (const [ext, data] of Object.entries(
          directoryStatistics.filesByExtension
        )) {
          if (!filesByExtension[ext]) {
            filesByExtension[ext] = {
              count: 0,
              size: 0,
            };
          }

          filesByExtension[ext].count += data.count;
          filesByExtension[ext].size += data.size;
        }

        if (directoryStatistics.lastChange !== null) {
          lastChange = directoryStatistics.lastChange;
        }
      }

      if (file.isFile()) {
        const stats = await fs.stat(fullPath);

        lastChange = stats.mtime.toLocaleString("uk-UA");

        const ext = path.extname(file.name).toLowerCase() || "other";

        if (!filesByExtension[ext]) {
          filesByExtension[ext] = {
            count: 0,
            size: 0,
          };
        }

        filesByExtension[ext].count++;
        filesByExtension[ext].size += stats.size / 1024 ** 3;

        filesLength++;
        totalSize += stats.size / 1024 ** 3;
      }
    }

    return {
      filesLength,
      totalSize,
      filesByExtension,
      lastChange,
    };
  }
}

export default Scanner;