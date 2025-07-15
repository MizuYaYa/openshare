export async function getReceiveTempDirHandle() {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle("receive_temp", { create: true });
}

export async function getReceiveFileHandle(name: string, options?: FileSystemGetFileOptions) {
  const receiveTempDir = await getReceiveTempDirHandle();
  return await receiveTempDir.getFileHandle(name, options);
}
