-- =====================================================
-- SAMPLE USER DATA FOR PROTOTYPING
-- =====================================================
-- This script generates realistic test data for your application
-- Run this after your database is set up

-- =====================================================
-- 1. INSERT AUTH USERS (Supabase Auth)
-- =====================================================
-- Note: Using actual UUIDs from users created on 2025-11-30
-- These match the auth.users table

-- =====================================================
-- 2. UPDATE EXISTING PROFILES (with real data)
-- =====================================================

-- Admin User (first user)
UPDATE public.profiles SET
    first_name = 'Sarah',
    last_name = 'Mitchell',
    role = 'admin',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '90 days'
WHERE id = '2994d01e-3e7b-4412-a2c0-78fe46d505f9';

-- Recruiters (users 2-4)
UPDATE public.profiles SET
    first_name = 'Michael',
    last_name = 'Chen',
    role = 'recruiter',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '75 days'
WHERE id = '396f4417-132d-42b9-8bfb-bc1936227c53';

UPDATE public.profiles SET
    first_name = 'Emily',
    last_name = 'Rodriguez',
    role = 'recruiter',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '60 days'
WHERE id = '398f56c0-22c3-4360-a324-0d8469615b38';

UPDATE public.profiles SET
    first_name = 'James',
    last_name = 'Thompson',
    role = 'recruiter',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '45 days'
WHERE id = '434c73d1-3623-425d-ae46-a372dba47c1b';

-- Candidates (remaining users 5-17 with varied experience levels)
-- Expert Level (users 5-6)
UPDATE public.profiles SET
    first_name = 'Alexandra',
    last_name = 'Kim',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '90 days'
WHERE id = '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a';

UPDATE public.profiles SET
    first_name = 'David',
    last_name = 'Patel',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '88 days'
WHERE id = '449e7198-73cb-4eca-a578-6ffd82cde4a8';

-- Advanced Level (users 7-9)
UPDATE public.profiles SET
    first_name = 'Marcus',
    last_name = 'Williams',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '78 days'
WHERE id = '56925a55-4633-4c52-82f5-8593d5094f8c';

UPDATE public.profiles SET
    first_name = 'Olivia',
    last_name = 'Garcia',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '75 days'
WHERE id = '6fddf4ec-63cd-484c-85ee-2a83fcbd77db';

UPDATE public.profiles SET
    first_name = 'Ethan',
    last_name = 'Martinez',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '73 days'
WHERE id = '7dc68ca4-4b98-4d3b-83e1-6dcc523c44ac';

-- Intermediate Level (users 10-13)
UPDATE public.profiles SET
    first_name = 'Isabella',
    last_name = 'Lee',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '58 days'
WHERE id = '9910bde6-356f-4877-b87f-0eaa684e9cb3';

UPDATE public.profiles SET
    first_name = 'Noah',
    last_name = 'Anderson',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '56 days'
WHERE id = 'a98bc4a0-fb19-4c6d-8c00-d74b7acde35b';

UPDATE public.profiles SET
    first_name = 'Emma',
    last_name = 'Taylor',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '54 days'
WHERE id = 'a9fcb9a5-9737-4da7-ac4b-b8537a324927';

UPDATE public.profiles SET
    first_name = 'Liam',
    last_name = 'Thomas',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '52 days'
WHERE id = 'ae9e3005-527a-4894-a41e-1cee5c17e3e9';

-- Novice Level (users 14-15)
UPDATE public.profiles SET
    first_name = 'Ava',
    last_name = 'Jackson',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '24 days'
WHERE id = 'b1c7763b-cbaf-4d85-b0b3-9d3ab17dda1f';

UPDATE public.profiles SET
    first_name = 'William',
    last_name = 'White',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '22 days'
WHERE id = 'b899855e-75a6-40a9-a888-7d1efc907a96';

-- Beginner Level (users 16-17)
UPDATE public.profiles SET
    first_name = 'Charlotte',
    last_name = 'Walker',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '8 days'
WHERE id = 'b9443058-a9d1-480d-bc92-bf4d76da6258';

UPDATE public.profiles SET
    first_name = 'Lucas',
    last_name = 'Hall',
    role = 'candidate',
    is_role_finalized = true,
    created_at = NOW() - INTERVAL '7 days'
WHERE id = 'ff26d398-5787-48b2-b956-d12b9465aaf2';


