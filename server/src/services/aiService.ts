export const aiService = {
  async generateSummary(_user: unknown, appId: string) {
    return `Summary for application ${appId}`;
  },

  async generateInsights(_user: unknown, appId: string) {
    return [`Insight generated for application ${appId}`];
  },
};
