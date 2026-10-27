CREATE TABLE `websites` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`open_box_url` text NOT NULL,
	`logo_url` text,
	`extractor_key` text,
	`status` text NOT NULL,
	`last_crawl_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `websites_base_url_unique` ON `websites` (`base_url`);--> statement-breakpoint
CREATE TABLE `crawl_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`website_id` text NOT NULL,
	`status` text NOT NULL,
	`pages_received` integer NOT NULL,
	`products_found` integer NOT NULL,
	`new_products` integer NOT NULL,
	`price_drops` integer NOT NULL,
	`error` text,
	`started_at` integer NOT NULL,
	`last_activity_at` integer NOT NULL,
	`finished_at` integer,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `crawl_runs_website_started_idx` ON `crawl_runs` (`website_id`,`started_at`);--> statement-breakpoint
CREATE TABLE `active_runs` (
	`website_id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	FOREIGN KEY (`website_id`) REFERENCES `websites`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_key` text NOT NULL,
	`price_cents` integer NOT NULL,
	`observed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `price_history_product_observed_idx` ON `price_history` (`product_key`,`observed_at`);