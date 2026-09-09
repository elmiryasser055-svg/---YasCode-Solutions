CREATE TABLE `license` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`license_key` text NOT NULL,
	`client_id` text NOT NULL,
	`client_name` text NOT NULL,
	`activated_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
