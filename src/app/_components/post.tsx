"use client";

/* eslint-disable-next-line */
// eslint-disable-next-line react-hooks/rules-of-hooks, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function, react-hooks/exhaustive-deps, react/destructuring-assignment
import { useState } from "react";

import { api } from "~/trpc/react";

export function LatestPost() {
  const [latestPost] = [{ name: "tom" }]; //api.post.getLatest.useSuspenseQuery();

  const utils = api.useUtils();
  const [name, setName] = useState("");
  const createPost = {
    mutate: (obj: { name: string }) => {},
    isPending: false,
  };
  // const createPost = api.post.create.useMutation({
  //   onSuccess: async () => {
  //     await utils.post.invalidate();
  //     setName("");
  //   },
  // });

  return (
    <div className="w-full max-w-xs">
      {latestPost ? (
        <p className="truncate">Your most recent post: {latestPost.name}</p>
      ) : (
        <p>You have no posts yet.</p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          createPost.mutate({ name });
        }}
        className="flex flex-col gap-2"
      >
        <input
          type="text"
          placeholder="Title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-full bg-white/10 px-4 py-2 text-white"
        />
        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
          disabled={createPost.isPending}
        >
          {createPost.isPending ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
