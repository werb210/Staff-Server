import { vi } from "vitest"

vi.mock("twilio", () => {
  return {
    default: () => ({
      messages: {
        create: vi.fn().mockResolvedValue({ sid: "mock_sid" })
      }
    })
  }
})
