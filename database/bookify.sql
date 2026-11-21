-- Bookify — Database Schema
-- Run this in phpMyAdmin or via MySQL CLI
-- mysql -u root -p bookify < database/bookify.sql

CREATE DATABASE IF NOT EXISTS bookify
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE bookify;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                              INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  first_name                      VARCHAR(100)    NOT NULL,
  last_name                       VARCHAR(100)    NOT NULL,
  email                           VARCHAR(254)    NOT NULL,
  password_hash                   VARCHAR(255)    NOT NULL,
  contact_number                  VARCHAR(20)     NULL,
  role                            ENUM('customer','seller','staff','admin')
                                                  NOT NULL DEFAULT 'customer',
  is_verified                     TINYINT(1)      NOT NULL DEFAULT 0,
  verification_token              VARCHAR(64)     NULL,
  verification_token_expires_at   DATETIME        NULL,
  resend_requested_at             DATETIME        NULL,
  verified_at                     DATETIME        NULL,
  created_at                      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at                      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                                           ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role),
  KEY idx_users_verification_token (verification_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seller applications ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_applications (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NOT NULL,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  applied_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at  DATETIME     NULL,
  reviewed_by  INT UNSIGNED NULL,
  notes        TEXT         NULL,
  PRIMARY KEY (id),
  KEY idx_seller_applications_user (user_id),
  KEY idx_seller_applications_status (status),
  CONSTRAINT fk_sa_user    FOREIGN KEY (user_id)     REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_sa_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
