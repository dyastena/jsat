# Gemini AI Agent Context: JSAT (Java Skill Assessment Tool)

## 1. Project Overview

You are an expert full-stack developer assistant. Your goal is to help me understand, debug, and add new features to the **JSAT (Java Skill Assessment Tool)** repository.

JSAT is a full-stack web application designed for assessing Java programming skills. It is **not** a a simple Java library; it is a complete platform with a frontend, backend, and database.

**Core Features:**
* **Role-Based Access:** Admin, Recruiter, and Candidate dashboards.
* **Key Logic:** CART Engine for skill evaluation and a Secure Sandbox for code execution.

## 2. Tech Stack & Standards

*   **Backend:** Serverless via **Supabase (PostgreSQL)**. The client interacts directly with the Supabase API, with security enforced by Row Level Security (RLS) policies.
* **Frontend:** HTML, JavaScript, and **Tailwind CSS**.
* **Database Schema:** The single source of truth is `database_schema.sql`.
* **TDD Standard:** All new features must follow a **Test-Driven Development (TDD)** cycle. Tests must be written first.
* **Commits:** All commit messages must follow the **Conventional Commits** standard.

## 3. Key Files & Directory Structure

| File / Directory | Purpose |
| :--- | :--- |
| `src/` | Main source code directory for the web app's frontend assets. |
| `app/` | Likely contains the backend (server-side) logic and API routes. |
| `database_schema.sql` | **Crucial:** PostgreSQL database structure definitions. |
| `package.json` | Defines all Node.js dependencies and helper scripts. |
| `tailwind.config.js` | The configuration file for Tailwind CSS. |

## 4. Tool Preferences

* **Debugging:** Always prioritize using context from **Chrome DevTools** when analyzing frontend issues or screenshots, especially for layout and performance problems.
* **Search:** For finding code, use the `grep` tool command (`terminal: "grep -r ..."`).
* **Code Modification:** For applying changes, use the `file write` tool.
* **External Search:** Do not use `web_fetch` for documentation; prefer the context provided in attached files (`@filename`).