-- =====================================================
-- 3. INSERT LEVELS (for candidates only)
-- =====================================================
-- These are automatically created by trigger, but we'll populate with realistic progress

INSERT INTO public.level (profile_id, progress, level_status, created_at)
VALUES
-- Expert Level (2 users) - 250+ points
('44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 285.5, 'Expert', NOW() - INTERVAL '90 days'),
('449e7198-73cb-4eca-a578-6ffd82cde4a8', 275.0, 'Expert', NOW() - INTERVAL '88 days'),

-- Advanced Level (3 users) - 200-249 points
('56925a55-4633-4c52-82f5-8593d5094f8c', 235.8, 'Advanced', NOW() - INTERVAL '78 days'),
('6fddf4ec-63cd-484c-85ee-2a83fcbd77db', 225.5, 'Advanced', NOW() - INTERVAL '75 days'),
('7dc68ca4-4b98-4d3b-83e1-6dcc523c44ac', 215.2, 'Advanced', NOW() - INTERVAL '73 days'),

-- Intermediate Level (4 users) - 150-199 points
('9910bde6-356f-4877-b87f-0eaa684e9cb3', 185.2, 'Intermediate', NOW() - INTERVAL '58 days'),
('a98bc4a0-fb19-4c6d-8c00-d74b7acde35b', 175.6, 'Intermediate', NOW() - INTERVAL '56 days'),
('a9fcb9a5-9737-4da7-ac4b-b8537a324927', 165.8, 'Intermediate', NOW() - INTERVAL '54 days'),
('ae9e3005-527a-4894-a41e-1cee5c17e3e9', 155.3, 'Intermediate', NOW() - INTERVAL '52 days'),

-- Novice Level (2 users) - 100-149 points
('b1c7763b-cbaf-4d85-b0b3-9d3ab17dda1f', 135.5, 'Novice', NOW() - INTERVAL '24 days'),
('b899855e-75a6-40a9-a888-7d1efc907a96', 125.2, 'Novice', NOW() - INTERVAL '22 days'),

-- Beginner Level (2 users) - 0-99 points
('b9443058-a9d1-480d-bc92-bf4d76da6258', 75.7, 'Beginner', NOW() - INTERVAL '8 days'),
('ff26d398-5787-48b2-b956-d12b9465aaf2', 45.3, 'Beginner', NOW() - INTERVAL '7 days');


-- =====================================================
-- 4. INSERT SAMPLE QUESTIONS
-- =====================================================

INSERT INTO public.question (title, question, input, output, category, answer, difficulty, created_at)
VALUES 
-- Beginner Questions
('Sum Two Numbers', 'Write a function that takes two numbers and returns their sum.', 'a = 5, b = 3', '8', 'Basic Math', 'def sum_two(a, b):\n    return a + b', 'Beginner', NOW() - INTERVAL '100 days'),
('Even or Odd', 'Determine if a number is even or odd.', 'n = 7', 'Odd', 'Basic Logic', 'def even_odd(n):\n    return "Even" if n % 2 == 0 else "Odd"', 'Beginner', NOW() - INTERVAL '99 days'),
('Reverse String', 'Reverse a given string.', 's = "hello"', '"olleh"', 'String Manipulation', 'def reverse(s):\n    return s[::-1]', 'Beginner', NOW() - INTERVAL '98 days'),

-- Novice Questions
('Find Maximum', 'Find the maximum number in an array.', 'arr = [3, 7, 2, 9, 1]', '9', 'Arrays', 'def find_max(arr):\n    return max(arr)', 'Novice', NOW() - INTERVAL '97 days'),
('Count Vowels', 'Count the number of vowels in a string.', 's = "programming"', '3', 'String Manipulation', 'def count_vowels(s):\n    return sum(1 for c in s.lower() if c in "aeiou")', 'Novice', NOW() - INTERVAL '96 days'),
('Factorial', 'Calculate the factorial of a number.', 'n = 5', '120', 'Recursion', 'def factorial(n):\n    return 1 if n <= 1 else n * factorial(n-1)', 'Novice', NOW() - INTERVAL '95 days'),

-- Intermediate Questions
('Two Sum', 'Find two numbers in array that add up to target.', 'arr = [2,7,11,15], target = 9', '[0,1]', 'Arrays', 'def two_sum(arr, target):\n    seen = {}\n    for i, n in enumerate(arr):\n        if target-n in seen:\n            return [seen[target-n], i]\n        seen[n] = i', 'Intermediate', NOW() - INTERVAL '94 days'),
('Valid Parentheses', 'Check if parentheses are balanced.', 's = "({[]})"', 'true', 'Stack', 'def is_valid(s):\n    stack = []\n    pairs = {"(":")", "[":"]", "{":"}"}\n    for c in s:\n        if c in pairs:\n            stack.append(c)\n        elif not stack or pairs[stack.pop()] != c:\n            return False\n    return not stack', 'Intermediate', NOW() - INTERVAL '93 days'),
('Binary Search', 'Implement binary search algorithm.', 'arr = [1,3,5,7,9], target = 5', '2', 'Search Algorithm', 'def binary_search(arr, target):\n    l, r = 0, len(arr)-1\n    while l <= r:\n        m = (l+r)//2\n        if arr[m] == target: return m\n        elif arr[m] < target: l = m+1\n        else: r = m-1\n    return -1', 'Intermediate', NOW() - INTERVAL '92 days'),

-- Advanced Questions
('Longest Substring', 'Find longest substring without repeating characters.', 's = "abcabcbb"', '3', 'Sliding Window', 'def length_longest(s):\n    seen = {}\n    l = maxlen = 0\n    for r, c in enumerate(s):\n        if c in seen and seen[c] >= l:\n            l = seen[c] + 1\n        seen[c] = r\n        maxlen = max(maxlen, r-l+1)\n    return maxlen', 'Advanced', NOW() - INTERVAL '91 days'),
('Merge K Sorted Lists', 'Merge k sorted linked lists.', 'lists = [[1,4,5],[1,3,4],[2,6]]', '[1,1,2,3,4,4,5,6]', 'Linked List', 'def merge_k_lists(lists):\n    import heapq\n    heap = []\n    for i, lst in enumerate(lists):\n        if lst:\n            heapq.heappush(heap, (lst.val, i, lst))\n    dummy = curr = ListNode()\n    while heap:\n        val, i, node = heapq.heappop(heap)\n        curr.next = node\n        curr = curr.next\n        if node.next:\n            heapq.heappush(heap, (node.next.val, i, node.next))\n    return dummy.next', 'Advanced', NOW() - INTERVAL '90 days'),

-- Expert Questions
('Median Two Sorted Arrays', 'Find median of two sorted arrays.', 'arr1 = [1,3], arr2 = [2]', '2.0', 'Binary Search', 'def find_median(arr1, arr2):\n    if len(arr1) > len(arr2):\n        arr1, arr2 = arr2, arr1\n    x, y = len(arr1), len(arr2)\n    low, high = 0, x\n    while low <= high:\n        px = (low + high) // 2\n        py = (x + y + 1) // 2 - px\n        # Binary search logic...\n    # Return median calculation', 'Expert', NOW() - INTERVAL '89 days'),
('Regex Matching', 'Implement regular expression matching with . and *.', 's = "aa", p = "a*"', 'true', 'Dynamic Programming', 'def is_match(s, p):\n    dp = [[False]*(len(p)+1) for _ in range(len(s)+1)]\n    dp[0][0] = True\n    for j in range(2, len(p)+1):\n        if p[j-1] == "*":\n            dp[0][j] = dp[0][j-2]\n    # DP logic...\n    return dp[len(s)][len(p)]', 'Expert', NOW() - INTERVAL '88 days');


-- =====================================================
-- 5. INSERT EVALUATIONS (Sample test attempts)
-- =====================================================

-- Expert Level Users - Multiple tests with excellent scores
-- Alexandra Kim (Top Expert)
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 10.0, 9.8, 1.0, 9.9, 0.2, NOW() - INTERVAL '85 days'),
(18, '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 10.0, 9.5, 1.5, 9.8, 0.5, NOW() - INTERVAL '80 days'),
(27, '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 9.8, 9.6, 2.0, 9.7, 0.8, NOW() - INTERVAL '75 days'),
(31, '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 9.5, 9.2, 3.0, 9.3, 1.5, NOW() - INTERVAL '70 days'),
(36, '44816fd3-ae35-4b5d-8dc3-27d8cd6a249a', 9.3, 9.0, 4.0, 9.0, 2.0, NOW() - INTERVAL '65 days');

-- David Patel
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, '449e7198-73cb-4eca-a578-6ffd82cde4a8', 10.0, 9.5, 1.2, 9.7, 0.5, NOW() - INTERVAL '83 days'),
(17, '449e7198-73cb-4eca-a578-6ffd82cde4a8', 9.8, 9.2, 1.8, 9.5, 1.0, NOW() - INTERVAL '78 days'),
(28, '449e7198-73cb-4eca-a578-6ffd82cde4a8', 9.5, 9.0, 2.5, 9.2, 1.5, NOW() - INTERVAL '73 days'),
(31, '449e7198-73cb-4eca-a578-6ffd82cde4a8', 9.0, 8.8, 3.5, 8.9, 2.0, NOW() - INTERVAL '68 days');

-- Advanced Level Users
-- Marcus Williams
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, '56925a55-4633-4c52-82f5-8593d5094f8c', 9.5, 8.8, 1.5, 9.0, 1.0, NOW() - INTERVAL '73 days'),
(17, '56925a55-4633-4c52-82f5-8593d5094f8c', 9.0, 8.5, 2.0, 8.8, 1.5, NOW() - INTERVAL '68 days'),
(18, '56925a55-4633-4c52-82f5-8593d5094f8c', 8.8, 8.2, 2.5, 8.5, 2.0, NOW() - INTERVAL '63 days'),
(27, '56925a55-4633-4c52-82f5-8593d5094f8c', 8.5, 8.0, 3.0, 8.2, 2.5, NOW() - INTERVAL '58 days'),
(28, '56925a55-4633-4c52-82f5-8593d5094f8c', 8.2, 7.8, 3.5, 8.0, 3.0, NOW() - INTERVAL '53 days');

-- Olivia Garcia
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, '6fddf4ec-63cd-484c-85ee-2a83fcbd77db', 9.2, 8.8, 1.8, 9.0, 1.2, NOW() - INTERVAL '70 days'),
(17, '6fddf4ec-63cd-484c-85ee-2a83fcbd77db', 8.8, 8.5, 2.2, 8.7, 1.8, NOW() - INTERVAL '65 days'),
(18, '6fddf4ec-63cd-484c-85ee-2a83fcbd77db', 8.5, 8.0, 2.8, 8.3, 2.2, NOW() - INTERVAL '60 days'),
(27, '6fddf4ec-63cd-484c-85ee-2a83fcbd77db', 8.0, 7.8, 3.5, 8.0, 2.8, NOW() - INTERVAL '55 days');

