-- ============================================================================
-- CINEVERSE MySQL 8 Database Schema (cineverse_db)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS cineverse_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cineverse_db;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    avatar_url VARCHAR(500),
    preferred_city VARCHAR(80) DEFAULT 'Chennai',
    preferred_language VARCHAR(40) DEFAULT 'Tamil',
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Movies
CREATE TABLE IF NOT EXISTS movies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    tagline VARCHAR(250),
    language VARCHAR(50) NOT NULL,
    languages_available VARCHAR(200),
    genre VARCHAR(120) NOT NULL,
    duration_minutes INT NOT NULL,
    rating DOUBLE NOT NULL,
    votes_count VARCHAR(30),
    certificate VARCHAR(16),
    release_date VARCHAR(20),
    director VARCHAR(120) NOT NULL,
    cast_list VARCHAR(500),
    description TEXT,
    poster_url VARCHAR(500),
    backdrop_url VARCHAR(500),
    trailer_url VARCHAR(500),
    featured BOOLEAN NOT NULL DEFAULT TRUE,
    now_showing BOOLEAN NOT NULL DEFAULT TRUE,
    formats VARCHAR(120),
    accent_color VARCHAR(20)
);

-- 3. Theatres
CREATE TABLE IF NOT EXISTS theatres (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    city VARCHAR(80) NOT NULL,
    address VARCHAR(300) NOT NULL,
    amenities VARCHAR(300),
    INDEX idx_theatres_city (city)
);

-- 4. Screens
CREATE TABLE IF NOT EXISTS screens (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    theatre_id BIGINT NOT NULL,
    name VARCHAR(120) NOT NULL,
    total_seats INT NOT NULL,
    CONSTRAINT fk_screens_theatre FOREIGN KEY (theatre_id) REFERENCES theatres(id) ON DELETE CASCADE
);

-- 5. Seats
CREATE TABLE IF NOT EXISTS seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    screen_id BIGINT NOT NULL,
    seat_code VARCHAR(12) NOT NULL,
    row_label VARCHAR(6) NOT NULL,
    row_index INT NOT NULL,
    col_number INT NOT NULL,
    category ENUM('ROYAL_RECLINER', 'BALCONY', 'PRIME', 'CLASSIC') NOT NULL,
    pair_group VARCHAR(20),
    UNIQUE KEY uk_screen_seat (screen_id, seat_code),
    CONSTRAINT fk_seats_screen FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
);

-- 6. Shows
CREATE TABLE IF NOT EXISTS shows (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    movie_id BIGINT NOT NULL,
    screen_id BIGINT NOT NULL,
    show_date VARCHAR(20) NOT NULL,
    show_time VARCHAR(20) NOT NULL,
    language VARCHAR(40) NOT NULL,
    format VARCHAR(20) NOT NULL,
    price_multiplier DOUBLE NOT NULL DEFAULT 1.0,
    CONSTRAINT fk_shows_movie FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
    CONSTRAINT fk_shows_screen FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE,
    INDEX idx_shows_movie_date (movie_id, show_date)
);

-- 7. Temporary Seat Locks (with TTL expiration)
CREATE TABLE IF NOT EXISTS seat_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    show_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    expires_at DATETIME NOT NULL,
    UNIQUE KEY uk_lock_show_seat (show_id, seat_id),
    CONSTRAINT fk_lock_show FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE,
    CONSTRAINT fk_lock_seat FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE,
    CONSTRAINT fk_lock_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_reference VARCHAR(40) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL,
    show_id BIGINT NOT NULL,
    ticket_subtotal INT NOT NULL,
    snacks_subtotal INT NOT NULL,
    convenience_fee INT NOT NULL,
    gst_amount INT NOT NULL,
    grand_total INT NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
    qr_payload TEXT,
    qr_code_base64 TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bookings_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_bookings_show FOREIGN KEY (show_id) REFERENCES shows(id)
);

-- 9. Booking Seats (enforces double-booking prevention at database level)
CREATE TABLE IF NOT EXISTS booking_seats (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    show_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    price_paid INT NOT NULL,
    UNIQUE KEY uk_booked_show_seat (show_id, seat_id),
    CONSTRAINT fk_bseat_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_bseat_show FOREIGN KEY (show_id) REFERENCES shows(id),
    CONSTRAINT fk_bseat_seat FOREIGN KEY (seat_id) REFERENCES seats(id)
);

-- 10. Snacks
CREATE TABLE IF NOT EXISTS snacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(140) NOT NULL,
    description VARCHAR(400),
    category VARCHAR(40) NOT NULL,
    price INT NOT NULL,
    image_url VARCHAR(500),
    calories VARCHAR(40),
    is_combo BOOLEAN NOT NULL DEFAULT FALSE,
    veg BOOLEAN NOT NULL DEFAULT TRUE
);

-- 11. Booking Snacks
CREATE TABLE IF NOT EXISTS booking_snacks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL,
    snack_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price INT NOT NULL,
    CONSTRAINT fk_bsnack_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    CONSTRAINT fk_bsnack_snack FOREIGN KEY (snack_id) REFERENCES snacks(id)
);

-- 12. Payments
CREATE TABLE IF NOT EXISTS payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE,
    payment_gateway_ref VARCHAR(100) NOT NULL,
    payment_mode VARCHAR(30) NOT NULL,
    amount INT NOT NULL,
    status ENUM('PENDING', 'SUCCESS', 'DEMO_SUCCESS', 'FAILED') NOT NULL,
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
