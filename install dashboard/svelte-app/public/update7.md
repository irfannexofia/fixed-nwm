# Prompt for TRAE AI: Configure Backend to Use a Development Database Branch

## 🎯 Objective

Modify the backend server code (`server.js`) to connect to a different Neon database branch for development. The code should use the main database for production but switch to a specific development branch when the environment is set to 'development'.

---

## 📝 Context & Target File

The backend is a Node.js/Express application that connects to a Neon (PostgreSQL) database. The database connection is currently configured using a single `DATABASE_URL` environment variable. We need to introduce a second connection string for our new development branch.

The target file is `server.js`.

---

## ✨ Requirements & Specifications

1.  **Update Environment Variable Usage**:
    * Modify the project to support a new environment variable named `DEV_DATABASE_URL`. This variable will hold the connection string for the new 'development' branch from Neon.
    * The existing `DATABASE_URL` will be used for production.

2.  **Implement Conditional Logic**:
    * In `server.js`, modify the database pool configuration.
    * Add logic to check the `process.env.NODE_ENV` variable.
    * If `process.env.NODE_ENV` is equal to `'development'`, the pool should use the `DEV_DATABASE_URL`.
    * Otherwise (for production), it should default to using the `DATABASE_URL`.

3.  **Update `.env` File**:
    * Instruct me to add the `DEV_DATABASE_URL` to my `.env` file and explain how to run the server in development mode (e.g., by setting `NODE_ENV=development` when running the script).

---

## 💻 Expected Output

Provide the updated code for `server.js` that includes the conditional logic for selecting the database connection string based on the environment.