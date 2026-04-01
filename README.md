# openapi-fetch + TypeScript Guide

---

## What is YAML?

YAML ("YAML Ain't Markup Language") is a **human-readable data format**, like JSON but cleaner. It uses indentation instead of braces and brackets.

### YAML vs JSON side-by-side

```yaml
# YAML                          # Equivalent JSON
name: "Luke"                    # { "name": "Luke",
age: 25                         #   "age": 25,
hobbies:                        #   "hobbies": ["reading", "coding"],
  - reading                     #
  - coding                      #
address:                        #   "address": {
  city: "Austin"                #     "city": "Austin",
  state: "TX"                   #     "state": "TX"
                                #   }
                                # }
```

### Key YAML syntax rules

| Syntax | Meaning | Example |
|--------|---------|---------|
| `key: value` | A property | `title: "Hello"` |
| `- item` | Array item | `- reading` |
| Indentation (2 spaces) | Nesting / hierarchy | child indented under parent |
| `#` | Comment | `# this is ignored` |
| `"200"` | String (quotes force it) | needed when a number should be a string |

### Why YAML over JSON for config/schemas?

- **Readable** — no braces, no commas, no quotes on keys
- **Comments** — JSON doesn't allow comments; YAML does
- **Less noise** — a 100-line JSON config is ~60 lines in YAML
- **Industry standard** — OpenAPI specs, Docker Compose, Kubernetes, CI/CD configs all use YAML

YAML and JSON are **interchangeable** — you can convert between them freely. OpenAPI schemas can be written in either format. YAML is just the convention because it's easier to read and edit by hand.

---

## What is openapi-fetch?

A tiny, type-safe `fetch` wrapper for TypeScript. You give it an OpenAPI schema, and it gives you a client where **every URL, method, parameter, and response is fully typed** — no manual type annotations needed.

---

## Why use this? The problem it solves

### Without openapi-fetch (the manual approach)

```ts
// You write fetch calls by hand
const res = await fetch("https://api.example.com/posts/1");
const data = await res.json();    // data is `any` — no type safety

// Common bugs that slip through:
data.ttle;                        // typo — no error, just undefined at runtime
await fetch("/pots/1");           // wrong URL — no error until production
await fetch("/posts/1", {
    method: "POST",
    body: JSON.stringify({ rating: 5 }),  // wrong field — API returns 400 at runtime
});
```

You'd then write types manually:

```ts
interface Post { id: number; title: string; body: string; userId: number }
const data: Post = await res.json();
```

But these types can **drift** from the real API. The API changes, your types don't, and you get runtime errors.

### With openapi-fetch

```ts
const { data, error } = await client.GET("/posts/{id}", {
    params: { path: { id: 1 } },
});
// data is automatically typed as Post — derived from the schema
// typos, wrong methods, wrong params → compile errors, not runtime errors
```

### Benefits summary

| Benefit | What it means |
|---------|---------------|
| **Type safety** | Compiler catches wrong URLs, methods, params, and body shapes |
| **Auto-completion** | IDE suggests valid paths, params, and fields as you type |
| **Single source of truth** | Types come from the schema — no manual interfaces to maintain |
| **API drift protection** | Regenerate types when the API changes; compiler shows what broke |
| **Zero runtime overhead** | It's just `fetch()` underneath — no heavy HTTP client library |
| **No code generation** | Unlike other tools, it doesn't generate API client code — just types |

---

## openapi-fetch vs Axios

They solve **different problems**. Axios is a general-purpose HTTP client. openapi-fetch is a type-safe wrapper around `fetch` that's driven by an API schema.

### Side-by-side: the same API call

```ts
// ---- Axios ----
import axios from "axios";

interface Post { id: number; userId: number; title: string; body: string }

const res = await axios.get<Post>("https://api.example.com/posts/1");
console.log(res.data.title);
```

```ts
// ---- openapi-fetch ----
import createClient from "openapi-fetch";
import type { paths } from "./api-types.js";

const client = createClient<paths>({ baseUrl: "https://api.example.com" });

const { data, error } = await client.GET("/posts/{id}", {
    params: { path: { id: 1 } },
});
console.log(data.title);
```

### What's different?

