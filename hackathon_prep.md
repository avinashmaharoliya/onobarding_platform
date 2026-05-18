# 🎯 Hackathon Backend Prep — Everything You Need to Know

> You know Python/FastAPI. Think of this project as **FastAPI → Express.js**. Same ideas, different syntax.

---

## 🧠 The Big Picture — What Does This Backend Do?

This is an **HR Employee Onboarding Portal** backend. It manages:
1. Employees sign up, fill profiles, upload documents, complete a checklist, sign digitally
2. HR verifies documents, customizes checklists, sends email reminders
3. Employee can only confirm joining date when EVERYTHING is done

**Tech Stack:**
- `Express.js` = FastAPI (web framework)
- `PostgreSQL` = Database (via `pg` library = like `asyncpg` / `psycopg2`)
- `JWT` = Token-based auth (same concept as FastAPI's OAuth2)
- `bcryptjs` = Password hashing (like `passlib` in Python)
- `Multer` = File upload handler (like `python-multipart` in FastAPI)
- `Tesseract.js` = OCR engine for reading text from images
- `Nodemailer` = Sending emails (like `smtplib` in Python)
- `node-cron` = Scheduled tasks (like `APScheduler` in Python)

---

## 📁 File-by-File Breakdown

---

### `server.js` — The Entry Point
**Python equivalent:** `main.py` in FastAPI

```javascript
const express = require('express');   // = from fastapi import FastAPI
const app = express();                 // = app = FastAPI()
app.use(cors());                       // = app.add_middleware(CORSMiddleware)
app.use(express.json({ limit: '2mb' })); // = parse JSON body, max 2MB

// Mount routes
app.use('/api/auth', require('./routes/auth.routes'));
// = app.include_router(auth_router, prefix="/api/auth")

app.listen(5000, () => {              // = uvicorn.run(app, port=5000)
  startChecklistReminderCron();       // Start the daily email cron job
});
```

**What it does:**
- Starts the server on port 5000
- Mounts all 7 route modules under `/api/`
- Creates `uploads/` folder if missing
- Kicks off the daily cron job for email reminders

---

### `config/db.js` — Database Connection
**Python equivalent:** SQLAlchemy engine or `asyncpg.create_pool()`

```javascript
const pool = new Pool({
  host, user, password, database, port,
  ssl: host !== 'localhost' ? { rejectUnauthorized: false } : false
  // SSL = True when on Render (cloud), SSL = False for local dev
});
```

**Key concept:** It's a **connection pool** — instead of opening a new DB connection for every request (slow), it maintains a pool of reusable connections (fast). Same idea in Python with SQLAlchemy's `pool_size`.

**Why SSL on Render?** Cloud databases require encrypted connections. `rejectUnauthorized: false` means "use SSL but don't verify the certificate chain" (common in managed cloud DBs).

---

### `middleware/auth.js` — JWT Authentication
**Python equivalent:** `Depends(oauth2_scheme)` in FastAPI

```javascript
module.exports = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1]; // "Bearer TOKEN"
  req.user = jwt.verify(token, process.env.JWT_SECRET);  // decode JWT
  next(); // = pass to next handler (like FastAPI's dependency injection)
};
```

**How JWT works:**
1. User logs in → server creates a signed token containing `{id, role}`
2. Client stores the token in `localStorage`
3. Every subsequent request sends token in `Authorization: Bearer <token>` header
4. This middleware verifies the token and attaches user info to `req.user`

**If a judge asks:** "How do you secure your API?"
> "We use JWT (JSON Web Tokens). On login, the server signs a token with a secret key. Every protected route runs the auth middleware which decodes the token and verifies its signature. If invalid or missing, we return 401 Unauthorized."

---

### `middleware/rbac.js` — Role-Based Access Control
```javascript
exports.isHR = (req, res, next) => {
  if (req.user.role !== 'hr') return res.status(403).json({ message: 'HR only' });
  next();
};
```

**Concept:** After `auth.js` verifies the token, `rbac.js` checks if the user has the `hr` role. HR-only routes use both: `router.get('/route', auth, isHR, handler)`.

- `401` = Not authenticated (no/invalid token)
- `403` = Authenticated but not authorized (wrong role)

---

### `routes/auth.routes.js` — Login & Setup

#### `POST /api/auth/login`
```
1. Find user by email in DB
2. Compare submitted password with bcrypt hash
3. If match → sign JWT with {id, role}, return it
```

#### `POST /api/auth/setup`
```
1. Only works if password_hash = 'not_set_yet' (new employee created by HR)
2. Hash the new password with bcrypt (10 salt rounds)
3. Save hash to DB, return JWT
```

**Why bcrypt?** Plain text passwords are dangerous. bcrypt hashes are one-way — you can never reverse them. `bcrypt.compare()` hashes the input and compares, it doesn't decrypt.

**JWT expiry:** Tokens expire in 8 hours (`{ expiresIn: '8h' }`). After that, the user must log in again.

---

### `routes/profile.routes.js` — Employee Profile

#### `GET /api/profile` — Get own profile
- Joins `users` + `employee_profiles` tables
- **Decrypts** `bank_account` and `pan` before returning

#### `PUT /api/profile` — Update profile
- **Encrypts** `bank_account` and `pan` before storing
- If ALL required fields are filled → sets `profile_complete = true`
- Required: name, dob, gender, address, emergency_contact, bank_account, pan, education

**Why encryption?** PAN and bank account numbers are sensitive. We use AES-256-CBC (`utils/encrypt.js`) to encrypt them in the DB. Even if someone got raw DB access, the data is unreadable.

---

### `routes/document.routes.js` — Document Upload

#### `POST /api/documents/upload` (most complex route)
Step by step:
```
1. Check profile_complete = true (must complete profile first)
2. Multer receives the file → saves to /uploads/ folder
3. Read the file bytes → detect MIME type (PDF/JPG/PNG only)
   - We use file-type library (checks magic bytes, not just extension)
   - A hacker can rename malware.exe to photo.jpg — we catch this
4. If image → run Tesseract.js OCR → extract text → save to DB
5. Upsert document record (INSERT or UPDATE if already uploaded)
6. Check if all mandatory docs uploaded → update user status to 'Documents Submitted'
```

**If a judge asks about security:**
> "We don't trust the file extension. We use the `file-type` library which reads the actual magic bytes of the file to detect its true MIME type. Only PDF, JPEG, and PNG are allowed. We also enforce a 5MB limit."

**If a judge asks about OCR:**
> "We use Tesseract.js, an open-source OCR engine by Google, running directly in our Node.js backend. When an employee uploads an image document like an Aadhar card, we automatically extract the text and store it in the database. HR can then see the extracted name, DOB, and ID number instantly on their dashboard without manually reading the document."

#### Other document routes:
- `GET /api/documents/my` — Get my uploaded docs with status
- `GET /api/documents/file/:id` — Stream the actual file (ownership check: only own docs or HR)
- `POST /api/documents/signature` — Save base64 PNG signature to disk + DB

---

### `routes/checklist.routes.js` — Checklist

#### `GET /api/checklist`
Returns all 5 checklist items with:
- `completed` — has employee done it?
- `custom_text` — has HR set custom instructions for this employee?

#### `PATCH /api/checklist/:id`
Marks an item complete. Also saves `submitted_data` (employee's text response from forms).
Uses **UPSERT** — if row exists, update it; if not, insert it.

---

### `routes/signature.routes.js` — Digital Signature

#### `POST /api/signature`
```
1. Receives base64 PNG string (drawn on HTML5 canvas by employee)
2. Validates it's a proper PNG base64 using regex
3. Decodes base64 → saves as .png file in /uploads/
4. Saves file path to digital_signatures table
5. Uses ON CONFLICT DO UPDATE — replaces old signature if re-signed
```

**If a judge asks:** "How does the digital signature work?"
> "The employee draws their signature on an HTML5 canvas element in the browser. We convert the canvas to a base64-encoded PNG image and send it to the backend via API. The server decodes the base64 string, saves it as a PNG file on disk, and stores the file path in the database. HR can view the signature image on the verification dashboard."

---

### `routes/joining.routes.js` — Confirm Joining Date

#### `POST /api/joining/confirm`
This is the final step. Has multiple guard checks:
```
1. Profile must be complete (profile_complete = true)
2. ALL mandatory documents must be 'Approved' (not just uploaded)
3. ALL mandatory checklist items must be completed
4. Only then → save joining_date + set status = 'Approved'
```

**If a judge asks:** "How do you ensure data integrity in the onboarding flow?"
> "We enforce sequential completion. An employee cannot confirm their joining date unless their profile is 100% complete, all mandatory documents have been approved by HR, and all checklist items are checked off. These are validated server-side in the joining route with separate database queries for each condition."

---

### `routes/admin.routes.js` — HR-Only Routes

All routes here require both `auth` + `isHR` middleware.

| Route | What it does |
|-------|-------------|
| `GET /admin/onboarding/overview` | All employees + progress % |
| `GET /admin/documents/:userId` | Employee's docs + OCR text |
| `PATCH /admin/documents/:id/verify` | Approve/Reject a document |
| `POST /admin/employee` | Create new employee account |
| `GET /admin/employee/:userId/profile` | View employee profile (decrypted) |
| `GET /admin/employee/:userId/checklist` | View checklist + custom text + employee responses |
| `PUT /admin/employee/:userId/checklist/:itemId/customize` | Set custom form text for an employee |
| `GET /admin/employee/:userId/signature` | Stream employee's signature image |
| `POST /admin/employees/:id/reminder` | Send/preview email reminder |

**Progress calculation** (`utils/progress.js`):
```
progress % = (approved_mandatory_docs + completed_mandatory_checklist) 
             / (total_mandatory_docs + total_mandatory_checklist) × 100
```

---

### `utils/encrypt.js` — AES-256-CBC Encryption

```javascript
function encrypt(text) {
  const iv = crypto.randomBytes(16);        // Random 16-byte IV (initialization vector)
  const cipher = createCipheriv('aes-256-cbc', KEY, iv);
  const encrypted = cipher.update(text) + cipher.final();
  return iv.toString('hex') + ':' + encrypted.toString('hex');
  // Stored as: "ivhex:encryptedhex"
}
```

**Why random IV?** Same text encrypted twice gives different results. If two employees have the same PAN number, the encrypted values in DB look completely different. This prevents pattern analysis attacks.

**If a judge asks:** "How do you protect sensitive data?"
> "PAN numbers and bank account details are encrypted with AES-256-CBC before storage. We use a random initialization vector for every encryption operation, so identical values produce different ciphertext. The encryption key is stored as an environment variable, never in code."

---

### `utils/emailReminder.js` — Email System

**Two modes:**
1. **Automated (cron):** Runs every day at 9 AM, finds all non-approved employees, sends reminders listing their specific pending items
2. **Manual:** HR clicks "Send Reminder" on dashboard → calls `sendManualReminder(userId)`

**Smart detection** — `getPendingOnboardingItems()` checks:
- Profile not complete → adds "Complete Profile Setup"
- Joining date missing → adds "Confirm Joining Date"
- Incomplete mandatory checklist items → lists each one
- Unapproved mandatory documents → lists each one

**Preview mode:** If `EMAIL_USER` / `EMAIL_PASSWORD` not set in `.env`, it generates the email content and returns it without sending. Perfect for local dev.

**Cron expression** `'0 9 * * *'` means: minute=0, hour=9, every day, every month, every weekday → **runs at 9:00 AM daily**.

---

### `utils/progress.js` — Progress Calculator

```javascript
// Two SQL queries:
// 1. Count mandatory doc types vs how many are 'Approved'
// 2. Count mandatory checklist items vs how many are completed

progress = Math.round((doneItems / totalItems) * 100)
```

---

## 🗄️ Database Schema — Quick Reference

```
users              → id, name, email, password_hash, role, joining_date, status, profile_complete
employee_profiles  → user_id(FK), dob, gender, address, emergency_contact, bank_account(encrypted), pan(encrypted), education_json
document_types     → id, name, mandatory (Aadhar, PAN, Address Proof, Degree, Experience Letter)
documents          → user_id(FK), document_type_id(FK), file_path, status, remark, extracted_text(OCR)
checklist_items    → id, title, description, mandatory (5 items)
checklist_progress → user_id(FK), checklist_item_id(FK), completed, custom_text(HR sets), submitted_data(employee fills)
digital_signatures → user_id(FK), file_path, signed_at
```

**ENUM types:**
- `user_role`: `employee` | `hr`
- `user_status`: `Pending` → `Documents Submitted` → `Approved`
- `doc_status`: `Pending` | `Approved` | `Rejected`

---

## 🔥 Expected Judge Questions & Answers

**Q: Why Node.js/Express and not Python/FastAPI?**
> "Express.js is extremely lightweight and performant for REST APIs. It has a massive ecosystem with libraries like Multer for file handling and Tesseract.js for OCR that integrate seamlessly. The non-blocking I/O model makes it efficient for file upload operations."

**Q: How does authentication work?**
> "We use JWT. On login, the server verifies credentials with bcrypt and returns a signed JWT containing the user's ID and role. Every API request includes this token in the Authorization header. A middleware verifies the signature before any route handler runs."

**Q: How do you handle file uploads securely?**
> "Files go through three validation layers: 1) Multer enforces a 5MB size limit, 2) We use the file-type library to check actual MIME type from magic bytes — not the filename extension, 3) Only PDF, JPEG, and PNG are allowed. Files are stored server-side in an uploads directory."

**Q: What is OCR and how did you implement it?**
> "OCR is Optical Character Recognition — extracting text from images. We used Tesseract.js, Google's open-source OCR engine ported to Node.js. When an employee uploads an image document, we run OCR automatically and store the extracted text in the database. HR can then verify document details like Aadhaar number or name without manually reading the scan."

**Q: How does the digital signature work?**
> "The employee draws on an HTML5 canvas in the browser. We convert it to a base64 PNG and POST it to the backend. The server decodes it, saves it as a PNG file, and stores the path in the database. HR can view the actual signature image."

**Q: How do you prevent unauthorized access between employees?**
> "Every protected route runs JWT middleware which extracts the user ID from the token. Employees can only access their own data — for example, the document download route checks that the requesting user's ID matches the document's owner, or that the user has the HR role."

**Q: What is bcrypt and why use it?**
> "bcrypt is a password hashing algorithm. Passwords are never stored as plain text. bcrypt is intentionally slow, making brute-force attacks impractical. We use 10 salt rounds, which means 2^10 = 1024 iterations per hash."

**Q: How do email reminders work?**
> "We use node-cron to schedule a job that runs daily at 9 AM. It queries all employees who haven't completed onboarding, checks exactly what's pending for each one — incomplete profile, pending documents, unchecked checklist items — and sends a personalized email via Nodemailer listing only their specific outstanding tasks."

**Q: What does the onboarding flow look like end-to-end?**
> "HR creates an employee account. Employee sets up password → completes profile → uploads mandatory documents (Aadhar, PAN, Address Proof, Degree) → completes checklist (NDA signature, IT form, handbook, bank details, ID photo) → HR approves the documents → employee confirms joining date → status becomes Approved."

**Q: What is AES-256 encryption?**
> "AES-256-CBC is a symmetric encryption standard used by banks and governments. We use it to encrypt PAN numbers and bank account details before storing in the database. Even if someone gets direct database access, they see only encrypted gibberish. The decryption key is stored only in environment variables."

**Q: What's the difference between authentication and authorization?**
> "Authentication is verifying who you are — our JWT middleware does this. Authorization is verifying what you're allowed to do — our RBAC middleware checks your role. A valid employee token is authenticated, but if they try to access an HR route, they're rejected with 403 Forbidden."

---

## 📊 API Endpoints Summary (memorize this structure)

```
POST   /api/auth/login                          → Login
POST   /api/auth/setup                          → First-time password setup

GET    /api/profile                             → Get own profile
PUT    /api/profile                             → Update profile

POST   /api/documents/upload                    → Upload document (+ auto OCR)
GET    /api/documents/my                        → Get my documents
GET    /api/documents/file/:id                  → Download/view a file
POST   /api/documents/signature                 → Submit digital signature
GET    /api/documents/signature/me              → Check if signed

GET    /api/checklist                           → Get checklist items
PATCH  /api/checklist/:id                       → Mark item complete + save response

POST   /api/joining/confirm                     → Confirm joining date (final step)

GET    /api/admin/onboarding/overview           → HR: all employees + progress
GET    /api/admin/documents/:userId             → HR: employee's documents
PATCH  /api/admin/documents/:id/verify          → HR: approve/reject document
POST   /api/admin/employee                      → HR: create new employee
GET    /api/admin/employee/:userId/profile       → HR: view profile
GET    /api/admin/employee/:userId/checklist     → HR: view checklist + responses
PUT    /api/admin/employee/:userId/checklist/:itemId/customize → HR: set custom form text
GET    /api/admin/employee/:userId/signature     → HR: view signature
POST   /api/admin/employees/:id/reminder        → HR: send email reminder
```

---

## 🛠️ Utility Scripts

| Script | Command | What it does |
|--------|---------|-------------|
| `run_schema.js` | `node run_schema.js` | Creates all tables in DB |
| `update_hash.js` | `node update_hash.js` | Resets HR password to Admin@123 |
| `seed_employee.js` | `node seed_employee.js` | Inserts a demo employee |
| `deleteUser.js` | `node deleteUser.js email@x.com` | Deletes user + all their data |

---

## 💡 Key Concepts to Remember

1. **req, res, next** = request, response, next-middleware (same as FastAPI's Request, Response, Depends)
2. **async/await** = same as Python's async/await
3. **require()** = Python's `import`
4. **module.exports** = Python's exposing functions for import
5. **process.env.X** = Python's `os.environ['X']` or `os.getenv('X')`
6. **router.get/post/patch/put/delete** = FastAPI's `@app.get/@app.post` etc.
7. **Middleware** = FastAPI's `Depends()` or middleware classes

---

## 🚀 Good luck tomorrow! You built something genuinely impressive.

The system has: JWT auth, RBAC, AES encryption, file upload with MIME validation, OCR, digital signatures, email reminders with cron scheduling, and a fully relational PostgreSQL schema. That's production-grade stuff.
