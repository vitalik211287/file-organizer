import fs from "node:fs/promises";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class Cleanup extends EventEmitter {
  async cleanup(filePath, olderThan, confirm = false) {
    const oldFiles = [];

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.getOldFiles(oldFiles, fullPath, file, olderThan);
    });

    const totalSize = oldFiles.reduce((sum, file) => sum + file.size, 0);

    const preparedStatistics = {
      oldFiles,
      filesCount: oldFiles.length,
      totalSize,
      confirm,
    };

    this.emit("cleanup-ready", preparedStatistics);

    let deletionResult = {
      deletedFilesCount: 0,
      deletedSize: 0,
    };

    if (confirm) {
      deletionResult = await this.deleteFiles(oldFiles);
    }

    const statistics = {
      ...preparedStatistics,
      deleted: confirm,
      deletedFilesCount: deletionResult.deletedFilesCount,
      deletedSize: deletionResult.deletedSize,
    };

    this.emit("cleanup-complete", statistics);

    return statistics;
  }

  async getOldFiles(oldFiles, fullPath, file, olderThan) {
    const stats = await fs.stat(fullPath);

    const fileAgeMilliseconds = Date.now() - stats.mtime.getTime();

    const daysOld = fileAgeMilliseconds / (1000 * 60 * 60 * 24);

    if (daysOld > olderThan) {
      const fileData = {
        name: file.name,
        path: fullPath,
        size: stats.size,
        mtime: stats.mtime,
        daysOld: Math.floor(daysOld),
      };

      oldFiles.push(fileData);

      this.emit("file-found", fileData);
    }
  }

  async deleteFiles(oldFiles) {
    let deletedFilesCount = 0;
    let deletedSize = 0;

    for (const file of oldFiles) {
      await fs.unlink(file.path);

      deletedFilesCount++;
      deletedSize += file.size;

      this.emit("file-deleted", file);
    }

    return {
      deletedFilesCount,
      deletedSize,
    };
  }
}

export default Cleanup;
