import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ input }) => {
      console.log(`Mock create post with name: ${input.name}`);
      return {
        id: Math.floor(Math.random() * 1000),
        name: input.name,
        createdAt: new Date(),
      };
    }),

  getLatest: publicProcedure.query(async () => {
    console.log("Mock getLatest returning a sample post");
    return {
      id: 1,
      name: "My Latest Mock Post from Router",
      createdAt: new Date(),
    };
  }),
});
