import tagsRepo, { Tag } from "../db/repositories/tags.repo";

const tagService = {
  async list(): Promise<Tag[]> {
    return tagsRepo.findMany();
  },

  async create(data: { name: string; color?: string }): Promise<Tag> {
    return tagsRepo.create(data);
  },

  async update(id: string, data: { name?: string; color?: string }): Promise<Tag | null> {
    return tagsRepo.update(id, data);
  },

  async remove(id: string): Promise<{ id: string } | null> {
    return tagsRepo.delete(id);
  },
};

export default tagService;
