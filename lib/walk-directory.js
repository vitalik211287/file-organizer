import fs from "node:fs/promises";
import path from "node:path";

const walkDirectory = async (directoryPath, callback) => {
  let entries;

  try {
    entries = await fs.readdir(directoryPath, {
      withFileTypes: true,
    });
  } catch (error) {
    if (error.code === "EPERM" || error.code === "EACCES") {
      console.warn(`⚠️ Skipped inaccessible directory: ${directoryPath}`);
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    try {
      if (entry.isDirectory()) {
        await walkDirectory(fullPath, callback);
      } else if (entry.isFile()) {
        await callback(fullPath, entry);
      }
    } catch (error) {
      if (error.code === "EPERM" || error.code === "EACCES") {
        console.warn(`⚠️ Skipped: ${fullPath}`);
        continue;
      }

      throw error;
    }
  }
};

export default walkDirectory;