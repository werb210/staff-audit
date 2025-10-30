import { BlobServiceClient } from "@azure/storage-blob";

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
const containerName = process.env.AZURE_STORAGE_CONTAINER!;
const blobService = BlobServiceClient.fromConnectionString(connectionString);
const container = blobService.getContainerClient(containerName);

export async function uploadToAzure(fileBuffer: Buffer, fileName: string) {
  const blob = container.getBlockBlobClient(fileName);
  await blob.uploadData(fileBuffer);
  return { url: blob.url, name: fileName, container: containerName };
}
