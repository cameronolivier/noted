import { sql } from "drizzle-orm";
import {
  foreignKey,
  index,
  pgEnum,
  pgPolicy,
  pgSchema,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const noteStatus = pgEnum("note_status", [
  "private",
  "public",
  "archived",
  "pinned",
]);

export const authSchema = pgSchema("auth");
export const usersInAuth = authSchema.table("users", {
  id: uuid().defaultRandom().primaryKey().notNull(),
});

export const notedTags = pgTable(
  "noted_tags",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    name: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("uq_noted_tags_user_name").using(
      "btree",
      sql`lower(name)`,
      sql`user_id`,
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "noted_tags_user_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_tags", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`(auth.uid() = user_id)`,
    }),
    pgPolicy("update_tags", {
      as: "permissive",
      for: "update",
      to: ["public"],
    }),
    pgPolicy("insert_tags", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
    pgPolicy("select_tags", {
      as: "permissive",
      for: "select",
      to: ["public"],
    }),
  ],
);

export const notedNotes = pgTable(
  "noted_notes",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    title: text().notNull(),
    content: text().notNull(),
    status: noteStatus().default("private").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_noted_notes_title").using(
      "btree",
      table.title.asc().nullsLast().op("text_ops"),
    ),
    index("idx_noted_notes_user").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [usersInAuth.id],
      name: "noted_notes_user_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("delete_notes", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`(auth.uid() = user_id)`,
    }),
    pgPolicy("update_notes", {
      as: "permissive",
      for: "update",
      to: ["public"],
    }),
    pgPolicy("insert_notes", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
    pgPolicy("select_notes", {
      as: "permissive",
      for: "select",
      to: ["public"],
    }),
  ],
);

export const notedNoteTags = pgTable(
  "noted_note_tags",
  {
    noteId: uuid("note_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.noteId],
      foreignColumns: [notedNotes.id],
      name: "noted_note_tags_note_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [notedTags.id],
      name: "noted_note_tags_tag_id_fkey",
    }).onDelete("cascade"),
    primaryKey({
      columns: [table.noteId, table.tagId],
      name: "noted_note_tags_pkey",
    }),
    pgPolicy("delete_note_tags", {
      as: "permissive",
      for: "delete",
      to: ["public"],
      using: sql`(EXISTS ( SELECT 1
   FROM noted_notes nn
  WHERE ((nn.id = noted_note_tags.note_id) AND (nn.user_id = auth.uid()))))`,
    }),
    pgPolicy("insert_note_tags", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
    pgPolicy("select_note_tags", {
      as: "permissive",
      for: "select",
      to: ["public"],
    }),
  ],
);