-- Ethan Martinez
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(17, '7dc68ca4-4b98-4d3b-83e1-6dcc523c44ac', 9.0, 8.5, 2.0, 8.8, 1.5, NOW() - INTERVAL '65 days'),
(18, '7dc68ca4-4b98-4d3b-83e1-6dcc523c44ac', 8.7, 8.2, 2.5, 8.5, 2.0, NOW() - INTERVAL '60 days'),
(28, '7dc68ca4-4b98-4d3b-83e1-6dcc523c44ac', 8.3, 8.0, 3.0, 8.2, 2.5, NOW() - INTERVAL '55 days');

-- Intermediate Level Users
-- Isabella Lee
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, '9910bde6-356f-4877-b87f-0eaa684e9cb3', 8.5, 7.8, 2.2, 8.0, 2.0, NOW() - INTERVAL '53 days'),
(17, '9910bde6-356f-4877-b87f-0eaa684e9cb3', 8.0, 7.5, 2.8, 7.8, 2.5, NOW() - INTERVAL '48 days'),
(26, '9910bde6-356f-4877-b87f-0eaa684e9cb3', 7.8, 7.2, 3.2, 7.5, 3.0, NOW() - INTERVAL '43 days'),
(27, '9910bde6-356f-4877-b87f-0eaa684e9cb3', 7.5, 7.0, 3.8, 7.2, 3.5, NOW() - INTERVAL '38 days');

