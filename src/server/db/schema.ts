// db/schema.ts
import {
	pgTable,
	pgTableCreator,
	uuid,
	text,
	boolean,
	timestamp,
	index,
	primaryKey
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

/**
 * Supabase auth.users already exists; we just alias its shape
 * so Drizzle can reference the foreign-key column.
 * If you never query it via Drizzle you can omit this table.
 */

export const createTable = pgTableCreator((name) => `noted_${name}`);

export const users = pgTable('users', {
	id: uuid('id').primaryKey().notNull()
})

export const notes = createTable(
	'notes',
	{
		id: uuid('id')
			.defaultRandom()
			.primaryKey()
			.notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		title: text('title').notNull(),
		content: text('content').notNull(),
		isPrivate: boolean('is_private').default(true).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(n) => ({
		userIdx: index('notes_user_idx').on(n.userId),
		searchIdx: index('notes_search_idx').on(n.title, n.content)
	})
)

export const tags = createTable(
	'tags',
	{
		id: uuid('id')
			.defaultRandom()
			.primaryKey()
			.notNull(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		name: text('name').notNull()
	},
	(t) => ({
		uniquePerUser: index('tags_user_name_idx').unique().on(t.userId, t.name)
	})
)

export const noteTags = createTable(
	'note_tags',
	{
		noteId: uuid('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade' }),
		tagId: uuid('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' })
	},
	(nt) => ({
		pk: primaryKey(nt.noteId, nt.tagId)
	})
)

export const noteVersions = createTable(
	'note_versions',
	{
		id: uuid('id')
			.defaultRandom()
			.primaryKey()
			.notNull(),
		noteId: uuid('note_id')
			.notNull()
			.references(() => notes.id, { onDelete: 'cascade' }),
		content: text('content').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull()
	},
	(v) => ({
		noteIdx: index('note_versions_note_idx').on(v.noteId)
	})
)

/* ─── relations helpers ──────────────────────────────────────────────────── */
export const noteRelations = relations(notes, ({ many }) => ({
	tags: many(noteTags),
	versions: many(noteVersions)
}))

export const tagRelations = relations(tags, ({ many }) => ({
	notes: many(noteTags)
}))

export const noteTagRelations = relations(noteTags, ({ one }) => ({
	note: one(notes, {
		fields: [noteTags.noteId],
		references: [notes.id]
	}),
	tag: one(tags, {
		fields: [noteTags.tagId],
		references: [tags.id]
	})
}))

export const noteVersionRelations = relations(noteVersions, ({ one }) => ({
	note: one(notes, {
		fields: [noteVersions.noteId],
		references: [notes.id]
	})
}))
