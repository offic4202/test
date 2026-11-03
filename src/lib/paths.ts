import path from "node:path"

export function dataDir() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data")
}

export function catalogDir() {
  return path.join(dataDir(), "catalog")
}
