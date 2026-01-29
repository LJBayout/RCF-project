CREATE TABLE `api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`key` varchar(64) NOT NULL,
	`name` varchar(255),
	`last_used_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `api_keys_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`api_key_id` int NOT NULL,
	`endpoint` varchar(255) NOT NULL,
	`method` varchar(10) NOT NULL,
	`status_code` int NOT NULL,
	`response_time` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `api_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cfr_parts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title_id` int NOT NULL,
	`part_number` int NOT NULL,
	`name` text NOT NULL,
	`subject` text,
	`authority` text,
	`source` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cfr_parts_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_title_part` UNIQUE(`title_id`,`part_number`)
);
--> statement-breakpoint
CREATE TABLE `cfr_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`part_id` int NOT NULL,
	`section_number` varchar(50) NOT NULL,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cfr_sections_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_part_section` UNIQUE(`part_id`,`section_number`)
);
--> statement-breakpoint
CREATE TABLE `cfr_titles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title_number` int NOT NULL,
	`name` text NOT NULL,
	`subject` text,
	`year` int NOT NULL,
	`revised_date` varchar(50),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cfr_titles_id` PRIMARY KEY(`id`),
	CONSTRAINT `cfr_titles_title_number_unique` UNIQUE(`title_number`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan` enum('Free','Pro','Enterprise') NOT NULL DEFAULT 'Free',
	`status` enum('active','cancelled','expired') NOT NULL DEFAULT 'active',
	`stripe_customer_id` varchar(255),
	`stripe_subscription_id` varchar(255),
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `api_keys` ADD CONSTRAINT `api_keys_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `api_usage` ADD CONSTRAINT `api_usage_api_key_id_api_keys_id_fk` FOREIGN KEY (`api_key_id`) REFERENCES `api_keys`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cfr_parts` ADD CONSTRAINT `cfr_parts_title_id_cfr_titles_id_fk` FOREIGN KEY (`title_id`) REFERENCES `cfr_titles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cfr_sections` ADD CONSTRAINT `cfr_sections_part_id_cfr_parts_id_fk` FOREIGN KEY (`part_id`) REFERENCES `cfr_parts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `key_idx` ON `api_keys` (`key`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_key_timestamp_idx` ON `api_usage` (`api_key_id`,`timestamp`);--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `api_usage` (`timestamp`);--> statement-breakpoint
CREATE INDEX `title_part_idx` ON `cfr_parts` (`title_id`,`part_number`);--> statement-breakpoint
CREATE INDEX `part_section_idx` ON `cfr_sections` (`part_id`,`section_number`);--> statement-breakpoint
CREATE INDEX `content_fulltext` ON `cfr_sections` (`content`);--> statement-breakpoint
CREATE INDEX `subject_fulltext` ON `cfr_sections` (`subject`);--> statement-breakpoint
CREATE INDEX `title_number_idx` ON `cfr_titles` (`title_number`);--> statement-breakpoint
CREATE INDEX `user_id_idx` ON `subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `stripe_customer_idx` ON `subscriptions` (`stripe_customer_id`);