
-- Initialize Database
CREATE DATABASE IF NOT EXISTS rentsphere;
USE rentsphere;

-- 1. Owners Table
CREATE TABLE IF NOT EXISTS owners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- 2. Campuses Table
CREATE TABLE IF NOT EXISTS campuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 3. Rooms Table
CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campus_id INT NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    monthly_rent DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'available',
    FOREIGN KEY (campus_id) REFERENCES campuses(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 4. Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    joining_date DATE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- 5. Rent Table
CREATE TABLE IF NOT EXISTS rent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    month VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL,
    rent_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 6. Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rent_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    note TEXT,
    FOREIGN KEY (rent_id) REFERENCES rent(id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- 7. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE ON UPDATE CASCADE
);
