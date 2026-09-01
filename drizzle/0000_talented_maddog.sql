CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`external_id` text NOT NULL,
	`title` text NOT NULL,
	`subject_name` text,
	`url` text NOT NULL,
	`image_url` text,
	`price_cents` integer,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'UNKNOWN' NOT NULL,
	`tags` text DEFAULT '' NOT NULL,
	`event_date` integer,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_shop_external_idx` ON `listings` (`shop_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `listings_status_idx` ON `listings` (`status`);--> statement-breakpoint
CREATE INDEX `listings_first_seen_idx` ON `listings` (`first_seen_at`);--> statement-breakpoint
CREATE TABLE `shops` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`homepage_url` text NOT NULL,
	`platform` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_scraped_at` integer,
	`last_scrape_error` text
);
