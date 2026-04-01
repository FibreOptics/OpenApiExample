import createClient from "openapi-fetch";
import type { paths } from "./api-types.js";

// 1. Create a typed client — baseUrl comes from the OpenAPI schema's `servers`
const client = createClient<paths>({
  baseUrl: "https://jsonplaceholder.typicode.com",
});

async function main() {
  // -------------------------------------------------------
  // GET /posts — list all posts (with optional query filter)
  // -------------------------------------------------------
  console.log("--- GET /posts?userId=1 ---");
  const { data: posts, error: postsError } = await client.GET("/posts", {
    params: { query: { userId: 1 } },
  });

  if (postsError) {
    console.error("Error fetching posts:", postsError);
    return;
  }

  console.log(`Got ${posts.length} posts for userId=1`);
  console.log("First post:", posts[0]?.title);

  // -------------------------------------------------------
  // GET /posts/{id} — get a single post (path params)
  // -------------------------------------------------------
  console.log("\n--- GET /posts/1 ---");
  const { data: post, error: postError } = await client.GET("/posts/{id}", {
    params: { path: { id: 1 } },
  });

  if (postError) {
    console.error("Error fetching post:", postError);
    return;
  }

  console.log("Post title:", post.title);
  console.log("Post body:", post.body.slice(0, 80) + "...");

  // -------------------------------------------------------
  // POST /posts — create a new post (request body)
  // -------------------------------------------------------
  console.log("\n--- POST /posts ---");
  const { data: newPost, error: createError } = await client.POST("/posts", {
    body: {
      userId: 1,
      title: "Hello from openapi-fetch!",
      body: "This post was created with fully typed request/response.",
    },
  });

  if (createError) {
    console.error("Error creating post:", createError);
    return;
  }

  console.log("Created post id:", newPost.id);
  console.log("Created post title:", newPost.title);

  // -------------------------------------------------------
  // PUT /posts/{id} — update a post
  // -------------------------------------------------------
  console.log("\n--- PUT /posts/1 ---");
  const { data: updated, error: updateError } = await client.PUT(
    "/posts/{id}",
    {
      params: { path: { id: 1 } },
      body: {
        userId: 1,
        title: "Updated title",
        body: "Updated body content",
      },
    }
  );

  if (updateError) {
    console.error("Error updating post:", updateError);
    return;
  }

  console.log("Updated post title:", updated.title);

  // -------------------------------------------------------
  // DELETE /posts/{id}
  // -------------------------------------------------------
  console.log("\n--- DELETE /posts/1 ---");
  const { data: deleteResult, error: deleteError } = await client.DELETE(
    "/posts/{id}",
    {
      params: { path: { id: 1 } },
    }
  );

  if (deleteError) {
    console.error("Error deleting post:", deleteError);
    return;
  }

  console.log("Delete response:", deleteResult);

  // -------------------------------------------------------
  // GET /posts/{id}/comments — nested resource
  // -------------------------------------------------------
  console.log("\n--- GET /posts/1/comments ---");
  const { data: comments, error: commentsError } = await client.GET(
    "/posts/{id}/comments",
    {
      params: { path: { id: 1 } },
    }
  );

  if (commentsError) {
    console.error("Error fetching comments:", commentsError);
    return;
  }

  console.log(`Got ${comments.length} comments`);
  comments.slice(0, 2).forEach((c) => {
    console.log(`  - ${c.name} (${c.email})`);
  });
}

main().catch(console.error);
