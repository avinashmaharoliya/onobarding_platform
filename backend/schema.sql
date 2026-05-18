CREATE TYPE user_role AS ENUM ('employee', 'hr');
CREATE TYPE user_status AS ENUM ('Pending', 'Documents Submitted', 'Approved');
CREATE TYPE doc_status AS ENUM ('Pending', 'Approved', 'Rejected');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'employee',
    joining_date DATE,
    status user_status DEFAULT 'Pending',
    profile_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    dob DATE,
    gender VARCHAR(20),
    address TEXT,
    emergency_contact VARCHAR(200),
    bank_account TEXT,
    pan TEXT,
    education_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE document_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mandatory BOOLEAN DEFAULT TRUE,
    max_size_mb INT DEFAULT 5,
    allowed_extensions VARCHAR(100) DEFAULT 'pdf,jpg,png'
);

INSERT INTO document_types (name, mandatory) VALUES
('Aadhar Card', TRUE),
('PAN Card', TRUE),
('Address Proof', TRUE),
('Degree Certificate', TRUE),
('Experience Letter', FALSE);

CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    document_type_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200),
    mime_type VARCHAR(100),
    status doc_status DEFAULT 'Pending',
    remark TEXT,
    extracted_text TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (document_type_id) REFERENCES document_types(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE checklist_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    mandatory BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0
);

INSERT INTO checklist_items (title, description, sort_order) VALUES
('Sign NDA', 'Download, sign and upload the NDA form', 1),
('Complete IT Setup Form', 'Fill the IT asset request form', 2),
('Read Employee Handbook', 'Read and acknowledge the handbook', 3),
('Submit Bank Details', 'Ensure bank account is filled in profile', 4),
('ID Card Photo Upload', 'Upload passport size photo for ID card', 5);

CREATE TABLE checklist_progress (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    checklist_item_id INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    custom_text TEXT,
    submitted_data JSONB,
    UNIQUE (user_id, checklist_item_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id)
);

CREATE TABLE digital_signatures (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (name, email, role, password_hash) VALUES
('Admin HR', 'hr@company.com', 'hr', '$2a$10$T81K1iZp5O2rO.oF3TWeo.Yh9hFm7eD6XnE3dI5bYQxP/Gj/m7X/G');
