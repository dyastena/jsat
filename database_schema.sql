-- ============================================
-- J-SAT (Java Skill Assessment Platform)
-- Complete Database Schema (PostgreSQL)
-- ============================================

-- ============================================
-- ENUM TYPES AND REFERENCE TABLES
-- ============================================

-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'recruiter', 'candidate');

-- Question difficulty levels enum
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Test status enum
CREATE TYPE test_status AS ENUM ('not_started', 'in_progress', 'completed', 'expired');

-- Submission status enum
CREATE TYPE submission_status AS ENUM ('pending', 'running', 'passed', 'failed', 'error');

-- User account status enum
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended', 'pending');

-- Exam type enum
CREATE TYPE exam_type AS ENUM ('practice', 'assessment', 'employability');

-- Proctoring event type enum
CREATE TYPE proctoring_event AS ENUM ('tab_switch', 'window_blur', 'copy_paste', 'multiple_faces', 'no_face');

-- Candidate status after employability exam
CREATE TYPE candidate_outcome AS ENUM ('pending', 'hired', 'rejected');

-- ============================================
-- SKILL LEVELS REFERENCE TABLE
-- ============================================

-- Stores skill level definitions and point thresholds
CREATE TABLE skill_levels (
    id SERIAL PRIMARY KEY,
    level_name VARCHAR(50) UNIQUE NOT NULL,
    level_order INTEGER UNIQUE NOT NULL,
    min_points INTEGER NOT NULL,
    max_points INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default skill levels
INSERT INTO skill_levels (level_name, level_order, min_points, max_points, description) VALUES
('Beginner', 1, 0, 99, 'Basic understanding of Java fundamentals'),
('Novice', 2, 100, 149, 'Developing proficiency with occasional errors'),
('Intermediate', 3, 150, 199, 'Solid understanding with balanced performance'),
('Advanced', 4, 200, 249, 'High accuracy with optimized solutions'),
('Expert', 5, 250, NULL, 'Mastery of concepts with highly efficient code');

CREATE INDEX idx_skill_levels_order ON skill_levels(level_order);

-- ============================================
-- AUTHENTICATION AND USER MANAGEMENT
-- ============================================

-- Core users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status account_status DEFAULT 'pending',
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- ============================================
-- CANDIDATE PROFILE DATA
-- ============================================

-- Stores candidate-specific profile information
CREATE TABLE candidate_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_skill_level_id INTEGER REFERENCES skill_levels(id),
    total_points INTEGER DEFAULT 0,
    linkedin_profile_url TEXT,
    linkedin_data JSONB, -- Stores structured LinkedIn profile data
    github_profile_url TEXT,
    github_data JSONB, -- Stores structured GitHub profile data
    resume_url TEXT, -- Auto-generated resume URL
    phone_number VARCHAR(20),
    bio TEXT,
    first_login_completed BOOLEAN DEFAULT FALSE,
    consecutive_perfect_scores INTEGER DEFAULT 0, -- Track 10-point answers for level advancement
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_candidate_profiles_user_id ON candidate_profiles(user_id);
CREATE INDEX idx_candidate_profiles_skill_level ON candidate_profiles(current_skill_level_id);

-- ============================================
-- QUESTION BANK
-- ============================================

-- Stores all assessment questions
CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    difficulty difficulty_level NOT NULL,
    max_points INTEGER DEFAULT 10,
    time_limit_minutes INTEGER DEFAULT 30,
    template_code TEXT, -- Starter code template
    solution_code TEXT, -- Reference solution (for admin use)
    tags TEXT[], -- Array of tags (e.g., ['arrays', 'recursion'])
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_ai_generated BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_is_active ON questions(is_active);
CREATE INDEX idx_questions_tags ON questions USING GIN(tags);

-- ============================================
-- TEST CASES FOR QUESTIONS
-- ============================================

-- Stores test cases for each question
CREATE TABLE test_cases (
    id SERIAL PRIMARY KEY,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    input TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    is_sample BOOLEAN DEFAULT FALSE, -- Sample test cases visible to candidates
    weight DECIMAL(5,2) DEFAULT 1.0, -- Weight for scoring
    time_limit_ms INTEGER DEFAULT 5000,
    memory_limit_mb INTEGER DEFAULT 256,
    is_hidden BOOLEAN DEFAULT FALSE, -- Hidden test cases for validation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_cases_question_id ON test_cases(question_id);

-- ============================================
-- AI QUESTION GENERATION LOGS
-- ============================================

-- Tracks AI-generated questions for monitoring and review
CREATE TABLE ai_question_logs (
    id SERIAL PRIMARY KEY,
    question_id INTEGER REFERENCES questions(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    ai_model VARCHAR(100),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    review_notes TEXT
);

CREATE INDEX idx_ai_question_logs_status ON ai_question_logs(review_status);

-- ============================================
-- TESTS AND EXAMINATIONS
-- ============================================

-- Stores test/exam configurations
CREATE TABLE tests (
    id SERIAL PRIMARY KEY,
    test_name VARCHAR(255) NOT NULL,
    test_type exam_type NOT NULL,
    difficulty difficulty_level,
    created_by INTEGER NOT NULL REFERENCES users(id), -- Recruiter/Admin who created
    total_questions INTEGER NOT NULL,
    time_limit_minutes INTEGER NOT NULL,
    passing_score DECIMAL(5,2),
    instructions TEXT,
    is_randomized BOOLEAN DEFAULT TRUE,
    is_proctored BOOLEAN DEFAULT FALSE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tests_created_by ON tests(created_by);
CREATE INDEX idx_tests_type ON tests(test_type);

-- ============================================
-- TEST QUESTION ASSIGNMENTS
-- ============================================

-- Links questions to specific tests
CREATE TABLE test_questions (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    question_order INTEGER NOT NULL,
    points_allocated INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(test_id, question_id)
);

CREATE INDEX idx_test_questions_test_id ON test_questions(test_id);
CREATE INDEX idx_test_questions_question_id ON test_questions(question_id);

-- ============================================
-- CANDIDATE TEST ASSIGNMENTS
-- ============================================

-- Assigns tests to candidates
CREATE TABLE candidate_tests (
    id SERIAL PRIMARY KEY,
    test_id INTEGER NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by INTEGER NOT NULL REFERENCES users(id), -- Recruiter who assigned
    status test_status DEFAULT 'not_started',
    unique_access_token VARCHAR(255) UNIQUE, -- For employability exam links
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_taken_minutes INTEGER,
    total_score DECIMAL(5,2),
    final_skill_level_id INTEGER REFERENCES skill_levels(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(test_id, candidate_id)
);

CREATE INDEX idx_candidate_tests_candidate_id ON candidate_tests(candidate_id);
CREATE INDEX idx_candidate_tests_test_id ON candidate_tests(test_id);
CREATE INDEX idx_candidate_tests_status ON candidate_tests(status);
CREATE INDEX idx_candidate_tests_token ON candidate_tests(unique_access_token);

-- ============================================
-- CODE SUBMISSIONS
-- ============================================

-- Stores candidate code submissions and execution results
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    candidate_test_id INTEGER NOT NULL REFERENCES candidate_tests(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    submitted_code TEXT NOT NULL,
    status submission_status DEFAULT 'pending',
    execution_time_ms INTEGER,
    memory_used_mb DECIMAL(10,2),
    output TEXT,
    error_log TEXT,
    
    -- Feature extraction metrics
    accuracy_percentage DECIMAL(5,2),
    passed_test_cases INTEGER DEFAULT 0,
    total_test_cases INTEGER DEFAULT 0,
    lines_of_code INTEGER,
    code_complexity_score DECIMAL(5,2),
    error_count INTEGER DEFAULT 0,
    style_score DECIMAL(5,2),
    
    -- Scoring
    points_earned DECIMAL(5,2) DEFAULT 0,
    max_points INTEGER DEFAULT 10,
    
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evaluated_at TIMESTAMP
);

CREATE INDEX idx_submissions_candidate_test_id ON submissions(candidate_test_id);
CREATE INDEX idx_submissions_candidate_id ON submissions(candidate_id);
CREATE INDEX idx_submissions_question_id ON submissions(question_id);
CREATE INDEX idx_submissions_status ON submissions(status);

-- ============================================
-- TEST CASE RESULTS
-- ============================================

-- Stores individual test case execution results
CREATE TABLE test_case_results (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    passed BOOLEAN NOT NULL,
    actual_output TEXT,
    execution_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_test_case_results_submission_id ON test_case_results(submission_id);

-- ============================================
-- PROCTORING LOGS
-- ============================================

-- Stores proctoring events during exams
CREATE TABLE proctoring_logs (
    id SERIAL PRIMARY KEY,
    candidate_test_id INTEGER NOT NULL REFERENCES candidate_tests(id) ON DELETE CASCADE,
    event_type proctoring_event NOT NULL,
    event_details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    screenshot_url TEXT,
    webcam_capture_url TEXT
);

CREATE INDEX idx_proctoring_logs_candidate_test_id ON proctoring_logs(candidate_test_id);
CREATE INDEX idx_proctoring_logs_event_type ON proctoring_logs(event_type);

-- ============================================
-- EMPLOYABILITY EXAM OUTCOMES
-- ============================================

-- Stores recruiter decisions on employability exams
CREATE TABLE exam_outcomes (
    id SERIAL PRIMARY KEY,
    candidate_test_id INTEGER UNIQUE NOT NULL REFERENCES candidate_tests(id) ON DELETE CASCADE,
    recruiter_id INTEGER NOT NULL REFERENCES users(id),
    outcome candidate_outcome DEFAULT 'pending',
    recruiter_notes TEXT,
    interview_scheduled_at TIMESTAMP,
    decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_exam_outcomes_candidate_test_id ON exam_outcomes(candidate_test_id);
CREATE INDEX idx_exam_outcomes_outcome ON exam_outcomes(outcome);

-- ============================================
-- FEEDBACK AND REPORTS
-- ============================================

-- Stores recruiter feedback for candidates
CREATE TABLE recruiter_feedback (
    id SERIAL PRIMARY KEY,
    candidate_test_id INTEGER NOT NULL REFERENCES candidate_tests(id) ON DELETE CASCADE,
    recruiter_id INTEGER NOT NULL REFERENCES users(id),
    strengths TEXT,
    weaknesses TEXT,
    improvement_areas TEXT[],
    overall_comments TEXT,
    is_visible_to_candidate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recruiter_feedback_candidate_test_id ON recruiter_feedback(candidate_test_id);

-- ============================================
-- PRACTICE GROUND
-- ============================================

-- Tracks practice sessions and performance
CREATE TABLE practice_sessions (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    attempts INTEGER DEFAULT 0,
    best_score DECIMAL(5,2) DEFAULT 0,
    total_time_spent_minutes INTEGER DEFAULT 0,
    last_attempted_at TIMESTAMP,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_practice_sessions_candidate_id ON practice_sessions(candidate_id);
CREATE INDEX idx_practice_sessions_question_id ON practice_sessions(question_id);

-- ============================================
-- LEADERBOARD
-- ============================================

-- Stores leaderboard rankings for practice ground
CREATE TABLE leaderboard (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_practice_points DECIMAL(10,2) DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    current_rank INTEGER,
    rank_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leaderboard_rank ON leaderboard(current_rank);
CREATE INDEX idx_leaderboard_points ON leaderboard(total_practice_points DESC);

-- ============================================
-- SYSTEM MONITORING AND LOGS
-- ============================================

-- System activity and error logs
CREATE TABLE system_logs (
    id SERIAL PRIMARY KEY,
    log_level VARCHAR(20) NOT NULL, -- INFO, WARNING, ERROR, CRITICAL
    module VARCHAR(100), -- Module name (e.g., 'Sandbox', 'Authentication')
    message TEXT NOT NULL,
    stack_trace TEXT,
    user_id INTEGER REFERENCES users(id),
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_level ON system_logs(log_level);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_system_logs_module ON system_logs(module);

-- ============================================
-- SYSTEM METRICS
-- ============================================

-- Stores system performance metrics
CREATE TABLE system_metrics (
    id SERIAL PRIMARY KEY,
    cpu_usage_percentage DECIMAL(5,2),
    memory_usage_percentage DECIMAL(5,2),
    disk_usage_percentage DECIMAL(5,2),
    database_size_mb DECIMAL(10,2),
    active_users INTEGER,
    running_tests INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- ============================================
-- BACKUPS
-- ============================================

-- Tracks database backups
CREATE TABLE backups (
    id SERIAL PRIMARY KEY,
    backup_name VARCHAR(255) NOT NULL,
    backup_path TEXT NOT NULL,
    backup_size_mb DECIMAL(10,2),
    backup_type VARCHAR(50), -- full, incremental
    status VARCHAR(50) DEFAULT 'completed',
    initiated_by INTEGER REFERENCES users(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT
);

CREATE INDEX idx_backups_started_at ON backups(started_at);

-- ============================================
-- SYSTEM SETTINGS
-- ============================================

-- Stores system configuration settings
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50), -- string, integer, boolean, json
    description TEXT,
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_settings_key ON system_settings(setting_key);

-- ============================================
-- NOTIFICATIONS
-- ============================================

-- Stores notifications for users
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50), -- test_assigned, test_completed, level_up, etc.
    is_read BOOLEAN DEFAULT FALSE,
    related_entity_type VARCHAR(50), -- test, submission, feedback
    related_entity_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- ============================================
-- EMAIL LOGS
-- ============================================

-- Tracks emails sent by the system
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL,
    recipient_user_id INTEGER REFERENCES users(id),
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    email_type VARCHAR(100), -- test_invitation, password_reset, result_notification
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    sent_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_recipient_user_id ON email_logs(recipient_user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- ============================================
-- AUDIT TRAIL
-- ============================================

-- Tracks important user actions for compliance and security
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- login, create_user, assign_test, etc.
    entity_type VARCHAR(50), -- user, test, question, submission
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_created_at ON audit_trail(created_at);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidate_profiles_updated_at BEFORE UPDATE ON candidate_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tests_updated_at BEFORE UPDATE ON tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skill_levels_updated_at BEFORE UPDATE ON skill_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for candidate dashboard overview
CREATE VIEW candidate_dashboard_view AS
SELECT 
    u.id AS candidate_id,
    u.full_name,
    u.email,
    cp.current_skill_level_id,
    sl.level_name AS current_skill_level,
    cp.total_points,
    cp.consecutive_perfect_scores,
    COUNT(DISTINCT ct.id) AS total_tests_taken,
    COUNT(DISTINCT CASE WHEN ct.status = 'completed' THEN ct.id END) AS completed_tests,
    AVG(CASE WHEN ct.status = 'completed' THEN ct.total_score END) AS average_score,
    l.current_rank AS leaderboard_rank
FROM users u
LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
LEFT JOIN skill_levels sl ON cp.current_skill_level_id = sl.id
LEFT JOIN candidate_tests ct ON u.id = ct.candidate_id
LEFT JOIN leaderboard l ON u.id = l.candidate_id
WHERE u.role = 'candidate'
GROUP BY u.id, u.full_name, u.email, cp.current_skill_level_id, sl.level_name, 
         cp.total_points, cp.consecutive_perfect_scores, l.current_rank;

-- View for recruiter reports
CREATE VIEW recruiter_reports_view AS
SELECT 
    ct.id AS candidate_test_id,
    t.test_name,
    t.test_type,
    u.full_name AS candidate_name,
    u.email AS candidate_email,
    ct.status,
    ct.total_score,
    sl.level_name AS skill_level,
    ct.completed_at,
    ct.time_taken_minutes,
    COUNT(s.id) AS total_submissions,
    AVG(s.points_earned) AS avg_points_per_question,
    rf.overall_comments AS feedback
FROM candidate_tests ct
JOIN tests t ON ct.test_id = t.id
JOIN users u ON ct.candidate_id = u.id
LEFT JOIN skill_levels sl ON ct.final_skill_level_id = sl.id
LEFT JOIN submissions s ON ct.id = s.candidate_test_id
LEFT JOIN recruiter_feedback rf ON ct.id = rf.candidate_test_id
GROUP BY ct.id, t.test_name, t.test_type, u.full_name, u.email, ct.status, 
         ct.total_score, sl.level_name, ct.completed_at, ct.time_taken_minutes, 
         rf.overall_comments;

-- ============================================
-- RELATIONSHIP SUMMARY
-- ============================================

/*
KEY RELATIONSHIPS:

1. users -> candidate_profiles (1:1)
   - Each candidate has one profile with LinkedIn/GitHub data

2. users -> candidate_tests (1:N)
   - Each candidate can take multiple tests

3. tests -> test_questions (1:N)
   - Each test contains multiple questions

4. questions -> test_cases (1:N)
   - Each question has multiple test cases

5. candidate_tests -> submissions (1:N)
   - Each test attempt has multiple code submissions

6. submissions -> test_case_results (1:N)
   - Each submission is validated against multiple test cases

7. candidate_tests -> proctoring_logs (1:N)
   - Proctored exams generate multiple event logs

8. candidate_tests -> exam_outcomes (1:1)
   - Employability exams have one final outcome

9. candidate_tests -> recruiter_feedback (1:N)
   - Multiple recruiters can provide feedback

10. candidate_profiles -> skill_levels (N:1)
    - Multiple candidates can be at the same skill level

11. users -> practice_sessions (1:N)
    - Candidates can practice multiple questions

12. users -> leaderboard (1:1)
    - Each candidate has one leaderboard entry

SCALABILITY CONSIDERATIONS:
- Indexed foreign keys for fast joins
- JSONB for flexible LinkedIn/GitHub data storage
- Partitioning potential for large tables (submissions, system_logs)
- Separate proctoring_logs table to handle high-frequency writes
- Views for common complex queries to improve performance
*/

-- ============================================
-- SAMPLE DATA INSERTION (Optional)
-- ============================================

-- Insert default admin user (password: 'admin123' - should be hashed in production)
INSERT INTO users (email, password_hash, role, full_name, status, email_verified)
VALUES ('admin@jsat.com', '$2a$10$examplehash', 'admin', 'System Administrator', 'active', TRUE);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('site_name', 'J-SAT', 'string', 'Application name'),
('jwt_expiry_minutes', '60', 'integer', 'JWT token expiration time'),
('max_test_duration_minutes', '180', 'integer', 'Maximum test duration'),
('question_randomization', 'true', 'boolean', 'Enable question randomization'),
('proctoring_enabled', 'true', 'boolean', 'Enable proctoring by default'),
('points_per_question', '10', 'integer', 'Maximum points per question'),
('level_advancement_threshold', '3', 'integer', 'Consecutive perfect scores for level up prompt');

-- ============================================
-- END OF SCHEMA
-- ============================================