-- Noah Anderson
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'a98bc4a0-fb19-4c6d-8c00-d74b7acde35b', 8.2, 7.5, 2.5, 7.8, 2.2, NOW() - INTERVAL '51 days'),
(17, 'a98bc4a0-fb19-4c6d-8c00-d74b7acde35b', 7.8, 7.2, 3.0, 7.5, 2.8, NOW() - INTERVAL '46 days'),
(18, 'a98bc4a0-fb19-4c6d-8c00-d74b7acde35b', 7.5, 7.0, 3.5, 7.2, 3.2, NOW() - INTERVAL '41 days');

-- Emma Taylor
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'a9fcb9a5-9737-4da7-ac4b-b8537a324927', 7.8, 7.2, 2.8, 7.5, 2.5, NOW() - INTERVAL '45 days'),
(17, 'a9fcb9a5-9737-4da7-ac4b-b8537a324927', 7.5, 7.0, 3.2, 7.2, 3.0, NOW() - INTERVAL '40 days'),
(26, 'a9fcb9a5-9737-4da7-ac4b-b8537a324927', 7.2, 6.8, 3.8, 7.0, 3.5, NOW() - INTERVAL '35 days');

-- Liam Thomas
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'ae9e3005-527a-4894-a41e-1cee5c17e3e9', 7.5, 7.0, 3.0, 7.2, 2.8, NOW() - INTERVAL '41 days'),
(17, 'ae9e3005-527a-4894-a41e-1cee5c17e3e9', 7.2, 6.8, 3.5, 7.0, 3.2, NOW() - INTERVAL '36 days'),
(18, 'ae9e3005-527a-4894-a41e-1cee5c17e3e9', 7.0, 6.5, 4.0, 6.8, 3.8, NOW() - INTERVAL '31 days');

