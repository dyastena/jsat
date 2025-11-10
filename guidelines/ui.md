# User Interface (UI) Guidelines: JSAT (Tailwind CSS)

These guidelines define the visual standards for building a clean, professional, and consistent interface using **Tailwind CSS**.

## 1. Design System Foundation

### A. Color Palette
Use colors purposefully to convey status and action.

| Usage | Tailwind Class (Example) | Context |
| :--- | :--- | :--- |
| **Primary** (CTA/Brand) | `bg-indigo-600` / `text-indigo-500` | Main buttons, active navigation. |
| **Success** | `bg-green-500` / `text-green-500` | Test pass, task completed. |
| **Error/Danger** | `bg-red-600` / `text-red-700` | Test fail, submission error. |

### B. Typography
Use a clear, readable sans-serif font stack.

* **H1 (Page Title):** Large, bold, and distinct. Used only once per page. (`text-3xl font-bold`)
* **Body Text:** Highly readable, adequate line-height and contrast.

## 2. Component & Layout Standards

### A. Forms and Inputs
* **Simplicity:** Forms should be clean, with ample white space. Input fields must be clearly labeled **above** the input box.
* **Validation:** Inline, real-time validation feedback is required. Use **Red** borders for failed validation.

### B. Data Visualization
* **Charts:** All charts must use **clear labels** and **consistent color coding** across the application.
* **Tables:** Tables must be **searchable**, **sortable**, and **responsive**.