# Global Personal Information Form

> A clean, responsive, production-ready, beginner-friendly full-stack application built with **React (Vite)**, **Node.js (Express)**, and **MySQL**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture & Folder Structure](#architecture--folder-structure)
3. [Technology Stack](#technology-stack)
4. [Key Implementation & Design Decisions](#key-implementation--design-decisions)
   - [Frontend Validation vs. Backend Validation vs. Database Constraints](#1-three-tier-validation-strategy)
   - [Internationalization & Arabic RTL Support](#2-multilingual-support--arabic-rtl)
   - [Global Phone-Number Validation](#3-international-phone-number-validation)
   - [Country-Aware Postal/ZIP Code Validation](#4-country-aware-postal-code-validation)
   - [Unicode-Safe Full Name Handling](#5-unicode-safe-full-name-handling)
   - [Email Validation vs. Deliverability](#6-email-validation-vs-deliverability)
   - [MySQL Integration & SQL Injection Defense](#7-mysql-persistence--sql-injection-defense)
   - [Centralized Exception Handling & Safe Error Responses](#8-centralized-error-handling)
5. [Setup & Running Instructions](#setup--running-instructions)
6. [Running the Test Suites](#running-the-test-suites)
7. [Instructor Demonstration Checklist](#instructor-demonstration-checklist)
8. [Frequently Asked Questions (Instructor Q&A Guide)](#frequently-asked-questions-instructor-qa-guide)

---

## Project Overview

The **Global Personal Information Form** is a single-page application tailored for users across different countries and languages. It presents exactly 9 ordered form fields, a global language selector in the header, real-time validation, responsive styling, and persistent storage in MySQL.

### The Nine Ordered Form Fields:
1. **Full Name** (Required) — Supports Unicode scripts, accented characters, hyphens, and apostrophes; rejects numbers.
2. **Email Address** (Required) — Validates format and normalizes the domain.
3. **Country of Residence** (Required) — Searchable/selectable ISO country selector that dynamically powers phone calling codes and postal validations.
4. **Mobile Number** (Required) — Validated per country numbering plan using `libphonenumber-js` and stored in standardized E.164 format.
5. **Date of Birth** (Required) — Rejects future dates using UTC date comparison.
6. **Gender** (Optional) — Respectful dropdown (`male`, `female`, `other`, `prefer_not_to_say`).
7. **City/Town** (Required) — Supports international character sets.
8. **Postal/ZIP Code** (Optional) — Country-aware syntax checking with documented fallback.
9. **Preferred Language** (Optional) — Dropdown for user's communication preference (`en`, `hi`, `fr`, `es`, `ar`).

---

## Architecture & Folder Structure

```text
GlobalFormNew/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── __tests__/
│   │   │   └── PersonalInfoForm.test.jsx   # 15 React Testing Library integration tests
│   │   ├── components/
│   │   │   ├── Header.jsx                 # Top brand bar and language switcher
│   │   │   ├── LanguageSelector.jsx       # 5-language dropdown
│   │   │   ├── PersonalInfoForm.jsx       # Main form with 9 fields and single submit button
│   │   │   └── FormField.jsx              # Accessible, reusable label/input/error wrapper
│   │   ├── i18n/
│   │   │   ├── i18n.js                    # i18next configuration & RTL direction sync
│   │   │   └── locales/
│   │   │       ├── en.json                # English strings
│   │   │       ├── hi.json                # Hindi strings (हिंदी)
│   │   │       ├── fr.json                # French strings (Français)
│   │   │       ├── es.json                # Spanish strings (Español)
│   │   │       └── ar.json                # Arabic strings (العربية)
│   │   ├── services/
│   │   │   └── formService.js             # HTTP API client for POST /api/personal-info
│   │   ├── styles/
│   │   │   └── form.css                   # Responsive layout, focus rings, RTL rules
│   │   ├── validation/
│   │   │   └── formSchema.js              # Zod validation schema + phone/postal logic
│   │   ├── App.jsx                        # Main root layout
│   │   ├── main.jsx                       # Application bootstrapping
│   │   └── setupTests.js                  # Jest-DOM matchers for Vitest
│   ├── .env.example                       # Example frontend environment configuration
│   ├── index.html                         # HTML template with standard viewport & metadata
│   ├── package.json                       # Client dependencies and scripts
│   └── vite.config.js                     # Vite build & test configuration
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js                # mysql2/promise connection pool & health check
│   │   ├── controllers/
│   │   │   └── formController.js          # HTTP handler for POST /api/personal-info (201, 400, 409, 500)
│   │   ├── middleware/
│   │   │   └── errorHandler.js            # Centralized error handler (hides stack traces)
│   │   ├── routes/
│   │   │   └── formRoutes.js              # Route definitions
│   │   ├── schemas/
│   │   │   └── formSchema.js              # Server-side Zod validation schema
│   │   ├── services/
│   │   │   └── formService.js             # Duplicate checking & parameterized insert queries
│   │   ├── utils/
│   │   │   ├── fingerprint.js             # Deterministic SHA-256 canonical 9-field hash
│   │   │   └── phoneValidator.js          # libphonenumber-js parsing & E.164 normalization
│   │   ├── app.js                         # Express app (helmet, cors, routes, error middleware)
│   │   └── server.js                      # Server bootstrapper & DB check
│   ├── tests/
│   │   ├── formApi.test.js                # Supertest backend API unit/integration tests
│   │   └── fingerprint.test.js            # Unit tests for canonical hashing & normalization
│   ├── migration_add_fingerprint.sql      # Safe migration to add fingerprint column & unique index
│   ├── schema.sql                         # MySQL database creation and table DDL
│   ├── .env.example                       # Example backend environment variables
│   └── package.json                       # Server dependencies and scripts
│
├── .gitignore                             # Excludes node_modules, .env files, build artifacts
└── README.md                              # Complete architectural documentation & guide
```

---

## Technology Stack

### Frontend
- **React 18** with **Vite**: Ultra-fast dev server and bundle compilation.
- **React Hook Form**: Performant, uncontrolled form state management that minimizes component re-renders.
- **Zod & @hookform/resolvers**: Strongly-typed schema definition and seamless resolver bridge.
- **libphonenumber-js**: Google's libphonenumber ported to pure JavaScript for country-aware phone parsing and validation.
- **validator**: Battle-tested validation library for email and postal-code verification.
- **i18next & react-i18next**: Multilingual localization supporting English, Hindi, French, Spanish, and Arabic.
- **Vitest & React Testing Library**: Component testing and user-interaction assertions.

### Backend
- **Node.js (v22+)** & **Express**: High-performance RESTful API service.
- **mysql2/promise**: Connection pooling with Promise API and native prepared statements.
- **Zod**: Strict request body validation on the server.
- **Helmet**: Secures Express apps by setting various HTTP headers (X-Frame-Options, X-Content-Type-Options, etc.).
- **CORS**: Enforces origin restrictions, allowing only the trusted client URL.
- **Vitest & Supertest**: Automated integration testing of HTTP routes.

---

## Key Implementation & Design Decisions

### 1. Three-Tier Validation Strategy
- **Frontend Validation**: Provides instant, inline visual feedback so users don't have to wait for a network roundtrip. It enhances usability.
- **Backend Validation**: Treats all incoming HTTP requests as untrusted. Anyone can use curl, Postman, or disabled JavaScript to bypass client checks. The server re-validates every field using Zod.
- **Database Constraints**: Defines columns (`NOT NULL`, `VARCHAR` lengths, charset `utf8mb4`) as the ultimate layer of defense to guarantee data integrity.

### 2. Multilingual Support & Arabic RTL
- 5 separate JSON files (`en.json`, `hi.json`, `fr.json`, `es.json`, `ar.json`) provide natural, contextual translations.
- When Arabic (`ar`) is selected:
  1. `i18n.js` detects the change and sets `<html dir="rtl" lang="ar">`.
  2. CSS uses logical properties (`border-start-start-radius`, `border-inline-end`) and `html[dir="rtl"]` selectors to automatically mirror inputs, labels, calling code tags, and button alignment.
- **Important**: Switching languages never reloads the page or loses values the user already entered into the form.

### 3. International Phone-Number Validation
- **The Pitfall**: A generic regex like `/^\d{10}$/` falsely rejects valid numbers from Singapore (8 digits), Australia (9 digits), Germany, or the UK.
- **The Solution**: We integrate `libphonenumber-js`:
  - Dynamically extracts the international calling code (e.g. `+91` for India, `+34` for Spain) based on the user's selected country.
  - Formats valid numbers into the standard **E.164 format** (e.g. `+14155552671`) before saving to MySQL.
  - Re-evaluates phone validity whenever the country dropdown changes.

### 4. Country-Aware Postal-Code Validation
- **Challenge**: Over 50 countries (e.g., UAE, Qatar, Bahrain, Hong Kong) do not use postal codes. Other countries use alphanumeric codes (e.g., UK `SW1A 1AA`, Canada `K1A 0B1`), while the US uses 5 digits.
- **The Solution**:
  1. Since Postal Code is optional, a blank field is always accepted.
  2. For countries indexed in `validator.isPostalCode` (~70 countries), we validate against the exact country locale regex.
  3. For countries not indexed, we apply a **documented permissive fallback** (`^[A-Za-z0-9\s-]{2,12}$`) so international users are never falsely locked out.
  4. Note for the instructor: Syntax validation verifies string format; verifying that a postal code physically exists at an address requires a dedicated commercial service (e.g., Google Maps Geocoding API).

### 5. Unicode-Safe Full Name Handling
- English-only regular expressions (`/^[a-zA-Z ]+$/`) break on international names (e.g. José, Müller, أحمد, राहुल).
- We use modern Unicode Property Escapes:
  `^[\p{L}\p{M}\s'-]+$`
  - `\p{L}`: Matches letters in any script (Latin, Devanagari, Arabic, etc.).
  - `\p{M}`: Matches combining marks (such as Hindi matras and Arabic harakat).
  - Explicitly rejects digits (`0-9`, `\p{N}`).

### 6. Email Validation vs. Deliverability
- Syntax validation ensures that an email conforms to the standard address specification (`user@domain.com`).
- It does **not** prove that an inbox exists or is deliverable. Real-world deliverability requires sending a verification email with a one-time link or OTP.

### 7. MySQL Persistence & SQL Injection Defense
- We use `mysql2/promise` with a connection pool.
- All inserts use **parameterized queries** with prepared statements:
  ```javascript
  const sql = `INSERT INTO personal_information (...) VALUES (?, ?, ?, ...)`;
  await pool.execute(sql, [fullName, email, countryCode, ...]);
  ```
- **Why this is secure**: The SQL statement and parameter values are sent to the database engine in separate protocol packets. User input is treated strictly as literal data, making SQL injection impossible.

### 8. Centralized Error Handling
- Located in `server/src/middleware/errorHandler.js`.
- Catches:
  - Malformed JSON (returns `400 Bad Request`).
  - Database outages (`ECONNREFUSED` returns `503 Service Unavailable`).
  - Concurrent duplicate inserts (`ER_DUP_ENTRY` returns `409 Conflict`).
- **Security Rule**: Internal database credentials and stack traces are logged to the server console for developers but are **never returned to the client browser**.

### 9. Duplicate Submission Prevention Strategy
- **Definition of a Duplicate**: An exact match on all **nine** normalized form fields (FullName, Email, CountryCode, MobileNumber, DateOfBirth, Gender, City, PostalCode, PreferredLanguage).
- **Canonical Fingerprint**: A deterministic SHA-256 hash computed in `server/src/utils/fingerprint.js`.
  - Normalized fields are joined using `\x1F` (ASCII Unit Separator).
  - Nullable optional fields use consistent `'__NULL__'` markers.
  - Case and whitespace normalization ensure cosmetic differences don't bypass detection.
- **Two-Layer Protection**:
  1. *Application Layer*: Pre-insert `SELECT id FROM personal_information WHERE submission_fingerprint = ? LIMIT 1;`. If found, returns HTTP `409 Conflict` with `code: "DUPLICATE_USER"`.
  2. *Database Layer*: `UNIQUE INDEX uq_submission_fingerprint (submission_fingerprint)`. Under concurrent/simultaneous requests, MySQL atomically rejects the second insert with `ER_DUP_ENTRY`, which is caught and transformed into the same HTTP `409 Conflict` response.
- **Frontend Reaction**:
  - Displays localized error banner: `"User already exists. This information has already been submitted."`
  - Does NOT show success banner.
  - Does NOT reset the form, preserving entered values for user review.

---

## Setup & Running Instructions

### Step 1: Clone or Navigate to the Project
```bash
cd C:\Users\nisha\OneDrive\Desktop\GlobalFormNew
```

### Step 2: Database Setup (MySQL)

#### Option A: Fresh Database Setup
1. Open MySQL Workbench or MySQL CLI:
   ```bash
   mysql -u root -p
   ```
2. Run `schema.sql`:
   ```sql
   source C:/Users/nisha/OneDrive/Desktop/GlobalFormNew/server/schema.sql;
   ```

#### Option B: Safe Migration for an Existing Database (Preserves all existing data)
If your database already contains records, run `migration_add_fingerprint.sql` to safely add the column, backfill hashes for existing rows, and add the unique constraint without deleting any records:
```bash
mysql -u root -p < C:/Users/nisha/OneDrive/Desktop/GlobalFormNew/server/migration_add_fingerprint.sql
```

### Step 3: Configure Environment Variables
- **Backend**: In `server/`, create `.env` (or copy from `.env.example`):
  ```env
  PORT=5000
  CLIENT_ORIGIN=http://localhost:5173
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=your_mysql_password
  DB_NAME=global_form_db
  ```
- **Frontend**: In `client/`, create `.env` (or copy from `.env.example`):
  ```env
  VITE_API_BASE_URL=http://localhost:5000/api
  ```

### Step 4: Run the Backend Server
```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000`.

### Step 5: Run the Frontend Client
In a new terminal:
```bash
cd client
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Running the Test Suites

### Backend Unit & Integration Tests (20 Tests across 2 test suites)
```bash
cd server
npm test
```
Tests verified:
- Valid submission (201 Created)
- Detection and rejection of exact 9-field duplicate submission (409 Conflict with code `DUPLICATE_USER`)
- Prevention of duplicate database row insertion on resubmission
- Independent identity: allowing records with same email but different full name / phone
- Independent identity: allowing records with same full name but different email
- Concurrent duplicate submission race condition handling via `ER_DUP_ENTRY`
- Canonical fingerprinting normalization & null handling across all 9 fields
- International Unicode names (Hindi, Arabic)
- Rejection of names with numbers
- Rejection of invalid email formats
- Rejection of future dates of birth
- Country-specific phone number validation
- Country-specific postal code validation
- Optional field handling (empty/null)
- Rejection of malformed JSON
- Database service unavailability (503 Service Unavailable)

### Frontend Integration Tests (15 Tests)
```bash
cd client
npm test
```
Tests verified:
- 9 fields + language selector rendering
- Required field error displays on empty submission
- Numbers in name rejection
- International Unicode name acceptance
- Invalid email rejection
- Future date of birth rejection
- Country-aware phone validation
- Country change re-triggers phone validation
- Blank optional postal code accepted
- Invalid postal code rejected for supported countries
- Language switching preserves form values
- Arabic RTL direction toggling
- Successful submission with feedback and form reset
- Server-side error mapping to fields
- Localized duplicate user error (409 Conflict) display with form state preservation
- Offline/Server unavailability handling without crashing

---

## Instructor Demonstration Checklist

Use this checklist during your demonstration:

1. **Initial Page View**:
   - Point out the clean single-page layout, responsive design, and exactly 9 fields.
   - Show the language dropdown in the top header.
2. **Multilingual & RTL Demonstration**:
   - Type a name into the Full Name field (e.g. `Alex`).
   - Switch language to **Hindi (हिन्दी)**: Notice labels translate immediately, and the entered name `Alex` is preserved!
   - Switch language to **Arabic (العربية)**: Notice the entire UI smoothly flips to Right-to-Left (RTL) layout!
   - Switch back to **English**.
3. **Validation Demonstration**:
   - Click "Submit Information" with empty fields: Show inline error messages under required fields.
   - In Full Name, type `John123`: Show "Name cannot contain numbers."
   - In Full Name, type `राहुल शर्मा` or `José`: Show that valid Unicode names are accepted.
   - In Email, type `test@`: Show "Enter a valid email address."
   - In Date of Birth, pick tomorrow's date: Show "Date of birth cannot be in the future."
   - In Country, pick **United States**: Notice calling code `+1` appears. Type `123`: Show error "Enter a valid mobile number for the selected country."
   - Switch Country to **India**: Notice calling code changes to `+91`. Type `9876543210`: Phone error disappears.
4. **Successful Submission to MySQL**:
   - Fill out all required fields with valid data.
   - Click "Submit Information": Point out the button loading state and spinner.
   - Show the green success banner on the same page.
   - Notice the form resets only after the database confirms insertion.
5. **Inspect MySQL**:
   - In MySQL Workbench or CLI, run `SELECT * FROM personal_information ORDER BY id DESC LIMIT 1;`.
   - Show the normalized E.164 phone number (`+919876543210`), uppercase country code, and sanitized values stored securely.

---

## Frequently Asked Questions (Instructor Q&A Guide)

### Q1: Why do we validate on both frontend and backend?
> **Answer**: Frontend validation provides immediate visual feedback to legitimate users, reducing round-trips and improving user experience. Backend validation is a non-negotiable security requirement because frontend validation can be completely bypassed by disabling JavaScript or using API tools like Postman or cURL.

### Q2: Why use `libphonenumber-js` instead of a regular expression?
> **Answer**: Phone numbers worldwide follow complex national numbering plans with varying lengths (from 5 to 15 digits), valid area codes, and mobile vs. landline prefixes. A single regular expression cannot validate international phone numbers without either rejecting legitimate users or allowing invalid numbers. `libphonenumber-js` evaluates numbers against official telecommunication standards and formats them into E.164.

### Q3: How do you handle countries that don't have postal codes?
> **Answer**: Over 50 countries (such as the UAE and Qatar) do not use postal codes. In our schema, `postalCode` is optional. If left blank, it evaluates to valid and is stored as `NULL`. When entered, we use `validator.isPostalCode` for supported locales and a documented permissive fallback for unsupported locales so legitimate international users are never blocked.

### Q4: How is SQL Injection prevented?
> **Answer**: We use parameterized queries via `mysql2/promise` (`INSERT INTO ... VALUES (?, ?, ...)`). With prepared statements, the database driver transmits query code and user data in distinct protocol packets. The MySQL query parser treats the parameters strictly as literal values, never executable SQL commands.

### Q5: How is Arabic RTL layout implemented?
> **Answer**: In `i18n.js`, we listen to `languageChanged`. When the language is `ar`, we set `document.documentElement.dir = 'rtl'`. Our CSS utilizes logical CSS properties (`text-align: start`, `border-inline-end`, etc.) and `html[dir="rtl"]` selectors to mirror inputs, labels, prefixes, and button alignments without requiring separate stylesheets.

### Q6: Why do frontend and backend use separate `.env` files?
> **Answer**: The frontend code is compiled and delivered to the user's browser, meaning any variables prefixed with `VITE_` are publicly visible in client JavaScript. Backend `.env` contains confidential infrastructure credentials (such as the MySQL root password) that must never be exposed to the client.
