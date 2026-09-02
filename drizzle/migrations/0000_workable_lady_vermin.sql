CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`old_value` text,
	`new_value` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `cash_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`type` text NOT NULL,
	`amount` real NOT NULL,
	`related_sale_id` integer,
	`description` text,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `cash_register_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`related_sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cash_register_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`opened_by` integer NOT NULL,
	`opened_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`opening_amount` real DEFAULT 0 NOT NULL,
	`closed_by` integer,
	`closed_at` text,
	`expected_amount` real,
	`actual_amount` real,
	`difference` real,
	`status` text DEFAULT 'open' NOT NULL,
	`notes` text,
	FOREIGN KEY (`opened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer,
	`category` text NOT NULL,
	`amount` real NOT NULL,
	`description` text,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `cash_register_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`barcode` text,
	`is_barcode_generated` integer DEFAULT false NOT NULL,
	`name` text NOT NULL,
	`category_id` integer,
	`unit_type` text NOT NULL,
	`weight_unit` text,
	`purchase_price` real DEFAULT 0 NOT NULL,
	`selling_price` real NOT NULL,
	`current_quantity` real DEFAULT 0 NOT NULL,
	`low_stock_threshold` real DEFAULT 5 NOT NULL,
	`expiry_date` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `purchase_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`purchase_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`unit_cost` real NOT NULL,
	`line_total` real NOT NULL,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `purchases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`invoice_number` text,
	`total_amount` real NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'unpaid' NOT NULL,
	`purchase_date` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `returns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_item_id` integer NOT NULL,
	`quantity` real NOT NULL,
	`reason` text,
	`refund_amount` real NOT NULL,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sale_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_id` integer NOT NULL,
	`product_id` integer,
	`product_name_snapshot` text NOT NULL,
	`barcode_snapshot` text,
	`unit_type` text NOT NULL,
	`quantity` real NOT NULL,
	`unit_price` real NOT NULL,
	`cost_price_snapshot` real NOT NULL,
	`line_total` real NOT NULL,
	FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `sales` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sale_number` text NOT NULL,
	`cashier_id` integer NOT NULL,
	`cash_register_session_id` integer NOT NULL,
	`subtotal` real NOT NULL,
	`discount` real DEFAULT 0 NOT NULL,
	`total` real NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`cancelled_at` text,
	`cancelled_by` integer,
	`cancel_reason` text,
	`print_count` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`cashier_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cash_register_session_id`) REFERENCES `cash_register_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity_change` real NOT NULL,
	`quantity_after` real NOT NULL,
	`reason` text,
	`reference_type` text,
	`reference_id` integer,
	`user_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `supplier_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_id` integer NOT NULL,
	`purchase_id` integer,
	`amount` real NOT NULL,
	`payment_date` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`notes` text,
	`user_id` integer,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`purchase_id`) REFERENCES `purchases`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`notes` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_log_entity_idx` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `cash_movements_session_idx` ON `cash_movements` (`session_id`);--> statement-breakpoint
CREATE INDEX `cash_sessions_status_idx` ON `cash_register_sessions` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `products_barcode_idx` ON `products` (`barcode`);--> statement-breakpoint
CREATE INDEX `products_name_idx` ON `products` (`name`);--> statement-breakpoint
CREATE INDEX `products_expiry_idx` ON `products` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `products_category_idx` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `purchases_supplier_idx` ON `purchases` (`supplier_id`);--> statement-breakpoint
CREATE INDEX `purchases_status_idx` ON `purchases` (`status`);--> statement-breakpoint
CREATE INDEX `sale_items_sale_idx` ON `sale_items` (`sale_id`);--> statement-breakpoint
CREATE INDEX `sale_items_product_idx` ON `sale_items` (`product_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sales_sale_number_idx` ON `sales` (`sale_number`);--> statement-breakpoint
CREATE INDEX `sales_created_at_idx` ON `sales` (`created_at`);--> statement-breakpoint
CREATE INDEX `sales_session_idx` ON `sales` (`cash_register_session_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_product_idx` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_created_at_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE INDEX `supplier_payments_supplier_idx` ON `supplier_payments` (`supplier_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_idx` ON `users` (`username`);