-- Novice Level Users
-- Ava Jackson
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'b1c7763b-cbaf-4d85-b0b3-9d3ab17dda1f', 7.0, 6.5, 3.5, 6.8, 3.5, NOW() - INTERVAL '19 days'),
(17, 'b1c7763b-cbaf-4d85-b0b3-9d3ab17dda1f', 6.8, 6.2, 4.0, 6.5, 4.0, NOW() - INTERVAL '14 days'),
(18, 'b1c7763b-cbaf-4d85-b0b3-9d3ab17dda1f', 6.5, 6.0, 4.5, 6.2, 4.5, NOW() - INTERVAL '9 days');

-- William White
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'b899855e-75a6-40a9-a888-7d1efc907a96', 6.8, 6.2, 3.8, 6.5, 3.8, NOW() - INTERVAL '17 days'),
(17, 'b899855e-75a6-40a9-a888-7d1efc907a96', 6.5, 6.0, 4.2, 6.2, 4.2, NOW() - INTERVAL '12 days');

-- Beginner Level Users
-- Charlotte Walker
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'b9443058-a9d1-480d-bc92-bf4d76da6258', 6.0, 5.5, 4.5, 5.8, 4.5, NOW() - INTERVAL '6 days'),
(17, 'b9443058-a9d1-480d-bc92-bf4d76da6258', 6.2, 5.8, 4.2, 6.0, 4.2, NOW() - INTERVAL '3 days');

-- Lucas Hall
INSERT INTO public.evaluation (question_id, profile_id, correctness, line_code, time_taken, runtime, error_made, created_at)
VALUES
(16, 'ff26d398-5787-48b2-b956-d12b9465aaf2', 5.8, 5.2, 4.8, 5.5, 4.8, NOW() - INTERVAL '5 days'),
(17, 'ff26d398-5787-48b2-b956-d12b9465aaf2', 6.0, 5.5, 4.5, 5.8, 4.5, NOW() - INTERVAL '2 days');


-- =====================================================
-- NOTE: Results are auto-generated by triggers
-- =====================================================
-- The insert_result_after_evaluation trigger will automatically
-- create result entries when evaluations are inserted

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify your data:

-- Check user counts by role
-- SELECT role, COUNT(*) FROM public.profiles GROUP BY role;

-- Check level distribution
-- SELECT level_status, COUNT(*) FROM public.level GROUP BY level_status;

-- View top performers
-- SELECT p.first_name, p.last_name, l.progress, l.level_status 
-- FROM public.profiles p 
-- JOIN public.level l ON p.id = l.profile_id 
-- ORDER BY l.progress DESC LIMIT 10;

-- Check recent evaluations
-- SELECT p.first_name, p.last_name, q.title, e.correctness, r.cart_eval, r.score
-- FROM public.evaluation e
-- JOIN public.profiles p ON e.profile_id = p.id
-- JOIN public.question q ON e.question_id = q.question_id
-- JOIN public.result r ON e.id = r.evaluation_id
-- ORDER BY e.created_at DESC LIMIT 20;
