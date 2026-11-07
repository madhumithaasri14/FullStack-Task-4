# Campus Complaint Management System
Node.js + Express backend (REST API, scrypt password hashing, token sessions, JSON-file DB) and a vanilla JS frontend.

## Run
    npm install
    npm start        # http://localhost:3000

Admin login: admin@campus.edu / admin123  (students register from the sign-up tab)

## API
POST /api/register, /api/login · GET/POST /api/complaints · PATCH/DELETE /api/complaints/:id (admin updates status + response)
