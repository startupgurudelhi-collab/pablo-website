-- PABLO Fashion Studio — Hostinger MySQL / MariaDB Schema
-- Compatible with Hostinger Business Hosting (MySQL 8.0+ / MariaDB 10.6+)
-- Note: The Node.js server also creates these tables automatically and seeds
-- initial content on first startup if the database is empty.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` VARCHAR(40) NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `token` VARCHAR(128) NOT NULL,
  `user_id` VARCHAR(64) NOT NULL,
  `created_at` VARCHAR(40) NOT NULL,
  `expires_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`token`),
  KEY `idx_admin_sessions_user_id` (`user_id`),
  KEY `idx_admin_sessions_expires_at` (`expires_at`),
  CONSTRAINT `fk_admin_sessions_user`
    FOREIGN KEY (`user_id`) REFERENCES `admin_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `slug` VARCHAR(160) NOT NULL,
  `description` TEXT NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `idx_categories_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portfolio_items` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `media_type` VARCHAR(16) NOT NULL,
  `media_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512) NOT NULL,
  `aspect_ratio` VARCHAR(24) NOT NULL DEFAULT 'portrait',
  `category_id` VARCHAR(64) NOT NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` VARCHAR(40) NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_portfolio_category_id` (`category_id`),
  KEY `idx_portfolio_pub_feat` (`published`, `featured`),
  KEY `idx_portfolio_created_at` (`created_at`),
  CONSTRAINT `fk_portfolio_category`
    FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `event_date` VARCHAR(40) NOT NULL,
  `location` VARCHAR(240) NOT NULL,
  `category` VARCHAR(120) NOT NULL,
  `cover_image_url` VARCHAR(512) NOT NULL,
  `video_url` VARCHAR(512) NOT NULL,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `published` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` VARCHAR(40) NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_events_pub_feat` (`published`, `featured`),
  KEY `idx_events_date` (`event_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_media` (
  `id` VARCHAR(64) NOT NULL,
  `event_id` VARCHAR(64) NOT NULL,
  `media_type` VARCHAR(16) NOT NULL,
  `media_url` VARCHAR(512) NOT NULL,
  `thumbnail_url` VARCHAR(512) NOT NULL,
  `caption` VARCHAR(500) NOT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_event_media_event_id` (`event_id`, `sort_order`),
  CONSTRAINT `fk_event_media_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `legal_pages` (
  `id` VARCHAR(64) NOT NULL,
  `slug` VARCHAR(120) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` LONGTEXT NOT NULL,
  `seo_title` VARCHAR(240) NOT NULL,
  `seo_description` TEXT NOT NULL,
  `published` TINYINT(1) NOT NULL DEFAULT 1,
  `last_revised_date` VARCHAR(40) NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legal_pages_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` VARCHAR(64) NOT NULL,
  `brand_name` VARCHAR(120) NOT NULL,
  `logo_url` VARCHAR(512) NOT NULL,
  `favicon_url` VARCHAR(512) NOT NULL,
  `seo_title` VARCHAR(240) NOT NULL,
  `seo_description` TEXT NOT NULL,
  `hero_media_url` VARCHAR(512) NOT NULL,
  `hero_media_type` VARCHAR(16) NOT NULL,
  `hero_headline` VARCHAR(240) NOT NULL,
  `hero_subheadline` VARCHAR(240) NOT NULL,
  `hero_description` TEXT NOT NULL,
  `hero_primary_cta_text` VARCHAR(120) NOT NULL,
  `hero_primary_cta_url` VARCHAR(255) NOT NULL,
  `hero_secondary_cta_text` VARCHAR(120) NOT NULL,
  `hero_secondary_cta_url` VARCHAR(255) NOT NULL,
  `home_intro_kicker` VARCHAR(160) NOT NULL,
  `home_intro_headline` VARCHAR(300) NOT NULL,
  `home_cta_headline` VARCHAR(300) NOT NULL,
  `home_cta_description` TEXT NOT NULL,
  `home_cta_button_text` VARCHAR(120) NOT NULL,
  `home_cta_button_url` VARCHAR(255) NOT NULL,
  `about_headline` VARCHAR(300) NOT NULL,
  `about_content` LONGTEXT NOT NULL,
  `about_craft_note` TEXT NOT NULL,
  `about_image_url` VARCHAR(512) NOT NULL,
  `about_image_type` VARCHAR(16) NOT NULL,
  `contact_headline` VARCHAR(300) NOT NULL,
  `contact_intro` TEXT NOT NULL,
  `contact_form_heading` VARCHAR(200) NOT NULL,
  `contact_form_description` TEXT NOT NULL,
  `contact_form_button_text` VARCHAR(120) NOT NULL,
  `contact_services_json` LONGTEXT NOT NULL,
  `contact_phone` VARCHAR(80) NOT NULL,
  `whatsapp_number` VARCHAR(80) NOT NULL,
  `contact_email` VARCHAR(191) NOT NULL,
  `instagram_url` VARCHAR(350) NOT NULL,
  `address` TEXT NOT NULL,
  `studio_hours` VARCHAR(255) NOT NULL,
  `footer_description` TEXT NOT NULL,
  `footer_copyright` VARCHAR(300) NOT NULL,
  `nav_labels_json` LONGTEXT NOT NULL,
  `social_links_json` LONGTEXT NOT NULL,
  `updated_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(160) NOT NULL,
  `phone` VARCHAR(64) NOT NULL,
  `service_required` VARCHAR(160) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'new',
  `created_at` VARCHAR(40) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_enquiries_status_created` (`status`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
