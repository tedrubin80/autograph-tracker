CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"subject_name" text,
	"url" text NOT NULL,
	"image_url" text,
	"price_cents" integer,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'UNKNOWN' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"event_date" timestamp with time zone,
	"first_seen_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"homepage_url" text NOT NULL,
	"platform" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_scraped_at" timestamp with time zone,
	"last_scrape_error" text
);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listings_shop_external_idx" ON "listings" USING btree ("shop_id","external_id");--> statement-breakpoint
CREATE INDEX "listings_status_idx" ON "listings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_first_seen_idx" ON "listings" USING btree ("first_seen_at");