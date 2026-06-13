-- Function to create notifications
CREATE OR REPLACE FUNCTION public.create_hr_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'performance_reviews') THEN
        INSERT INTO notifications (user_id, title, content, type, priority, link)
        VALUES (NEW.employee_id, '⭐ New Performance Review', 'Your performance review for ' || NEW.review_period || ' is ready.', 'system', 'medium', '/hr/performance');
    ELSIF (TG_TABLE_NAME = 'goals' AND NEW.status = 'completed') THEN
        INSERT INTO notifications (user_id, title, content, type, priority, link)
        VALUES (NEW.employee_id, '🎯 Goal Completed!', 'Congratulations on achieving your goal: ' || NEW.title, 'system', 'low', '/hr/goals');
    ELSIF (TG_TABLE_NAME = 'certificates') THEN
        INSERT INTO notifications (user_id, title, content, type, priority, link)
        VALUES (NEW.user_id, '🎓 Certificate Issued', 'A new certificate has been issued for: ' || NEW.title, 'system', 'medium', '/profile');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for Notifications
DROP TRIGGER IF EXISTS on_performance_review_insert ON performance_reviews;
CREATE TRIGGER on_performance_review_insert
    AFTER INSERT ON performance_reviews
    FOR EACH ROW EXECUTE FUNCTION create_hr_notification();

DROP TRIGGER IF EXISTS on_goal_completed ON goals;
CREATE TRIGGER on_goal_completed
    AFTER UPDATE OF status ON goals
    FOR EACH ROW
    WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
    EXECUTE FUNCTION create_hr_notification();

DROP TRIGGER IF EXISTS on_certificate_issued ON certificates;
CREATE TRIGGER on_certificate_issued
    AFTER INSERT ON certificates
    FOR EACH ROW EXECUTE FUNCTION create_hr_notification();;
