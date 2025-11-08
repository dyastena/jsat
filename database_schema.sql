-- ============================================
-- J-SAT (Java Skill Assessment Platform)
-- Production-Ready Supabase Database Schema
-- ============================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================
-- ENUM TYPES
-- ============================================

create type difficulty_level as enum ('beginner', 'intermediate', 'advanced');
create type test_status as enum ('not_started', 'in_progress', 'completed', 'expired');
create type submission_status as enum ('pending', 'running', 'passed', 'failed', 'error');
create type account_status as enum ('active', 'inactive', 'suspended', 'pending');
create type exam_type as enum ('practice', 'assessment', 'employability');
create type proctoring_event as enum ('tab_switch', 'window_blur', 'copy_paste', 'multiple_faces', 'no_face');
create type candidate_outcome as enum ('pending', 'hired', 'rejected');
create type log_level as enum ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- ============================================
-- TABLE DEFINITIONS
-- ============================================

-- Skill levels reference table
create table skill_levels (
    id uuid primary key default gen_random_uuid(),
    level_name varchar(50) unique not null,
    level_order integer unique not null,
    min_points integer not null,
    max_points integer,
    description text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- Users table (extends Supabase Auth)
create table users (
    id uuid primary key references auth.users(id) on delete cascade,
    email varchar(255) unique not null,
    full_name varchar(255) not null,
    status account_status default 'active',
    profile_picture_url text,
    phone_number varchar(20),
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    last_login timestamptz
);

create index idx_users_email on users(email);
create index idx_users_status on users(status);

-- Candidate profiles
create table candidate_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid unique not null references users(id) on delete cascade,
    current_skill_level_id uuid references skill_levels(id),
    total_points integer default 0,
    linkedin_profile_url text,
    linkedin_data jsonb,
    github_profile_url text,
    github_data jsonb,
    resume_url text,
    bio text,
    first_login_completed boolean default false,
    consecutive_perfect_scores integer default 0,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_candidate_profiles_user_id on candidate_profiles(user_id);
create index idx_candidate_profiles_skill_level on candidate_profiles(current_skill_level_id);

-- Questions
create table questions (
    id uuid primary key default gen_random_uuid(),
    title varchar(500) not null,
    description text not null,
    difficulty difficulty_level not null,
    max_points integer default 10,
    time_limit_minutes integer default 30,
    template_code text,
    solution_code text,
    tags text[],
    is_active boolean default true,
    created_by uuid references users(id),
    is_ai_generated boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_questions_difficulty on questions(difficulty);
create index idx_questions_is_active on questions(is_active);
create index idx_questions_tags on questions using gin(tags);
create index idx_questions_created_by on questions(created_by);

-- Test cases
create table test_cases (
    id uuid primary key default gen_random_uuid(),
    question_id uuid not null references questions(id) on delete cascade,
    input text not null,
    expected_output text not null,
    is_sample boolean default false,
    weight decimal(5,2) default 1.0,
    time_limit_ms integer default 5000,
    memory_limit_mb integer default 256,
    is_hidden boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_test_cases_question_id on test_cases(question_id);

-- AI question generation logs
create table ai_question_logs (
    id uuid primary key default gen_random_uuid(),
    question_id uuid references questions(id) on delete set null,
    created_by uuid references users(id),
    topic varchar(255),
    difficulty difficulty_level,
    prompt text,
    ai_model varchar(100),
    review_status varchar(50) default 'pending',
    reviewed_by uuid references users(id),
    reviewed_at timestamptz,
    review_notes text,
    created_at timestamptz default now()
);

create index idx_ai_question_logs_status on ai_question_logs(review_status);
create index idx_ai_question_logs_question_id on ai_question_logs(question_id);

-- Tests
create table tests (
    id uuid primary key default gen_random_uuid(),
    test_name varchar(255) not null,
    test_type exam_type not null,
    difficulty difficulty_level,
    created_by uuid not null references users(id) on delete cascade,
    total_questions integer not null,
    time_limit_minutes integer not null,
    passing_score decimal(5,2),
    instructions text,
    is_randomized boolean default true,
    is_proctored boolean default false,
    start_time timestamptz,
    end_time timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_tests_created_by on tests(created_by);
create index idx_tests_type on tests(test_type);

-- Test questions
create table test_questions (
    id uuid primary key default gen_random_uuid(),
    test_id uuid not null references tests(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    question_order integer not null,
    points_allocated integer default 10,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(test_id, question_id)
);

create index idx_test_questions_test_id on test_questions(test_id);
create index idx_test_questions_question_id on test_questions(question_id);

-- Candidate tests
create table candidate_tests (
    id uuid primary key default gen_random_uuid(),
    test_id uuid not null references tests(id) on delete cascade,
    candidate_id uuid not null references users(id) on delete cascade,
    assigned_by uuid not null references users(id),
    status test_status default 'not_started',
    unique_access_token varchar(255) unique default encode(gen_random_bytes(32), 'hex'),
    started_at timestamptz,
    completed_at timestamptz,
    time_taken_minutes integer,
    total_score decimal(5,2),
    final_skill_level_id uuid references skill_levels(id),
    assigned_at timestamptz default now(),
    expires_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(test_id, candidate_id)
);

create index idx_candidate_tests_candidate_id on candidate_tests(candidate_id);
create index idx_candidate_tests_test_id on candidate_tests(test_id);
create index idx_candidate_tests_assigned_by on candidate_tests(assigned_by);
create index idx_candidate_tests_status on candidate_tests(status);
create index idx_candidate_tests_token on candidate_tests(unique_access_token);

-- Submissions
create table submissions (
    id uuid primary key default gen_random_uuid(),
    candidate_test_id uuid not null references candidate_tests(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    candidate_id uuid not null references users(id) on delete cascade,
    submitted_code text not null,
    status submission_status default 'pending',
    execution_time_ms integer,
    memory_used_mb decimal(10,2),
    output text,
    error_log text,
    accuracy_percentage decimal(5,2),
    passed_test_cases integer default 0,
    total_test_cases integer default 0,
    lines_of_code integer,
    code_complexity_score decimal(5,2),
    error_count integer default 0,
    style_score decimal(5,2),
    points_earned decimal(5,2) default 0,
    max_points integer default 10,
    submitted_at timestamptz default now(),
    evaluated_at timestamptz,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_submissions_candidate_test_id on submissions(candidate_test_id);
create index idx_submissions_candidate_id on submissions(candidate_id);
create index idx_submissions_question_id on submissions(question_id);
create index idx_submissions_status on submissions(status);

-- Test case results
create table test_case_results (
    id uuid primary key default gen_random_uuid(),
    submission_id uuid not null references submissions(id) on delete cascade,
    test_case_id uuid not null references test_cases(id) on delete cascade,
    passed boolean not null,
    actual_output text,
    execution_time_ms integer,
    error_message text,
    created_at timestamptz default now()
);

create index idx_test_case_results_submission_id on test_case_results(submission_id);

-- Proctoring logs
create table proctoring_logs (
    id uuid primary key default gen_random_uuid(),
    candidate_test_id uuid not null references candidate_tests(id) on delete cascade,
    event_type proctoring_event not null,
    event_details jsonb,
    screenshot_url text,
    webcam_capture_url text,
    created_at timestamptz default now()
);

create index idx_proctoring_logs_candidate_test_id on proctoring_logs(candidate_test_id);
create index idx_proctoring_logs_event_type on proctoring_logs(event_type);
create index idx_proctoring_logs_created_at on proctoring_logs(created_at);

-- Exam outcomes
create table exam_outcomes (
    id uuid primary key default gen_random_uuid(),
    candidate_test_id uuid unique not null references candidate_tests(id) on delete cascade,
    recruiter_id uuid not null references users(id),
    outcome candidate_outcome default 'pending',
    recruiter_notes text,
    interview_scheduled_at timestamptz,
    decided_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_exam_outcomes_candidate_test_id on exam_outcomes(candidate_test_id);
create index idx_exam_outcomes_outcome on exam_outcomes(outcome);

-- Recruiter feedback
create table recruiter_feedback (
    id uuid primary key default gen_random_uuid(),
    candidate_test_id uuid not null references candidate_tests(id) on delete cascade,
    recruiter_id uuid not null references users(id),
    strengths text,
    weaknesses text,
    improvement_areas text[],
    overall_comments text,
    is_visible_to_candidate boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_recruiter_feedback_candidate_test_id on recruiter_feedback(candidate_test_id);
create index idx_recruiter_feedback_recruiter_id on recruiter_feedback(recruiter_id);

-- Practice sessions
create table practice_sessions (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid not null references users(id) on delete cascade,
    question_id uuid not null references questions(id) on delete cascade,
    attempts integer default 0,
    best_score decimal(5,2) default 0,
    total_time_spent_minutes integer default 0,
    last_attempted_at timestamptz,
    completed boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_practice_sessions_candidate_id on practice_sessions(candidate_id);
create index idx_practice_sessions_question_id on practice_sessions(question_id);

-- Leaderboard
create table leaderboard (
    id uuid primary key default gen_random_uuid(),
    candidate_id uuid unique not null references users(id) on delete cascade,
    total_practice_points decimal(10,2) default 0,
    problems_solved integer default 0,
    current_rank integer,
    rank_updated_at timestamptz default now(),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_leaderboard_rank on leaderboard(current_rank);
create index idx_leaderboard_points on leaderboard(total_practice_points desc);

-- System logs
create table system_logs (
    id uuid primary key default gen_random_uuid(),
    log_level log_level not null,
    module varchar(100),
    message text not null,
    stack_trace text,
    user_id uuid references users(id),
    ip_address inet,
    metadata jsonb,
    created_at timestamptz default now()
);

create index idx_system_logs_level on system_logs(log_level);
create index idx_system_logs_created_at on system_logs(created_at);
create index idx_system_logs_module on system_logs(module);
create index idx_system_logs_user_id on system_logs(user_id);

-- System metrics
create table system_metrics (
    id uuid primary key default gen_random_uuid(),
    cpu_usage_percentage decimal(5,2),
    memory_usage_percentage decimal(5,2),
    disk_usage_percentage decimal(5,2),
    database_size_mb decimal(10,2),
    active_users integer,
    running_tests integer,
    recorded_at timestamptz default now()
);

create index idx_system_metrics_recorded_at on system_metrics(recorded_at);

-- Backups
create table backups (
    id uuid primary key default gen_random_uuid(),
    backup_name varchar(255) not null,
    backup_path text not null,
    backup_size_mb decimal(10,2),
    backup_type varchar(50),
    status varchar(50) default 'completed',
    initiated_by uuid references users(id),
    started_at timestamptz default now(),
    completed_at timestamptz,
    error_message text
);

create index idx_backups_started_at on backups(started_at);

-- System settings
create table system_settings (
    id uuid primary key default gen_random_uuid(),
    setting_key varchar(100) unique not null,
    setting_value text,
    setting_type varchar(50),
    description text,
    updated_by uuid references users(id),
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index idx_system_settings_key on system_settings(setting_key);

-- Notifications
create table notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    title varchar(255) not null,
    message text not null,
    notification_type varchar(50),
    is_read boolean default false,
    related_entity_type varchar(50),
    related_entity_id uuid,
    created_at timestamptz default now(),
    read_at timestamptz
);

create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(is_read);
create index idx_notifications_created_at on notifications(created_at);

-- Email logs
create table email_logs (
    id uuid primary key default gen_random_uuid(),
    recipient_email varchar(255) not null,
    recipient_user_id uuid references users(id),
    subject varchar(500) not null,
    body text not null,
    email_type varchar(100),
    status varchar(50) default 'pending',
    sent_at timestamptz,
    error_message text,
    created_at timestamptz default now()
);

create index idx_email_logs_recipient_user_id on email_logs(recipient_user_id);
create index idx_email_logs_status on email_logs(status);
create index idx_email_logs_created_at on email_logs(created_at);

-- Audit trail
create table audit_trail (
    id uuid primary key default gen_random_uuid(),
    table_name varchar(100) not null,
    operation varchar(20) not null,
    record_id uuid,
    user_id uuid references users(id),
    changed_data jsonb,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamptz default now()
);

create index idx_audit_trail_user_id on audit_trail(user_id);
create index idx_audit_trail_table_name on audit_trail(table_name);
create index idx_audit_trail_operation on audit_trail(operation);
create index idx_audit_trail_created_at on audit_trail(created_at);
create index idx_audit_trail_record on audit_trail(table_name, record_id);

-- ============================================
-- ENUM / LOOKUP DATA
-- ============================================

-- Insert default skill levels
insert into skill_levels (level_name, level_order, min_points, max_points, description) values
('Beginner', 1, 0, 99, 'Basic understanding of Java fundamentals'),
('Novice', 2, 100, 149, 'Developing proficiency with occasional errors'),
('Intermediate', 3, 150, 199, 'Solid understanding with balanced performance'),
('Advanced', 4, 200, 249, 'High accuracy with optimized solutions'),
('Expert', 5, 250, null, 'Mastery of concepts with highly efficient code');

-- Insert default system settings
insert into system_settings (setting_key, setting_value, setting_type, description) values
('site_name', 'J-SAT', 'string', 'Application name'),
('jwt_expiry_minutes', '60', 'integer', 'JWT token expiration time'),
('max_test_duration_minutes', '180', 'integer', 'Maximum test duration'),
('question_randomization', 'true', 'boolean', 'Enable question randomization'),
('proctoring_enabled', 'true', 'boolean', 'Enable proctoring by default'),
('points_per_question', '10', 'integer', 'Maximum points per question'),
('level_advancement_threshold', '3', 'integer', 'Consecutive perfect scores for level up prompt');

-- ============================================
-- TRIGGER FUNCTIONS
-- ============================================

-- Universal function to set updated_at timestamp
create or replace function set_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- Function to log changes to audit trail
create or replace function log_changes()
returns trigger
language plpgsql
security definer
as $$
begin
    insert into audit_trail (
        table_name,
        operation,
        record_id,
        user_id,
        old_data,
        new_data,
        changed_data
    ) values (
        tg_table_name,
        tg_op,
        coalesce(new.id, old.id),
        auth.uid(),
        case when tg_op in ('UPDATE', 'DELETE') then row_to_json(old) else null end,
        case when tg_op in ('INSERT', 'UPDATE') then row_to_json(new) else null end,
        case 
            when tg_op = 'UPDATE' then 
                (select jsonb_object_agg(key, value) 
                 from jsonb_each(to_jsonb(new)) 
                 where to_jsonb(new)->key is distinct from to_jsonb(old)->key)
            else null 
        end
    );
    return coalesce(new, old);
end;
$$;

-- Function to log AI-generated questions
create or replace function log_ai_question()
returns trigger
language plpgsql
security definer
as $$
begin
    if new.is_ai_generated = true then
        insert into ai_question_logs (
            question_id,
            created_by,
            topic,
            difficulty
        ) values (
            new.id,
            new.created_by,
            (new.tags)[1], -- Use first tag as topic
            new.difficulty
        );
    end if;
    return new;
end;
$$;

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_full_name text;
BEGIN
    user_full_name := COALESCE(
        new.raw_user_meta_data->>'full_name',
        SPLIT_PART(new.email, '@', 1),
        'New User'
    );
    
    INSERT INTO users (id, email, full_name, status)
    VALUES (
        new.id,
        new.email,
        user_full_name,
        'active'
    )
    ON CONFLICT (id) DO NOTHING;
    
    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', new.id, SQLERRM;
    RETURN new;
END;
$$;

-- Function to create candidate profile
CREATE OR REPLACE FUNCTION public.create_candidate_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    skill_level_id uuid;
BEGIN
    SELECT id INTO skill_level_id
    FROM skill_levels
    WHERE level_name = 'Beginner'
    LIMIT 1;
    
    INSERT INTO candidate_profiles (user_id, current_skill_level_id, total_points)
    VALUES (auth.uid(), skill_level_id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    
    INSERT INTO leaderboard (candidate_id, total_practice_points, problems_solved)
    VALUES (auth.uid(), 0, 0)
    ON CONFLICT (candidate_id) DO NOTHING;
END;
$$;

-- Function to update candidate skill level based on points
create or replace function update_candidate_skill_level()
returns trigger
language plpgsql
security definer
as $$
declare
    new_level_id uuid;
begin
    select id into new_level_id
    from skill_levels
    where new.total_points >= min_points
        and (max_points is null or new.total_points <= max_points)
    order by level_order desc
    limit 1;
    
    if new_level_id is not null and new_level_id != old.current_skill_level_id then
        new.current_skill_level_id := new_level_id;
        
        -- Send notification about level up
        insert into notifications (user_id, title, message, notification_type)
        values (
            new.user_id,
            'Level Up!',
            'Congratulations! You have advanced to a new skill level.',
            'level_up'
        );
    end if;
    
    return new;
end;
$$;

-- Function to update leaderboard rankings
create or replace function update_leaderboard_rankings()
returns void
language plpgsql
security definer
as $$
begin
    with ranked_candidates as (
        select 
            candidate_id,
            rank() over (order by total_practice_points desc, problems_solved desc) as new_rank
        from leaderboard
    )
    update leaderboard l
    set 
        current_rank = rc.new_rank,
        rank_updated_at = now()
    from ranked_candidates rc
    where l.candidate_id = rc.candidate_id
        and l.current_rank is distinct from rc.new_rank;
end;
$$;

-- Helper functions for RLS
create or replace function is_admin(uid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from auth.users
        where id = uid
        and raw_user_meta_data->>'role' = 'admin'
    );
end;
$$;

create or replace function is_recruiter(uid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from auth.users
        where id = uid
        and raw_user_meta_data->>'role' in ('recruiter', 'admin')
    );
end;
$$;

create or replace function is_candidate(uid uuid)
returns boolean
language plpgsql
security definer
as $$
begin
    return exists (
        select 1 from auth.users
        where id = uid
        and raw_user_meta_data->>'role' = 'candidate'
    );
end;
$$;

-- ============================================
-- APPLY TRIGGERS
-- ============================================

-- Apply updated_at trigger to all relevant tables
create trigger set_updated_at_users before update on users
    for each row execute function set_updated_at();

create trigger set_updated_at_candidate_profiles before update on candidate_profiles
    for each row execute function set_updated_at();

create trigger set_updated_at_questions before update on questions
    for each row execute function set_updated_at();

create trigger set_updated_at_test_cases before update on test_cases
    for each row execute function set_updated_at();

create trigger set_updated_at_tests before update on tests
    for each row execute function set_updated_at();

create trigger set_updated_at_test_questions before update on test_questions
    for each row execute function set_updated_at();

create trigger set_updated_at_candidate_tests before update on candidate_tests
    for each row execute function set_updated_at();

create trigger set_updated_at_submissions before update on submissions
    for each row execute function set_updated_at();

create trigger set_updated_at_exam_outcomes before update on exam_outcomes
    for each row execute function set_updated_at();

create trigger set_updated_at_recruiter_feedback before update on recruiter_feedback
    for each row execute function set_updated_at();

create trigger set_updated_at_practice_sessions before update on practice_sessions
    for each row execute function set_updated_at();

create trigger set_updated_at_leaderboard before update on leaderboard
    for each row execute function set_updated_at();

create trigger set_updated_at_skill_levels before update on skill_levels
    for each row execute function set_updated_at();

create trigger set_updated_at_system_settings before update on system_settings
    for each row execute function set_updated_at();

-- Apply audit logging triggers to sensitive tables
create trigger audit_users_changes
    after insert or update or delete on users
    for each row execute function log_changes();

create trigger audit_questions_changes
    after insert or update or delete on questions
    for each row execute function log_changes();

create trigger audit_tests_changes
    after insert or update or delete on tests
    for each row execute function log_changes();

create trigger audit_submissions_changes
    after insert or update or delete on submissions
    for each row execute function log_changes();

create trigger audit_candidate_tests_changes
    after insert or update or delete on candidate_tests
    for each row execute function log_changes();

create trigger audit_exam_outcomes_changes
    after insert or update or delete on exam_outcomes
    for each row execute function log_changes();

-- Apply AI question logging trigger
create trigger log_ai_generated_question
    after insert on questions
    for each row execute function log_ai_question();

-- Apply user registration trigger
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- Apply skill level update trigger
create trigger update_skill_level_on_points_change
    before update on candidate_profiles
    for each row
    when (old.total_points is distinct from new.total_points)
    execute function update_candidate_skill_level();

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
alter table users enable row level security;
alter table candidate_profiles enable row level security;
alter table questions enable row level security;
alter table test_cases enable row level security;
alter table ai_question_logs enable row level security;
alter table tests enable row level security;
alter table test_questions enable row level security;
alter table candidate_tests enable row level security;
alter table submissions enable row level security;
alter table test_case_results enable row level security;
alter table proctoring_logs enable row level security;
alter table exam_outcomes enable row level security;
alter table recruiter_feedback enable row level security;
alter table practice_sessions enable row level security;
alter table leaderboard enable row level security;
alter table system_logs enable row level security;
alter table system_metrics enable row level security;
alter table backups enable row level security;
alter table system_settings enable row level security;
alter table notifications enable row level security;
alter table email_logs enable row level security;
alter table audit_trail enable row level security;
alter table skill_levels enable row level security;

-- Users policies
create policy "System can create new users"
    on users for insert
    with check (true); -- Allows the handle_new_user trigger to insert new users

create policy "Users can view their own profile"
    on users for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on users for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

create policy "Admins can view all users"
    on users for select
    using (is_admin(auth.uid()));

create policy "Admins can manage all users"
    on users for all
    using (is_admin(auth.uid()));

-- Candidate profiles policies
create policy "Candidates can view their own profile"
    on candidate_profiles for select
    using (auth.uid() = user_id);

create policy "Candidates can update their own profile"
    on candidate_profiles for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Recruiters and admins can view candidate profiles"
    on candidate_profiles for select
    using (is_recruiter(auth.uid()));

create policy "Admins can manage all profiles"
    on candidate_profiles for all
    using (is_admin(auth.uid()));

-- Questions policies
create policy "Anyone authenticated can view active questions"
    on questions for select
    using (is_active = true and auth.uid() is not null);

create policy "Admins and recruiters can view all questions"
    on questions for select
    using (is_recruiter(auth.uid()));

create policy "Admins can manage questions"
    on questions for all
    using (is_admin(auth.uid()));

-- Test cases policies
create policy "Users can view sample test cases"
    on test_cases for select
    using (is_sample = true and auth.uid() is not null);

create policy "Admins and recruiters can view all test cases"
    on test_cases for select
    using (is_recruiter(auth.uid()));

create policy "Admins can manage test cases"
    on test_cases for all
    using (is_admin(auth.uid()));

-- AI question logs policies
create policy "Admins can view AI generation logs"
    on ai_question_logs for select
    using (is_admin(auth.uid()));

create policy "Admins can manage AI logs"
    on ai_question_logs for all
    using (is_admin(auth.uid()));

-- Tests policies
create policy "Recruiters can view their own tests"
    on tests for select
    using (created_by = auth.uid() or is_recruiter(auth.uid()));

create policy "Recruiters can create tests"
    on tests for insert
    with check (created_by = auth.uid() and is_recruiter(auth.uid()));

create policy "Recruiters can update their own tests"
    on tests for update
    using (created_by = auth.uid() or is_admin(auth.uid()));

create policy "Admins can delete tests"
    on tests for delete
    using (is_admin(auth.uid()));

-- Test questions policies
create policy "Recruiters can view test questions"
    on test_questions for select
    using (
        exists (
            select 1 from tests
            where tests.id = test_questions.test_id
            and (tests.created_by = auth.uid() or is_recruiter(auth.uid()))
        )
    );

create policy "Admins and recruiters can manage test questions"
    on test_questions for all
    using (is_recruiter(auth.uid()));

-- Candidate tests policies
create policy "Candidates can view their own tests"
    on candidate_tests for select
    using (candidate_id = auth.uid());

create policy "Candidates can update their own test status"
    on candidate_tests for update
    using (candidate_id = auth.uid())
    with check (candidate_id = auth.uid());

create policy "Recruiters can view tests they assigned"
    on candidate_tests for select
    using (
        assigned_by = auth.uid() or 
        is_recruiter(auth.uid())
    );

create policy "Recruiters can assign tests"
    on candidate_tests for insert
    with check (assigned_by = auth.uid() and is_recruiter(auth.uid()));

create policy "Admins can manage all candidate tests"
    on candidate_tests for all
    using (is_admin(auth.uid()));

-- Submissions policies
create policy "Candidates can view their own submissions"
    on submissions for select
    using (candidate_id = auth.uid());

create policy "Candidates can create their own submissions"
    on submissions for insert
    with check (candidate_id = auth.uid());

create policy "Recruiters can view submissions from tests they assigned"
    on submissions for select
    using (
        exists (
            select 1 from candidate_tests ct
            where ct.id = submissions.candidate_test_id
            and (ct.assigned_by = auth.uid() or is_recruiter(auth.uid()))
        )
    );

create policy "Admins can manage all submissions"
    on submissions for all
    using (is_admin(auth.uid()));

-- Test case results policies
create policy "Users can view test case results for their submissions"
    on test_case_results for select
    using (
        exists (
            select 1 from submissions s
            where s.id = test_case_results.submission_id
            and (
                s.candidate_id = auth.uid() or
                exists (
                    select 1 from candidate_tests ct
                    where ct.id = s.candidate_test_id
                    and (ct.assigned_by = auth.uid() or is_recruiter(auth.uid()))
                )
            )
        )
    );

-- Proctoring logs policies
create policy "Recruiters can view proctoring logs for tests they assigned"
    on proctoring_logs for select
    using (
        exists (
            select 1 from candidate_tests ct
            where ct.id = proctoring_logs.candidate_test_id
            and (ct.assigned_by = auth.uid() or is_recruiter(auth.uid()))
        )
    );

create policy "System can insert proctoring logs"
    on proctoring_logs for insert
    with check (
        exists (
            select 1 from candidate_tests ct
            where ct.id = candidate_test_id
            and ct.candidate_id = auth.uid()
        )
    );

-- Exam outcomes policies
create policy "Recruiters can view outcomes for tests they assigned"
    on exam_outcomes for select
    using (
        recruiter_id = auth.uid() or
        exists (
            select 1 from candidate_tests ct
            where ct.id = exam_outcomes.candidate_test_id
            and ct.assigned_by = auth.uid()
        ) or
        is_recruiter(auth.uid())
    );

create policy "Recruiters can manage exam outcomes"
    on exam_outcomes for all
    using (is_recruiter(auth.uid()));

-- Recruiter feedback policies
create policy "Candidates can view feedback marked as visible"
    on recruiter_feedback for select
    using (
        is_visible_to_candidate = true and
        exists (
            select 1 from candidate_tests ct
            where ct.id = recruiter_feedback.candidate_test_id
            and ct.candidate_id = auth.uid()
        )
    );

create policy "Recruiters can view all feedback"
    on recruiter_feedback for select
    using (is_recruiter(auth.uid()));

create policy "Recruiters can create and manage feedback"
    on recruiter_feedback for all
    using (is_recruiter(auth.uid()));

-- Practice sessions policies
create policy "Candidates can view their own practice sessions"
    on practice_sessions for select
    using (candidate_id = auth.uid());

create policy "Candidates can manage their own practice sessions"
    on practice_sessions for all
    using (candidate_id = auth.uid())
    with check (candidate_id = auth.uid());

-- Leaderboard policies
create policy "Anyone authenticated can view leaderboard"
    on leaderboard for select
    using (auth.uid() is not null);

create policy "Candidates can update their own leaderboard entry"
    on leaderboard for update
    using (candidate_id = auth.uid())
    with check (candidate_id = auth.uid());

create policy "System can insert leaderboard entries"
    on leaderboard for insert
    with check (true);

-- System logs policies
create policy "Admins can view system logs"
    on system_logs for select
    using (is_admin(auth.uid()));

create policy "System can insert logs"
    on system_logs for insert
    with check (true);

-- System metrics policies
create policy "Admins can view system metrics"
    on system_metrics for select
    using (is_admin(auth.uid()));

create policy "System can insert metrics"
    on system_metrics for insert
    with check (true);

-- Backups policies
create policy "Admins can manage backups"
    on backups for all
    using (is_admin(auth.uid()));

-- System settings policies
create policy "Anyone authenticated can view system settings"
    on system_settings for select
    using (auth.uid() is not null);

create policy "Admins can manage system settings"
    on system_settings for all
    using (is_admin(auth.uid()));

-- Notifications policies
create policy "Users can view their own notifications"
    on notifications for select
    using (user_id = auth.uid());

create policy "Users can update their own notifications"
    on notifications for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy "System can create notifications"
    on notifications for insert
    with check (true);

-- Email logs policies
create policy "Admins can view email logs"
    on email_logs for select
    using (is_admin(auth.uid()));

create policy "System can insert email logs"
    on email_logs for insert
    with check (true);

-- Audit trail policies
create policy "Admins can view audit trail"
    on audit_trail for select
    using (is_admin(auth.uid()));

create policy "System can insert audit records"
    on audit_trail for insert
    with check (true);

-- Skill levels policies
create policy "Anyone can view skill levels"
    on skill_levels for select
    using (true);

create policy "Only admins can modify skill levels"
    on skill_levels for all
    using (is_admin(auth.uid()));

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Create storage buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values 
    ('resumes', 'resumes', false, 10485760, array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
    ('code-submissions', 'code-submissions', false, 5242880, array['text/plain', 'text/x-java-source', 'application/zip']),
    ('proctoring-screenshots', 'proctoring-screenshots', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Resumes bucket policies
create policy "Candidates can upload their own resume"
    on storage.objects for insert
    with check (
        bucket_id = 'resumes' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Candidates can view their own resume"
    on storage.objects for select
    using (
        bucket_id = 'resumes' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Candidates can update their own resume"
    on storage.objects for update
    using (
        bucket_id = 'resumes' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Candidates can delete their own resume"
    on storage.objects for delete
    using (
        bucket_id = 'resumes' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Recruiters can view candidate resumes"
    on storage.objects for select
    using (
        bucket_id = 'resumes' 
        and is_recruiter(auth.uid())
    );

create policy "Admins have full access to resumes"
    on storage.objects for all
    using (
        bucket_id = 'resumes' 
        and is_admin(auth.uid())
    );

-- Code submissions bucket policies
create policy "Candidates can upload their own code submissions"
    on storage.objects for insert
    with check (
        bucket_id = 'code-submissions' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Candidates can view their own code submissions"
    on storage.objects for select
    using (
        bucket_id = 'code-submissions' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Recruiters can view code submissions"
    on storage.objects for select
    using (
        bucket_id = 'code-submissions' 
        and is_recruiter(auth.uid())
    );

create policy "Admins have full access to code submissions"
    on storage.objects for all
    using (
        bucket_id = 'code-submissions' 
        and is_admin(auth.uid())
    );

-- Proctoring screenshots bucket policies
create policy "Candidates can upload proctoring screenshots during tests"
    on storage.objects for insert
    with check (
        bucket_id = 'proctoring-screenshots' 
        and auth.uid()::text = (storage.foldername(name))[1]
    );

create policy "Recruiters can view proctoring screenshots"
    on storage.objects for select
    using (
        bucket_id = 'proctoring-screenshots' 
        and is_recruiter(auth.uid())
    );

create policy "Admins have full access to proctoring screenshots"
    on storage.objects for all
    using (
        bucket_id = 'proctoring-screenshots' 
        and is_admin(auth.uid())
    );

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for candidate dashboard overview
CREATE OR REPLACE VIEW public.candidate_dashboard_view AS
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
    l.current_rank AS leaderboard_rank,
    l.total_practice_points,
    l.problems_solved
FROM users u
LEFT JOIN candidate_profiles cp ON u.id = cp.user_id
LEFT JOIN skill_levels sl ON cp.current_skill_level_id = sl.id
LEFT JOIN candidate_tests ct ON u.id = ct.candidate_id
LEFT JOIN leaderboard l ON u.id = l.candidate_id
GROUP BY u.id, u.full_name, u.email, cp.current_skill_level_id, sl.level_name, 
         cp.total_points, cp.consecutive_perfect_scores, l.current_rank,
         l.total_practice_points, l.problems_solved;

-- View for recruiter reports
create or replace view recruiter_reports_view as
select 
    ct.id as candidate_test_id,
    t.test_name,
    t.test_type,
    u.full_name as candidate_name,
    u.email as candidate_email,
    ct.status,
    ct.total_score,
    sl.level_name as skill_level,
    ct.completed_at,
    ct.time_taken_minutes,
    ct.assigned_by,
    assigner.full_name as assigned_by_name,
    count(distinct s.id) as total_submissions,
    avg(s.points_earned) as avg_points_per_question,
    count(distinct case when s.status = 'passed' then s.id end) as passed_submissions,
    rf.overall_comments as feedback,
    eo.outcome as exam_outcome
from candidate_tests ct
join tests t on ct.test_id = t.id
join users u on ct.candidate_id = u.id
join users assigner on ct.assigned_by = assigner.id
left join skill_levels sl on ct.final_skill_level_id = sl.id
left join submissions s on ct.id = s.candidate_test_id
left join recruiter_feedback rf on ct.id = rf.candidate_test_id
left join exam_outcomes eo on ct.id = eo.candidate_test_id
group by ct.id, t.test_name, t.test_type, u.full_name, u.email, ct.status, 
         ct.total_score, sl.level_name, ct.completed_at, ct.time_taken_minutes,
         ct.assigned_by, assigner.full_name, rf.overall_comments, eo.outcome;

-- View for admin dashboard statistics
CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM auth.users WHERE (raw_user_meta_data->>'role') = 'admin') AS total_admins,
    (SELECT COUNT(*) FROM auth.users WHERE (raw_user_meta_data->>'role') = 'recruiter') AS total_recruiters,
    (SELECT COUNT(*) FROM auth.users WHERE (raw_user_meta_data->>'role') = 'candidate') AS total_candidates,
    (SELECT COUNT(*) FROM candidate_tests WHERE status = 'completed') AS total_tests_completed,
    (SELECT AVG(total_score) FROM candidate_tests WHERE status = 'completed') AS avg_candidate_score,
    (SELECT COUNT(*) FROM questions WHERE is_active = true) AS total_active_questions,
    (SELECT COUNT(*) FROM tests) AS total_tests_created,
    (SELECT COUNT(*) FROM submissions) AS total_submissions;

-- ============================================
-- REALTIME SUBSCRIPTIONS (Optional)
-- ============================================

-- Enable realtime for specific tables
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table candidate_tests;
alter publication supabase_realtime add table leaderboard;
alter publication supabase_realtime add table proctoring_logs;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Additional composite indexes for common queries
create index idx_submissions_candidate_question on submissions(candidate_id, question_id);
create index idx_candidate_tests_status_candidate on candidate_tests(status, candidate_id);
create index idx_test_questions_test_order on test_questions(test_id, question_order);
create index idx_proctoring_logs_test_event on proctoring_logs(candidate_test_id, event_type);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schemas
grant usage on schema public to anon, authenticated;
grant usage on schema storage to anon, authenticated;

-- Grant select on views
grant select on candidate_dashboard_view to authenticated;
grant select on recruiter_reports_view to authenticated;
grant select on admin_dashboard_stats to authenticated;

-- ============================================
-- END OF SCHEMA
-- ============================================

-- Schema is now fully configured for Supabase with:
-- ✅ Row Level Security (RLS) enabled on all tables
-- ✅ Comprehensive RLS policies for role-based access (Admin, Recruiter, Candidate)
-- ✅ Automatic timestamp updates via set_updated_at() trigger
-- ✅ Comprehensive audit logging via log_changes() trigger
-- ✅ AI question logging via log_ai_question() trigger
-- ✅ Integration with Supabase Auth (auth.users)
-- ✅ UUID primary keys using gen_random_uuid()
-- ✅ Storage bucket policies for resumes, code submissions, and proctoring screenshots
-- ✅ Helper functions for role checking (is_admin, is_recruiter, is_candidate)
-- ✅ Views for dashboard queries (candidate_dashboard_view, recruiter_reports_view, admin_dashboard_stats)
-- ✅ Realtime subscriptions for notifications, candidate_tests, leaderboard, and proctoring_logs
-- ✅ Performance indexes for common query patterns
-- ✅ Proper foreign key relationships with cascade deletes
-- ✅ ENUM types for data consistency
-- ✅ Default data inserted for skill_levels and system_settings
