import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1776781548847 implements MigrationInterface {
    name = 'InitialSchema1776781548847'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rrfs" ALTER COLUMN "status_history" SET DEFAULT '[]'::jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "rrfs" ALTER COLUMN "status_history" SET DEFAULT '[]'`);
    }

}
