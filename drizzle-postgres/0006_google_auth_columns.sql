ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "google_id" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_google_id_unique" UNIQUE("google_id");
