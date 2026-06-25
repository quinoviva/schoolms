import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schools', t => {
    t.text('id').primary()
    t.text('name').notNull()
    t.text('slug').notNull().unique()
    t.text('domain')
    t.boolean('is_active').notNull().defaultTo(true)
    t.text('owner_name').notNull()
    t.text('owner_email').notNull()
    t.specificType('levels', 'text[]').defaultTo('{kinder,elementary,highschool,senior_highschool}')
    t.bigInteger('created_at').notNull()
    t.bigInteger('updated_at')
  })

  await knex.schema.createTable('users', t => {
    t.text('id').primary()
    t.text('email').notNull()
    t.text('name').notNull()
    t.text('role').notNull()
    t.text('section')
    t.text('nfc_uid')
    t.text('lrn')
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('terms', t => {
    t.text('id').primary()
    t.text('label').notNull()
    t.text('semester').notNull()
    t.boolean('is_active').notNull().defaultTo(false)
    t.boolean('is_archived').defaultTo(false)
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('sections', t => {
    t.text('id').primary()
    t.text('name').notNull()
    t.text('grade_level').notNull()
    t.text('school_id').references('id').inTable('schools')
  })

  await knex.schema.createTable('subjects', t => {
    t.text('id').primary()
    t.text('code').notNull()
    t.text('title').notNull()
    t.text('teacher_id').references('id').inTable('users')
    t.text('term_id').references('id').inTable('terms')
    t.text('grade_level').notNull()
    t.jsonb('grading_components').notNull().defaultTo('[]')
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('classes', t => {
    t.text('id').primary()
    t.text('subject_id').references('id').inTable('subjects')
    t.text('section').notNull()
    t.text('teacher_id').references('id').inTable('users')
    t.text('schedule').notNull()
    t.text('room').notNull()
    t.text('term_id').references('id').inTable('terms')
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('enrollments', t => {
    t.text('id').primary()
    t.text('student_id').references('id').inTable('users')
    t.text('class_id').references('id').inTable('classes')
    t.text('term_id').references('id').inTable('terms')
    t.text('school_id').references('id').inTable('schools')
  })

  await knex.schema.createTable('grade_scores', t => {
    t.text('id').primary()
    t.text('student_id').references('id').inTable('users')
    t.text('class_id').references('id').inTable('classes')
    t.text('component_id').notNull()
    t.float('score').notNull()
    t.float('max_score').notNull()
    t.text('school_id').references('id').inTable('schools')
  })

  await knex.schema.createTable('attendance', t => {
    t.text('id').primary()
    t.text('student_id').references('id').inTable('users')
    t.text('class_id').references('id').inTable('classes')
    t.text('date').notNull()
    t.text('status').notNull()
    t.text('remarks').defaultTo('')
    t.text('recorded_by').references('id').inTable('users')
    t.text('school_id').references('id').inTable('schools')
  })

  await knex.schema.createTable('announcements', t => {
    t.text('id').primary()
    t.text('class_id').references('id').inTable('classes')
    t.text('teacher_id').references('id').inTable('users')
    t.text('title').notNull()
    t.text('content').notNull()
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('assignments', t => {
    t.text('id').primary()
    t.text('class_id').references('id').inTable('classes')
    t.text('teacher_id').references('id').inTable('users')
    t.text('title').notNull()
    t.text('description').notNull()
    t.text('due_date').notNull()
    t.float('max_score').notNull()
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('submissions', t => {
    t.text('id').primary()
    t.text('assignment_id').references('id').inTable('assignments')
    t.text('student_id').references('id').inTable('users')
    t.text('file_url').notNull()
    t.text('file_name').notNull()
    t.float('score').nullable()
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('submitted_at').notNull()
    t.bigInteger('graded_at').nullable()
  })

  await knex.schema.createTable('notifications', t => {
    t.text('id').primary()
    t.text('user_id').references('id').inTable('users')
    t.text('type').notNull()
    t.text('message').notNull()
    t.boolean('read').notNull().defaultTo(false)
    t.text('related_id').notNull()
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('grade_releases', t => {
    t.text('id').primary()
    t.text('class_id').references('id').inTable('classes')
    t.text('teacher_id').references('id').inTable('users')
    t.bigInteger('released_at').notNull()
    t.boolean('is_released').notNull().defaultTo(false)
    t.text('school_id').references('id').inTable('schools')
  })

  await knex.schema.createTable('drive_links', t => {
    t.text('id').primary()
    t.text('class_id').references('id').inTable('classes')
    t.text('teacher_id').references('id').inTable('users')
    t.text('title').notNull()
    t.text('drive_url').notNull()
    t.text('drive_file_id').notNull()
    t.text('mime_type')
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
  })

  await knex.schema.createTable('seat_plans', t => {
    t.text('id').primary()
    t.text('class_id').references('id').inTable('classes')
    t.float('canvas_width').notNull()
    t.float('canvas_height').notNull()
    t.jsonb('elements').notNull().defaultTo('[]')
    t.text('school_id').references('id').inTable('schools')
    t.bigInteger('created_at').notNull()
    t.bigInteger('updated_at').notNull()
  })

  await knex.schema.createTable('audit_logs', t => {
    t.text('id').primary()
    t.text('user_id').references('id').inTable('users')
    t.text('user_email').notNull()
    t.text('action').notNull()
    t.text('collection').notNull()
    t.text('document_id').notNull()
    t.text('details').defaultTo('')
    t.bigInteger('timestamp').notNull()
    t.text('school_id').references('id').inTable('schools')
  })
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'audit_logs', 'seat_plans', 'drive_links', 'grade_releases',
    'notifications', 'submissions', 'assignments', 'announcements',
    'attendance', 'grade_scores', 'enrollments', 'classes', 'subjects',
    'sections', 'terms', 'users', 'schools',
  ]
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t)
  }
}