| | Axios | openapi-fetch |
|---|---|---|
| **Type safety** | Manual — you write `<Post>` yourself | Automatic — derived from the schema |
| **URL validation** | None — `"/psots/1"` compiles fine | Compile error on invalid paths |
| **Method validation** | None — `axios.post("/posts/1")` compiles even if the API only allows GET | Compile error if method isn't in the schema |
| **Param/body validation** | None — you can send anything | Compile error on wrong shape |
| **Bundle size** | ~13 KB min+gzip | ~2 KB min+gzip (it's just a fetch wrapper) |
| **Runtime engine** | Custom XMLHttpRequest/fetch wrapper | Native `fetch()` directly |
| **Interceptors** | Built-in (`axios.interceptors`) | Use `fetch` middleware pattern |
| **Browser support** | Wider (XMLHttpRequest fallback) | Anywhere `fetch` exists (all modern environments) |
| **Learning curve** | Lower — just call methods | Need to understand OpenAPI schema first |

### When Axios types go wrong

The core issue: Axios types are **trust-based**. You tell it what to expect, and it believes you.

```ts
// Axios: you say it returns Post, Axios trusts you
const res = await axios.get<Post>("/posts/1");

// But what if the API changed and now returns { id, author, content }?
// No error. res.data.title is undefined at runtime.
// Your type says string, reality says undefined. TypeScript can't help.
```

```ts
// openapi-fetch: types come from the schema, not from you
const { data } = await client.GET("/posts/{id}", { params: { path: { id: 1 } } });

// If the API changed, you regenerate types → compiler error immediately
// data.title → "Property 'title' does not exist" — caught before runtime
```

### When to use which?

| Situation | Use |
|-----------|-----|
| API has an OpenAPI/Swagger spec | **openapi-fetch** — you get full type safety for free |
| Quick script, no spec available | **Axios** or plain `fetch` — less setup |
| Third-party API with no spec | **Axios** — you'll write manual types either way |
| You want interceptors, retries, timeouts built-in | **Axios** — more batteries included |
| You want smallest bundle + type safety | **openapi-fetch** — ~2 KB and schema-driven |
| Team shares a backend + frontend monorepo | **openapi-fetch** — backend generates spec, frontend stays in sync |

### Can you use both?

Yes. Some teams use openapi-fetch for their own APIs (where they have a spec) and Axios for third-party APIs (where they don't). They're not competing — they're complementary tools with different strengths.

---

## The Boilerplate / Repeatable Pattern

Every project using openapi-fetch follows the same steps. Here's the pattern:

### Step 1: Install (one time)

```bash
npm install openapi-fetch openapi-typescript typescript tsx
```

### Step 2: Get or write your OpenAPI schema

Either your backend team provides `openapi.yaml`, or you write one. This is the only part that varies per project.

### Step 3: Generate types (run after every schema change)

```bash
npx openapi-typescript openapi.yaml -o api-types.d.ts
```

### Step 4: Create the client (once per API in your code)

```ts
// api/client.ts — this file is the same shape in every project
import createClient from "openapi-fetch";
import type { paths } from "./api-types.js";

export const client = createClient<paths>({
    baseUrl: "https://your-api.com",
});
```

### Step 5: Use the client (the repeating pattern for every call)

```ts
// The pattern: destructure { data, error }, check error, use data
const { data, error } = await client.METHOD("/path", {
    params: { path: { ... }, query: { ... } },   // if needed
    body: { ... },                                 // if POST/PUT
});

if (error) {
    // handle error
    return;
}

// use data — fully typed from here
```

### The boilerplate visualized

```
Every project:
├── openapi.yaml          ← describe your API (or get from backend)
├── api-types.d.ts        ← generated (never edit by hand)
├── client.ts             ← ~5 lines, same pattern every time
└── [your code].ts        ← use client.GET/POST/PUT/DELETE

Every API call:
  const { data, error } = await client.METHOD("/path", options)
  if (error) return            ← guard
  doSomethingWith(data)        ← data is typed
```

That's it. The boilerplate is intentionally tiny — the schema does the heavy lifting.

---

## The 3-Layer Architecture

```
openapi.yaml  ──npx openapi-typescript──>  api-types.d.ts  ──createClient<paths>()──>  client
   (contract)                                (TS types)                                (runtime)
```

| Layer | File | Role |
|-------|------|------|
| Schema | `openapi.yaml` | Describes API endpoints, params, and responses |
| Types | `api-types.d.ts` | Auto-generated TS types that mirror the schema |
| Client | `main.ts` | Type-safe fetch calls using the generated types |

---

## Layer 1: The OpenAPI Schema

The schema (`openapi.yaml`) is the **single source of truth**. It uses a standard format to describe:

- **Paths** — what URLs exist (`/posts`, `/posts/{id}`)
- **Methods** — what HTTP verbs are allowed (`get`, `post`, `put`, `delete`)
- **Parameters** — what you send (path params, query params, request body)
- **Responses** — what you get back (status codes, response body shapes)
- **Components/Schemas** — reusable data models (`Post`, `Comment`)

### Example: defining an endpoint

```yaml
paths:
  /posts/{id}:
    get:
      parameters:
        - name: id
          in: path          # goes in the URL
          required: true
          schema:
            type: integer
      responses:
        "200":
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Post"   # references a reusable type
```

### Parameter locations

| `in:` value | Where it goes | Example |
|-------------|---------------|---------|
| `path` | In the URL | `/posts/{id}` -> `/posts/1` |
| `query` | After `?` | `/posts?userId=1` |
| `header` | HTTP header | `Authorization: Bearer ...` |
| `cookie` | Cookie header | `session=abc123` |

### Reusable schemas

Define once in `components.schemas`, reference with `$ref` everywhere:

```yaml
components:
  schemas:
    Post:
      type: object
      required: [id, userId, title, body]
      properties:
        id:
          type: integer
        userId:
          type: integer
        title:
          type: string
        body:
          type: string
```

---

## Layer 2: Generated Types

Run this command to turn the schema into TypeScript:

```bash
npx openapi-typescript openapi.yaml -o api-types.d.ts
```

This produces three key type groups:

### `paths` — URL + method map

```ts
export interface paths {
    "/posts": {
        get: operations["listPosts"];     // allowed
        post: operations["createPost"];   // allowed
        put?: never;                      // blocked by TypeScript
        delete?: never;                   // blocked by TypeScript
    };
}
```

Methods marked `never` will cause a compile error if you try to use them.

### `components.schemas` — data models

```ts
Post:    { id: number; userId: number; title: string; body: string }
NewPost: { userId: number; title: string; body: string }     // no id — server assigns it
Comment: { id: number; postId: number; name: string; email: string; body: string }
```

### `operations` — the full contract per endpoint

```ts
listPosts: {
    parameters: {
        query?: { userId?: number }    // optional query filter
    };
    requestBody?: never;                // GET requests have no body
    responses: {
        200: {
            content: {
                "application/json": Post[]    // returns array of Posts
            }
        }
    }
}
```

---

## Layer 3: The Client

### Creating the client

```ts
import createClient from "openapi-fetch";
import type { paths } from "./api-types.js";

const client = createClient<paths>({
    baseUrl: "https://jsonplaceholder.typicode.com",
});
```

The `<paths>` generic is what wires up all the type safety.

### Making requests

Every call returns `{ data, error }` — only one will be defined.

#### GET with query params

```ts
const { data, error } = await client.GET("/posts", {
    params: { query: { userId: 1 } },
});
// data is Post[]
```

#### GET with path params

```ts
const { data, error } = await client.GET("/posts/{id}", {
    params: { path: { id: 1 } },
});
// data is Post
```

The `{id}` in the path string tells openapi-fetch to require `path: { id: number }`.

#### POST with request body

```ts
const { data, error } = await client.POST("/posts", {
    body: {
        userId: 1,
        title: "Hello",
        body: "World",
    },
});
// data is Post (with server-assigned id)
```

#### PUT (update)

```ts
const { data, error } = await client.PUT("/posts/{id}", {
    params: { path: { id: 1 } },
    body: {
        userId: 1,
        title: "Updated",
        body: "New content",
    },
});
```

#### DELETE

```ts
const { data, error } = await client.DELETE("/posts/{id}", {
    params: { path: { id: 1 } },
});
```

### Error handling pattern

```ts
const { data, error } = await client.GET("/posts/{id}", {
    params: { path: { id: 1 } },
});

if (error) {
    // error is typed based on the schema's error responses
    console.error(error);
    return;
}

// After the error check, TypeScript narrows `data` to be defined
console.log(data.title);   // safe — no undefined check needed
```

---

## What TypeScript catches for you

| Mistake | What happens |
|---------|-------------|
| `client.GET("/typo")` | Error: `"/typo"` is not a valid path |
| `client.POST("/posts/{id}", ...)` | Error: POST doesn't exist on this path |
| `path: { id: "one" }` | Error: `string` is not assignable to `number` |
| Missing required `body` on POST | Error: `body` is required |
| Extra field in body `{ rating: 5 }` | Error: `rating` does not exist in `NewPost` |
| `data.nonexistent` after GET | Error: property doesn't exist on `Post` |

---

## Commands reference

```bash
# Install dependencies
npm install openapi-fetch openapi-typescript typescript tsx

# Generate types from schema
npx openapi-typescript openapi.yaml -o api-types.d.ts

# Run the example
npx tsx main.ts
```

---

## Workflow when the API changes

1. Update `openapi.yaml` (or get a new one from your API team)
2. Re-run `npx openapi-typescript openapi.yaml -o api-types.d.ts`
3. TypeScript will immediately flag any code that doesn't match the new schema

This is the core value: **the schema drives the types, the types drive the code**. When the API changes, the compiler tells you exactly what broke.
