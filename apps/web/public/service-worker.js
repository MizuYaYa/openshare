addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-target-handler") {
    return;
  }

  event.respondWith(
    (async () => {
      const formData = await event.request.formData();
      const files = formData.getAll("files");

      const root = await navigator.storage.getDirectory();
      // OSの共有UIから受け取って、処理が終わるまで一時的に置いておくフォルダが「share_target_temp」
      const shareTargetFolder = await root.getDirectoryHandle("share_target_temp", { create: true });
      const id = Math.random().toString(36).slice(-8);
      const oneTimeFolder = await shareTargetFolder.getDirectoryHandle(id, { create: true });

      for await (const file of files) {
        const fileHandle = await oneTimeFolder.getFileHandle(file.name, { create: true });
        await file.stream().pipeTo(await fileHandle.createWritable());
      }

      return Response.redirect(`/share-target?id=${id}`, 303);
    })(),
  );
});
