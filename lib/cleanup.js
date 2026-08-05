import fs from "node:fs/promises";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class Cleanup extends EventEmitter {
  async cleanup(filePath, olderThan, confirm = false) {
    const oldFiles = [];

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.getOldFiles(
        oldFiles,
        fullPath,
        file,
        olderThan,
      );
    });

    const totalSize = oldFiles.reduce(
      (sum, file) => sum + file.size,
      0,
    );

    if (confirm) {
      await this.deleteFiles(oldFiles);
    }

    const statistics = {
      oldFiles,
      filesCount: oldFiles.length,
      totalSize,
      deleted: confirm,
    };

    this.emit("cleanup-complete", statistics);

    return statistics;
  }

  async getOldFiles(oldFiles, fullPath, file, olderThan) {
    const stats = await fs.stat(fullPath);

    const fileAgeMilliseconds =
      Date.now() - stats.mtime.getTime();

    const daysOld =
      fileAgeMilliseconds / (1000 * 60 * 60 * 24);

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
    for (const file of oldFiles) {
      await fs.unlink(file.path);

      this.emit("file-deleted", file);
    }
  }
}

export default Cleanup;