import { relations, sql } from "drizzle-orm"; // Added sql for default functions like now()
import {
  index,
  pgEnum,
  pgSchema, // Added for specifying 'auth' schema
  pgTable,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { lower } from "../utils/drizzle.utils";

/**
 * 1. Define the Postgres enum type “note_status” with possible values.
 * Uses pgEnum to ensure Drizzle will generate a `CREATE TYPE` migration.
 */
export const noteStatusEnum = pgEnum("note_status", [
  "private",
  "public",
  "archived",
  "pinned",
]);

/**
 * This is a Drizzle utility to ensure all tables defined with `createTable`
 * are automatically prefixed with "noted_".
 */
export const createTable = pgTableCreator((name) => `noted_${name}`);

/**
 * Reference to the Supabase 'auth' schema.
 * We define the 'users' table here to match Supabase's auth.users table structure,
 * allowing Drizzle to understand its shape for foreign key references.
 * Drizzle should NOT attempt to create or migrate this table if it's managed by Supabase.
 * Ensure your Drizzle Kit configuration is set up to ignore or not manage the 'auth' schema if necessary.
 */
export const authSchema = pgSchema("auth");
export const users = authSchema.table("users", {
  id: uuid("id").primaryKey().notNull(),
  // You can add other columns from auth.users if you need to reference them in your queries,
  // e.g., email: text('email'),
  // Make sure these definitions match the actual columns in `auth.users`.
});

export const notes = createTable(
  "notes",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    // This will now correctly reference `auth.users.id`
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: text("title").notNull(),
    content: text("content").notNull(),

    status: noteStatusEnum("status").default("private").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
    // Ensures `updated_at` is set on creation and updated automatically by the database
    // whenever the row is updated.
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .default(sql`now()`)
      .notNull()
      .$onUpdate(() => sql`now()`),
  },
  (n) => ({
    userIdx: index("notes_user_idx").on(n.userId),
    titleIdx: index("notes_title_idx").on(n.title), // Indexing titles can be useful for search
  }),
).enableRLS();

export const tags = createTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey().notNull(),
    // This will now correctly reference `auth.users.id`
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Storing as provided, application logic handles lowercasing if needed before insert/query
  },
  (t) => ({
    // Ensures that a tag name is unique for a given user, case-insensitively.
    // For example, 'Work' and 'work' would be considered the same for the same user.
    uniquePerUser: uniqueIndex("tags_user_name_idx").on(
      lower(t.name),
      t.userId,
    ),
  }),
).enableRLS();

export const noteTags = createTable(
  "note_tags",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (nt) => ({
    // Defines a composite primary key using both noteId and tagId
    pk: primaryKey({ columns: [nt.noteId, nt.tagId] }),
  }),
).enableRLS();

/* ─── relations helpers ──────────────────────────────────────────────────── */
// Defines how 'notes' relate to 'noteTags' (one note can have many noteTags entries)
export const noteRelations = relations(notes, ({ many }) => ({
  noteTags: many(noteTags), // Changed from `tags` to `noteTags` for clarity in many-to-many
  // You'll then join through noteTags to get the actual tags.
  // Alternatively, you can use a many-to-many helper if Drizzle has one.
  // Or, more explicitly:
  // tags: many(tags, { linkTableName: noteTags.tableName, linkTableJoinColumns: { notes: noteTags.noteId, tags: noteTags.tagId } })
  // For simplicity, keeping it as connecting to the join table directly.
}));

// Defines how 'tags' relate to 'noteTags' (one tag can be associated with many notes via noteTags)
export const tagRelations = relations(tags, ({ many }) => ({
  noteTags: many(noteTags), // Similar to above, linking to the join table.
}));

// Defines how 'noteTags' (the join table) relates back to 'notes' and 'tags'
export const noteTagRelations = relations(noteTags, ({ one }) => ({
  note: one(notes, {
    fields: [noteTags.noteId],
    references: [notes.id],
  }),
  tag: one(tags, {
    fields: [noteTags.tagId],
    references: [tags.id],
  }),
}));
