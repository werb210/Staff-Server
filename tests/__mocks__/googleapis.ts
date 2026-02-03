export const google = {
  auth: {
    GoogleAuth: jest.fn().mockImplementation(() => ({})),
  },
  sheets: jest.fn(() => ({
    spreadsheets: {
      get: jest.fn(),
      values: {
        get: jest.fn(),
        append: jest.fn(),
      },
    },
  })),
};
