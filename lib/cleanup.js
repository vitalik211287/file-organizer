import fs from "node:fs/promises";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class Cleanup extends EventEmitter {
  async cleanup(filePath, olderThan, confirm = false) {
    const oldFiles = [];

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.getOldFiles(oldFiles, fullPath, file, olderThan);
    });

    console.log(oldFiles);

    return oldFiles;
  }

  async getOldFiles(oldFiles, fullPath, file, olderThan) {
    const stats = await fs.stat(fullPath);
    const fileAgeMilliseconds = Date.now() - stats.mtime.getTime();
    const daysOld = fileAgeMilliseconds / (1000 * 60 * 60 * 24);

    if (daysOld > olderThan) {
      const fileData = {
        name: file.name,
        path: fullPath,
        size: stats.size / 1024 / 1024, // Size in GB
        mtime: stats.mtime,
        daysOld: Math.floor(daysOld),
      };

      oldFiles.push(fileData);

      this.emit("file-found", fileData);
    }
  }
}
export default Cleanup;
