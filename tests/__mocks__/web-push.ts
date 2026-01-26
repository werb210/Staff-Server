const sendNotification = jest.fn(() => Promise.resolve());
const setVapidDetails = jest.fn();
const getVapidHeaders = jest.fn(() => ({}));
const generateVAPIDKeys = jest.fn(() => ({
  publicKey: "test-public",
  privateKey: "test-private",
}));

class WebPushError extends Error {}

const supportedContentEncodings = ["aes128gcm"];

const mockModule = {
  sendNotification,
  setVapidDetails,
  getVapidHeaders,
  generateVAPIDKeys,
  WebPushError,
  supportedContentEncodings,
};

export {
  sendNotification,
  setVapidDetails,
  getVapidHeaders,
  generateVAPIDKeys,
  WebPushError,
  supportedContentEncodings,
};

export default mockModule;
