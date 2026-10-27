CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`website_id` text NOT NULL,
	`product_key` text NOT NULL,
	`external_id` text,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`url` text NOT NULL,
	`image_url` text,
	`category` text,
	`condition` text NOT NULL,
	`price_cents` integer NOT NULL,
	`full_price_cents` integer,
	`discount_percent` integer,
	`previous_price_cents` integer,
	`available` integer NOT NULL,
	`collected_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `products_website_run_idx` ON `products` (`website_id`,`run_id`);--> statement-breakpoint
CREATE INDEX `products_price_idx` ON `products` (`price_cents`);--> statement-breakpoint
CREATE INDEX `products_search_name_idx` ON `products` (`search_name`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category`);