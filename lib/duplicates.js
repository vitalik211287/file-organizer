import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";

class DuplicateFinder extends EventEmitter {
  async find(filePath) {
    const fileHashes = new Map();

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.processFile(fileHashes, fullPath, file);
    });

    this.emit("duplicates-found", fileHashes);

    return fileHashes;
  }

  async processFile(fileHashes, fullPath, file) {
    const digest = await new Promise((resolve, reject) => {
      const readStream = fs.createReadStream(fullPath);
      const hash = crypto.createHash("sha256");

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

    console.log(digest);
  }
}

export default DuplicateFinder;
