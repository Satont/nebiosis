import { MigrationInterface, QueryRunner } from "typeorm";

export class initialMigration1665773358633 implements MigrationInterface {
    name = 'initialMigration1665773358633'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "channels" ("id" varchar PRIMARY KEY NOT NULL, "accessToken" varchar NOT NULL, "refreshToken" varchar NOT NULL, "guildId" varchar, "voiceChannelId" varchar)`);
        await queryRunner.query(`CREATE TABLE "twitch_rewards" ("id" varchar PRIMARY KEY NOT NULL, "channelId" varchar NOT NULL, "type" varchar CHECK( "type" IN ('SONG_REQUEST','SKIP_SONG','VOLUME_UP','VOLUME_DOWN') ) NOT NULL, CONSTRAINT "uniqueChannelAndType" UNIQUE ("channelId", "type"))`);
        await queryRunner.query(`CREATE TABLE "temporary_twitch_rewards" ("id" varchar PRIMARY KEY NOT NULL, "channelId" varchar NOT NULL, "type" varchar CHECK( "type" IN ('SONG_REQUEST','SKIP_SONG','VOLUME_UP','VOLUME_DOWN') ) NOT NULL, CONSTRAINT "uniqueChannelAndType" UNIQUE ("channelId", "type"), CONSTRAINT "FK_fa8abf5b54240435b7abab00255" FOREIGN KEY ("channelId") REFERENCES "channels" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_twitch_rewards"("id", "channelId", "type") SELECT "id", "channelId", "type" FROM "twitch_rewards"`);
        await queryRunner.query(`DROP TABLE "twitch_rewards"`);
        await queryRunner.query(`ALTER TABLE "temporary_twitch_rewards" RENAME TO "twitch_rewards"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "twitch_rewards" RENAME TO "temporary_twitch_rewards"`);
        await queryRunner.query(`CREATE TABLE "twitch_rewards" ("id" varchar PRIMARY KEY NOT NULL, "channelId" varchar NOT NULL, "type" varchar CHECK( "type" IN ('SONG_REQUEST','SKIP_SONG','VOLUME_UP','VOLUME_DOWN') ) NOT NULL, CONSTRAINT "uniqueChannelAndType" UNIQUE ("channelId", "type"))`);
        await queryRunner.query(`INSERT INTO "twitch_rewards"("id", "channelId", "type") SELECT "id", "channelId", "type" FROM "temporary_twitch_rewards"`);
        await queryRunner.query(`DROP TABLE "temporary_twitch_rewards"`);
        await queryRunner.query(`DROP TABLE "twitch_rewards"`);
        await queryRunner.query(`DROP TABLE "channels"`);
    }

}
