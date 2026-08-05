import EventEmitter from "node:events";
import walkDirectory from "./walk-directory.js";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";

class Organizer extends EventEmitter {
  constructor() {
    super();

    this.categories = {
      Documents: [".pdf", ".docx", ".doc", ".txt", ".md", ".xlsx", ".pptx"],
      Images: [".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".bmp"],
      Archives: [".zip", ".rar", ".tar", ".gz", ".7z"],
      Code: [".js", ".py", ".java", ".cpp", ".html", ".css", ".json"],
      Videos: [".mp4", ".avi", ".mkv", ".mov", ".webm"],
      Other: [],
    };
  }

  async organize(filePath, outputPath) {
    const sourcePath = path.resolve(filePath);
    const targetPath = path.resolve(outputPath);

    if (
      targetPath === sourcePath ||
      targetPath.startsWith(`${sourcePath}${path.sep}`)
    ) {
      throw new Error(
        "Output directory cannot be inside the source directory.",
      );
    }

    const statistics = {
      totalFiles: 0,
      totalSize: 0,
      categories: {
        Documents: 0,
        Images: 0,
        Archives: 0,
        Code: 0,
        Videos: 0,
        Other: 0,
      },
    };

    for (const category of Object.keys(this.categories)) {
      await fs.mkdir(path.join(outputPath, category), {
        recursive: true,
      });
    }

    await walkDirectory(filePath, async (fullPath, file) => {
      await this.processFile(statistics, file, fullPath, outputPath);
    });

    this.emit("organize-complete", statistics);

    return statistics;
  }

  async processFile(statistics, file, fullPath, outputPath) {
    const extension = path.extname(file.name).toLowerCase();
    const category = this.getCategory(extension);
    const fileStats = await fs.stat(fullPath);

    const copied = await this.copyFileToCategory(
      file,
      category,
      outputPath,
      fullPath,
      fileStats.size,
    );

    if (!copied) {
      return;
    }

    statistics.totalFiles++;
    statistics.totalSize += fileStats.size;
    statistics.categories[category]++;
  }

  getCategory(extension) {
    for (const [category, extensions] of Object.entries(this.categories)) {
      if (extensions.includes(extension)) {
        return category;
      }
    }

    return "Other";
  }

  async copyFileToCategory(file, category, outputPath, fullPath, fileSize) {
    const categoryPath = path.join(outputPath, category);

    const uniqueName = await this.generateUniqueName(file.name, categoryPath);

    const destinationPath = path.join(categoryPath, uniqueName);

    const fileData = {
      name: file.name,
      sourcePath: fullPath,
      destinationPath,
      category,
      size: fileSize,
    };

    this.emit("copy-start", fileData);

    try {
      const tenMb = 10 * 1024 * 1024;

      if (fileSize < tenMb) {
        await fs.copyFile(fullPath, destinationPath);
      } else {
        await pipeline(
          fsSync.createReadStream(fullPath),
          fsSync.createWriteStream(destinationPath),
        );
      }

      this.emit("copy-complete", fileData);

      return true;
    } catch (error) {
      this.emit("copy-error", {
        ...fileData,
        error,
      });

      return false;
    }
  }

  async generateUniqueName(fileName, categoryPath) {
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);

    let uniqueName = fileName;
    let counter = 1;

    while (await this.fileExists(path.join(categoryPath, uniqueName))) {
      uniqueName = `${baseName}(${counter})${extension}`;
      counter++;
    }

    return uniqueName;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        return false;
      }

      throw error;
    }
  }
}

export default Organizer;
