-- Update leaderboard function to implement proper period filtering
CREATE OR REPLACE FUNCTION get_leaderboard_data(level_filter text DEFAULT 'all', period_filter text DEFAULT 'all')
RETURNS TABLE (
    id uuid,
    rank bigint,
    first_name text,
    last_name text,
    username text,
    total_points double precision,
    current_level difficulty_level,
    accuracy_percent smallint,
    total_tests bigint
) AS $$
DECLARE
    start_date timestamp;
BEGIN
    -- Set period filter
    IF period_filter = 'today' THEN
        start_date := CURRENT_DATE;
    ELSIF period_filter = 'week' THEN
        start_date := CURRENT_DATE - INTERVAL '7 days';
    ELSIF period_filter = 'month' THEN
        start_date := CURRENT_DATE - INTERVAL '30 days';
    ELSE
        start_date := NULL; -- 'all' - no date filtering
    END IF;

    RETURN QUERY
    WITH level_data AS (
        SELECT
            l.profile_id,
            l.progress,
            l.level_status,
            ROW_NUMBER() OVER (ORDER BY l.progress DESC) as rank_num
        FROM level l
        INNER JOIN profiles p ON l.profile_id = p.id
        WHERE p.role = 'candidate'
        AND (level_filter = 'all' OR l.level_status::text = level_filter)
    ),
    user_stats AS (
        SELECT
            e.profile_id,
            COUNT(*) as test_count,
            COALESCE(AVG(NULLIF(e.correctness, 0)) * 10, 0) as avg_accuracy
        FROM evaluation e
        WHERE (start_date IS NULL OR e.created_at >= start_date)
        GROUP BY e.profile_id
    )
    SELECT
        ld.profile_id::uuid,
        ld.rank_num::bigint,
        p.first_name,
        p.last_name,
        LOWER(COALESCE(p.first_name, '') || COALESCE(p.last_name, ''))::text as username,
        ld.progress,
        ld.level_status,
        ROUND(us.avg_accuracy)::smallint as accuracy_percent,
        us.test_count::bigint as total_tests
    FROM level_data ld
    INNER JOIN profiles p ON ld.profile_id = p.id
    LEFT JOIN user_stats us ON ld.profile_id = us.profile_id
    ORDER BY ld.rank_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
