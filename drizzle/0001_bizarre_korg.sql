CREATE TABLE `ad_banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`linkUrl` text NOT NULL,
	`placement` enum('homepage_top','homepage_side','catalog_top','catalog_side','project_page') NOT NULL,
	`status` enum('pending','active','paused','rejected','expired') NOT NULL DEFAULT 'pending',
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`startDate` timestamp,
	`endDate` timestamp,
	`pricePerDay` decimal(10,2) NOT NULL,
	`totalSpent` decimal(10,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ad_banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`description` text,
	`icon` varchar(128),
	`parentId` int,
	`sortOrder` int DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`senderId` int NOT NULL,
	`receiverId` int NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`attachments` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`initiatorId` int NOT NULL,
	`reason` text NOT NULL,
	`status` enum('open','under_review','resolved_customer','resolved_contractor','closed') NOT NULL DEFAULT 'open',
	`adminId` int,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kvorkiId` int,
	`contractorId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favorites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kvorki` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int NOT NULL,
	`title` varchar(512) NOT NULL,
	`slug` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`deliveryDays` int NOT NULL,
	`revisions` int DEFAULT 1,
	`images` json,
	`tags` json,
	`extras` json,
	`status` enum('draft','active','paused','rejected','archived') NOT NULL DEFAULT 'draft',
	`rating` decimal(3,2) DEFAULT '0.00',
	`orderCount` int DEFAULT 0,
	`viewCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kvorki_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`link` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_milestones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','in_progress','delivered','approved','disputed') NOT NULL DEFAULT 'pending',
	`sortOrder` int DEFAULT 0,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_milestones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(32) NOT NULL,
	`customerId` int NOT NULL,
	`contractorId` int NOT NULL,
	`kvorkiId` int,
	`projectId` int,
	`title` varchar(512) NOT NULL,
	`description` text,
	`amount` decimal(10,2) NOT NULL,
	`commission` decimal(10,2) NOT NULL,
	`contractorPayout` decimal(10,2) NOT NULL,
	`status` enum('pending','in_progress','delivered','revision','completed','cancelled','dispute') NOT NULL DEFAULT 'pending',
	`deliveryDays` int,
	`deliveredAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `project_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`proposedPrice` decimal(10,2) NOT NULL,
	`proposedDays` int NOT NULL,
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `project_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`categoryId` int,
	`title` varchar(512) NOT NULL,
	`description` text NOT NULL,
	`budget` decimal(10,2),
	`deadline` timestamp,
	`status` enum('open','in_progress','completed','cancelled') NOT NULL DEFAULT 'open',
	`responseCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`fromUserId` int NOT NULL,
	`toUserId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`type` enum('deposit','withdrawal','escrow_hold','escrow_release','commission','refund','payout') NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`balanceBefore` decimal(12,2) NOT NULL,
	`balanceAfter` decimal(12,2) NOT NULL,
	`status` enum('pending','completed','failed','cancelled') NOT NULL DEFAULT 'pending',
	`description` text,
	`externalId` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(255),
	`avatar` text,
	`bio` text,
	`isCustomer` boolean NOT NULL DEFAULT false,
	`isContractor` boolean NOT NULL DEFAULT false,
	`contractorStatus` enum('freelancer','agency','employee'),
	`phone` varchar(32),
	`city` varchar(128),
	`country` varchar(128),
	`website` text,
	`portfolioLinks` json,
	`skills` json,
	`rating` decimal(3,2) DEFAULT '0.00',
	`completedOrders` int DEFAULT 0,
	`balance` decimal(12,2) DEFAULT '0.00',
	`frozenBalance` decimal(12,2) DEFAULT '0.00',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','owner') NOT NULL DEFAULT 'user';