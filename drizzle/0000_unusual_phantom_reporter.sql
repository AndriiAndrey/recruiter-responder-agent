CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` integer NOT NULL,
	`role` text NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer,
	`is_deleted` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `threads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_thread_created_idx` ON `messages` (`thread_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recruiter_name` text NOT NULL,
	`company` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL
);
