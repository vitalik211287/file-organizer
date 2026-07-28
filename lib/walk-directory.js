import fs from "node:fs/promises";
import path from "node:path";

const walkDirectory = async (directoryPath, callback) => {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await walkDirectory(fullPath, callback);
    } else if (entry.isFile()) {
      await callback(fullPath, entry);
    }
  }
};

export default walkDirectory;