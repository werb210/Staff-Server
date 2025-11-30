// server/src/services/signNowClient.ts
import axios from 'axios';

const SIGNNOW_BASE = "https://api.signnow.com";

export async function getAccessToken() {
  const response = await axios.post(`${SIGNNOW_BASE}/oauth2/token`, {
    grant_type: "client_credentials",
    client_id: process.env.SIGNNOW_CLIENT_ID,
    client_secret: process.env.SIGNNOW_CLIENT_SECRET,
  });

  return response.data.access_token;
}

export async function createDocumentFromUpload(accessToken: string, pdfBuffer: Buffer) {
  const resp = await axios.post(`${SIGNNOW_BASE}/document`, pdfBuffer, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
    },
  });

  return resp.data.id;
}

export async function createEmbeddedInvite(accessToken: string, documentId: string, email: string) {
  const resp = await axios.post(
    `${SIGNNOW_BASE}/document/${documentId}/embedded-invite`,
    {
      to: [{ email }],
      from: email,
      role: "signer",
      authentication_type: "none",
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return resp.data; // contains embedded invite link
}

export async function downloadSignedDocument(accessToken: string, documentId: string) {
  const resp = await axios.get(`${SIGNNOW_BASE}/document/${documentId}/download`, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return Buffer.from(resp.data);
}
