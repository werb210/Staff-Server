import { PutObjectCommand } from "@aws-sdk/client-s3";

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("signed-url"),
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

describe("s3Service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_REGION = "us-east-1";
    process.env.S3_ACCESS_KEY = "test";
    process.env.S3_SECRET_KEY = "test";
  });

  afterEach(() => {
    delete process.env.S3_BUCKET;
    delete process.env.S3_REGION;
    delete process.env.S3_ACCESS_KEY;
    delete process.env.S3_SECRET_KEY;
  });

  test("computeSHA256 produces expected digest", async () => {
    const { computeSHA256 } = await import("../services/s3Service");
    const digest = computeSHA256(Buffer.from("hello"));
    expect(digest).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  test("uploadDocumentToS3 enforces AES256 and checksum", async () => {
    const { uploadDocumentToS3, s3Client } = await import("../services/s3Service");
    const sendSpy = jest.spyOn(s3Client as any, "send").mockResolvedValue({} as any);

    const buffer = Buffer.from("file-body");
    const result = await uploadDocumentToS3("app-123", buffer, "text/plain", "txt");

    expect(result.s3Key).toMatch(/^applications\/app-123\/.+\.txt$/);
    const call = sendSpy.mock.calls[0]?.[0] as PutObjectCommand;
    const input = call.input;
    expect(input?.ServerSideEncryption).toBe("AES256");
    expect(input?.ChecksumSHA256).toBe(Buffer.from(result.checksum, "hex").toString("base64"));
    expect(input?.ContentType).toBe("text/plain");
  });

  test("generatePresignedUrl delegates to presigner", async () => {
    const { generatePresignedUrl } = await import("../services/s3Service");
    const url = await generatePresignedUrl("applications/app-123/file.txt", 60);
    expect(url).toBe("signed-url");
  });
});
