import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1746028800000 implements MigrationInterface {
  name = 'CreateNotificationsTable1746028800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Create notifications table ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id"                SERIAL PRIMARY KEY,
        "user_id"           INTEGER NOT NULL,
        "title"             VARCHAR(255) NOT NULL,
        "message"           TEXT NOT NULL,
        "type"              VARCHAR(50) NOT NULL,
        "priority"          VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        "entity_type"       VARCHAR(30),
        "entity_id"         INTEGER,
        "action_url"        VARCHAR(500),
        "channel"           VARCHAR(20) NOT NULL DEFAULT 'IN_APP',
        "status"            VARCHAR(20) NOT NULL DEFAULT 'SENT',
        "is_read"           BOOLEAN NOT NULL DEFAULT FALSE,
        "read_at"           TIMESTAMP,
        "metadata"          JSONB DEFAULT '{}'::jsonb,
        "created_by"        INTEGER,
        "dedupe_key"        VARCHAR(255),
        "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
        "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("user_id")
          REFERENCES "users"("id")
          ON DELETE CASCADE
      )
    `);

    // ── Indexes ────────────────────────────────────────────────────────────

    // Bell badge: fast unread count per user
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_is_read"
        ON "notifications" ("user_id", "is_read")
    `);

    // "My notifications" list sorted by newest
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_user_created_at"
        ON "notifications" ("user_id", "created_at" DESC)
    `);

    // Filter by notification type
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_type"
        ON "notifications" ("type")
    `);

    // Lookup all notifications for a specific entity (e.g. all notifs for RRF #5)
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_entity"
        ON "notifications" ("entity_type", "entity_id")
    `);

    // Delivery status queries (retry queue)
    await queryRunner.query(`
      CREATE INDEX "IDX_notifications_status"
        ON "notifications" ("status")
    `);

    // Unique partial index: prevents duplicate notifications within a time window.
    // NULL dedupe_key values are excluded (partial index), so rows without
    // a dedupe_key never conflict.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_notifications_dedupe_key"
        ON "notifications" ("dedupe_key")
        WHERE "dedupe_key" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first (most are dropped automatically with the table,
    // but explicit removal is cleaner and ensures partial-index cleanup)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_dedupe_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_user_is_read"`);

    // Drop the table (CASCADE drops the FK constraint automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
  }
}
