import prisma from "../db/index.js";

type TagPayload = {
  name: string;
};

const tagService = {
  list: () => prisma.tag.findMany(),

  create: (data: TagPayload) =>
    prisma.tag.create({
      data,
    }),

  update: (id: string, data: Partial<TagPayload>) =>
    prisma.tag.update({
      where: { id },
      data,
    }),

  remove: (id: string) =>
    prisma.tag.delete({
      where: { id },
    }),
};

export default tagService;
