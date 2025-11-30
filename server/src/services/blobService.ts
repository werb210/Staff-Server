export type AzureBlobConfig = {
  accountName: string;
  accountKey: string;
  containerName: string;
};

type InitializedBlob = {
  config: AzureBlobConfig;
};

let initializedBlob: InitializedBlob | null = null;

export const initAzureBlob = (config: AzureBlobConfig) => {
  if (!config.accountName || !config.accountKey || !config.containerName) {
    throw new Error('Azure Blob configuration is incomplete.');
  }

  initializedBlob = { config };
  console.log(`✅ Azure Blob initialized for account "${config.accountName}" and container "${config.containerName}"`);
};

export const getAzureBlob = () => {
  if (!initializedBlob) {
    throw new Error('Azure Blob has not been initialized. Call initAzureBlob first.');
  }

  return initializedBlob;
};
