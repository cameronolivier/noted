import { relations } from "drizzle-orm/relations";

import { notedNotes, notedNoteTags, notedTags, usersInAuth } from "./schema";

export const notedTagsRelations = relations(notedTags, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [notedTags.userId],
    references: [usersInAuth.id],
  }),
  notedNoteTags: many(notedNoteTags),
}));

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  notedTags: many(notedTags),
  notedNotes: many(notedNotes),
}));

export const notedNotesRelations = relations(notedNotes, ({ one, many }) => ({
  usersInAuth: one(usersInAuth, {
    fields: [notedNotes.userId],
    references: [usersInAuth.id],
  }),
  notedNoteTags: many(notedNoteTags),
}));

export const notedNoteTagsRelations = relations(notedNoteTags, ({ one }) => ({
  notedNote: one(notedNotes, {
    fields: [notedNoteTags.noteId],
    references: [notedNotes.id],
  }),
  notedTag: one(notedTags, {
    fields: [notedNoteTags.tagId],
    references: [notedTags.id],
  }),
}));
