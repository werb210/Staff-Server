import * as repo from "../modules/auth/auth.repo";

describe("auth.repo exports", () => {
  test("required exports exist", () => {
    expect(repo.createPasswordReset).toBeDefined();
    expect(repo.consumeRefreshToken).toBeDefined();
    expect(repo.findPasswordReset).toBeDefined();
    expect(repo.incrementTokenVersion).toBeDefined();
    expect(repo.markPasswordResetUsed).toBeDefined();
    expect(repo.recordFailedLogin).toBeDefined();
    expect(repo.resetLoginFailures).toBeDefined();
    expect(repo.revokeRefreshToken).toBeDefined();
    expect(repo.revokeRefreshTokensForUser).toBeDefined();
  });
});
