export async function uploadFile(scope: "public"|"private", key: string, file: File) {
  const url = await fetch(`${API_BASE}/objects/sign?op=put&scope=${scope}&key=${encodeURIComponent(key)}&type=${encodeURIComponent(file.type)}`,
    {}).then(r => r.text());
  const put = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!put.ok) throw new Error(`Upload failed: ${put.status}`);
  return key;
}
export async function viewFile(scope: "public"|"private", key: string) {
  const url = await fetch(`${API_BASE}/objects/sign?op=get&scope=${scope}&key=${encodeURIComponent(key)}`,
    {}).then(r => r.text());
  window.open(url, "_blank", "noopener,noreferrer");
}