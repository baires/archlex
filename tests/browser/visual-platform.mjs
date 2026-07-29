export function visualSnapshotsSupported(platform = process.platform) {
  return platform === "darwin";
}
