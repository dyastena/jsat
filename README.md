# JSAT (Java Skill Assessment Tool)

JSAT is a comprehensive platform for assessing Java programming skills. It provides a complete solution for recruiters, administrators, and candidates, from user management and question generation to automated evaluation and feedback.

## Features

- **Role-Based Access Control:** Separate dashboards and functionalities for Admins, Recruiters, and Candidates.
- **Automated Resume Generation:** Fetches candidate details from LinkedIn and GitHub to generate a standardized resume.
- **Dynamic Skill Evaluation:** Uses a CART (Classification and Regression Tree) engine to evaluate candidate skills based on various metrics.
- **Gamified Level Progression:** A point-based system with 5 skill levels to engage and motivate candidates.
- **Practice Ground:** A dedicated space for candidates to practice and improve their skills with ranked challenges.
- **Employability Exams:** Recruiters can create and send custom exams to candidates to assess their employability.
- **Secure Execution Sandbox:** A containerized environment for safely running and testing candidate code.
- **Detailed Reporting:** Comprehensive reports for both recruiters and candidates with performance breakdowns and feedback.

## Modules Overview

### 1. Authentication and User Management
- Secure login and registration.
- User profile management with LinkedIn and GitHub integration for automated resume generation.

### 2. Admin Dashboard
- User and question management.
- System monitoring and settings configuration.

### 3. Recruiter Dashboard
- Assign tests and view candidate reports.
- Create and manage employability exams.
- Provide feedback to candidates.

### 4. Candidate Dashboard
- Take tests and view results.
- Practice skills in the Practice Ground and track progress on the leaderboard.
- Level up through a point-based system.

### 5. Execution Sandbox
- A secure environment for running Java code with input/output panels and error logging.

### 6. Feature Extractor & CART Evaluation Engine
- Dynamically allocates points based on code accuracy, performance, efficiency, and style.
- Classifies candidates into 5 skill levels: Beginner, Novice, Intermediate, Advanced, and Expert.
- Manages user level progression with a point-based system and optional level-ups.

### 7. Feedback and Reporting Module
- Generates detailed reports for recruiters and provides constructive feedback for candidates.

### 8. System Settings and Maintenance
- Admin-only settings for system configuration and maintenance.

## Getting Started

### Prerequisites

- XAMPP for Apache and MySQL
- Node.js and npm

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/your_username_/JSAT.git
    ```
2.  Install NPM packages
    ```sh
    npm install
    ```
3.  Start the XAMPP server.
4.  Open the `index.html` file in your browser.

## Usage

- **Admin:** Log in with admin credentials to manage users, questions, and system settings.
- **Recruiter:** Log in to assign tests, view reports, and send employability exams to candidates.
- **Candidate:** Log in to take tests, practice in the Practice Ground, and track your progress.

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.
