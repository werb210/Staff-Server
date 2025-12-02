import userTokensRepo from "../db/repositories/userTokens.repo.js";

export const userTokenService = {
  create(userId: string, token: string) {
    return userTokensRepo.create({
      userId,
      token,
      createdAt: new Date(),
    });
  },

  findByToken(token: string) {
    return userTokensRepo.findOne({ token });
  },

  remove(id: string) {
    return userTokensRepo.delete(id);
  },
};

export default userTokenService;
