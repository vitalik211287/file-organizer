import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class DuplicateFinder extends EventEmitter {
  async find(filePath) {
    const fileHashes = new Map();

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.processFile(fileHashes, fullPath, file);
    });

    const duplicateGroups = this.getDuplicateGroups(fileHashes);

    const statistics = {
      groups: duplicateGroups,
      groupsCount: duplicateGroups.length,
      totalWastedSpace: duplicateGroups.reduce(
        (total, group) => total + group.wastedSpace,
        0,
      ),
    };

    this.emit("duplicates-found", statistics);

    return statistics;
  }

  async processFile(fileHashes, fullPath, file) {
    const [hash, fileStats] = await Promise.all([
      this.calculateHash(fullPath),
      fsPromises.stat(fullPath),
    ]);

    const fileData = {
      name: file.name,
      path: fullPath,
      size: fileStats.size,
      hash,
    };

    if (!fileHashes.has(hash)) {
      fileHashes.set(hash, []);
    }

    fileHashes.get(hash).push(fileData);

    this.emit("file-processed", fileData);
  }

  calculateHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash("sha256");
      const readStream = fs.createReadStream(filePath);

      readStream.on("data", (chunk) => {
        hash.update(chunk);
      });

      readStream.on("end", () => {
        resolve(hash.digest("hex"));
      });

      readStream.on("error", (error) => {
        reject(error);
      });
    });
  }

  getDuplicateGroups(fileHashes) {
    const groups = [];

    for (const [hash, files] of fileHashes) {
      if (files.length <= 1) {
        continue;
      }

      const fileSize = files[0].size;
      const wastedSpace = fileSize * (files.length - 1);

      groups.push({
        hash,
        files,
        copies: files.length,
        fileSize,
        wastedSpace,
      });
    }

    return groups;
  }
}

export default DuplicateFinder;