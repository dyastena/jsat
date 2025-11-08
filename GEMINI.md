# SYSTEM MODULES OVERVIEW

- Authentication and User Management Module
- Question Generator Module
- Candidate Test Manager Module
- Execution Sandbox Module
- Feature Extractor and CART Evaluation Engine
- Feedback and Reporting Module
- Admin Management Module
- System Monitoring and Maintenance Module

## 1. AUTHENTICATION AND USER MANAGEMENT
### Login Page
- Email and password fields
- Role selection (Admin, Recruiter, Candidate)
- “Forgot Password” link
- Login button
- Error message for invalid credentials

### Registration Page (Admin Controlled)
- Name, email, role, and password fields
- Role assignment (Admin, Recruiter, Candidate)
- Account creation confirmation

### User Profile Page
- Display name, email, and role
- Option to edit password
- Option to update profile picture
- Logout button
- On first login, users must link their LinkedIn and GitHub profiles.
- The system will automatically generate a resume with the system's branding.
- Users can see their information in this system-generated resume.

## 2. ADMIN DASHBOARD
### Dashboard Overview
- Total users (Admins, Recruiters, Candidates)
- Total tests conducted
- Average candidate performance (pie or bar chart)
- System logs summary
- Button: “Manage Users”, “Manage Questions”, “System Settings”

### User Management Page
- List of all users with roles and status
- Buttons: “Add User”, “Edit”, “Deactivate”, “Delete”
- Search and filter by role

### Question Management Page
- Question list table with filters (Beginner, Novice, Intermediate, Advanced, Expert)
- Question ID, title, difficulty, date created
- Buttons: “Add Question”, “Edit”, “Delete”
- Randomize question sets
- Upload bulk questions (CSV or JSON)

### System Monitoring Page
- CPU and memory usage
- Database health check
- Recent error logs
- Backup and restore buttons

## 3. RECRUITER DASHBOARD
### Dashboard Overview
- Total candidates tested
- Average skill levels (chart view)
- Quick access to “Assign Test” and “View Reports”

### Assign Test Page
- Candidate list with selection checkboxes
- Drop-down to select difficulty level (Beginner, Novice, Intermediate, Advanced, Expert)
- Button: “Generate Test”
- Option to randomize questions
- Test schedule (start and end time)

### Reports Page
- List of candidates with scores and skill classification
- Buttons: “View Detailed Report”, “Download PDF”
- Filter by test date or skill level

### Candidate Feedback Page
- View detailed candidate performance
- Strengths and weaknesses summary
- Feedback notes text area for recruiter input

### Employability Exam
- Recruiters can email candidates to offer an interview-like exam.
- Recruiters can create custom exams by selecting a set of questions from the question bank.
- The exam invitation email will contain a unique link to the exam.
- The exam will have a time limit and will be proctored (e.g., webcam monitoring, tab switching detection).
- After the exam, the recruiter will receive a detailed report with the candidate's score, code playback, and proctoring flags.
- The recruiter can then mark the candidate as "Hired" or "Rejected" based on the exam results.

## 4. CANDIDATE DASHBOARD
### Dashboard Overview
- Upcoming and completed tests list
- Status indicators (Not Started, In Progress, Completed)
- Button: “Start Test”
- Current user level displayed (e.g., Beginner, Novice, Intermediate, Advanced, Expert)

### Practice Ground
- A dedicated area for candidates to practice and hone their skills.
- Leaderboard ranking based on performance in the practice ground.
- Challenges and exercises tailored to the candidate's skill level.

### Test Interface
- Timer (countdown)
- Question panel (one question at a time)
- Code editor with syntax highlighting
- “Run Code” and “Submit” buttons
- Output console (runtime output, error logs)
- Progress tracker (e.g., Question 3 of 10)

### Test Completion Page
- Confirmation message
- “View Results” button (after recruiter review)

### Results Page
- Test score summary (accuracy, runtime, code quality)
- Skill level: Beginner / Intermediate / Advanced
- Visual chart of performance metrics
- Feedback section

## 5. EXECUTION SANDBOX
- Secure containerized environment for running Java code
- Input and output panels
- Runtime duration display
- Error log viewer
- Result validation (pass/fail test cases)

## 6. FEATURE EXTRACTOR & CART EVALUATION ENGINE
### Extracted features:
- Accuracy (% of passed test cases)
- Runtime performance (execution time)
- Code efficiency (lines of code, complexity)
- Error count
- Code conciseness and style.

### Dynamic Point Allocation:
- The CART engine will analyze the extracted features to allocate points for each question.
- Maximum of 10 points per question.
- **10 points:** Perfect solution - fast, concise, and correct.
- **5-9 points:** Correct solution with minor issues in efficiency or style.
- **1-4 points:** Partially correct solution, demonstrating some understanding of the problem.
- **0 points:** Incorrect or no solution.

### CART engine classifies skill levels:
- 5 Levels: Beginner, Novice, Intermediate, Advanced, Expert
- Beginner: Low accuracy, high runtime, frequent errors
- Novice: Basic understanding, some errors
- Intermediate: Moderate accuracy, balanced runtime
- Advanced: High accuracy, optimized runtime, clean code
- Expert: Mastery of concepts, highly efficient and optimized code

### User Level Progression:
- Users start at the "Beginge" level.
- Point thresholds for each level:
    - Beginner: 100 points
    - Novice: 150 points
    - Intermediate: 200 points
    - Advanced: 250 points
    - Expert: 300 points
- After 3 or 5 consecutive 10-point answers, the system will prompt the user to advance to the next level.
- The user can choose to stay at the current level to "master" it.

## 7. FEEDBACK AND REPORTING MODULE
### Recruiter Report View
- Candidate name and ID
- Overall skill level
- Performance breakdown by metric
- Code submission history
- Option to export as PDF

### Candidate Feedback View
- Summary of performance
- Individual question feedback (score and output correctness)
- Suggested topics for improvement

## 8. SYSTEM SETTINGS AND MAINTENANCE
### Settings Page (Admin Only)
- Manage site logo and system info
- Email configuration (for notifications)
- Toggle question randomization
- Security settings (JWT token refresh rate)

### Maintenance Page
- Scheduled backups
- System version and update history
- Log viewer (download logs)
