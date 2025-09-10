-- Function to get current game state with enhanced information
CREATE OR REPLACE FUNCTION get_current_game_state()
RETURNS TABLE(
  round_id INTEGER,
  status TEXT,
  pressure TEXT,
  pot TEXT,
  last1 TEXT,
  last2 TEXT,
  last3 TEXT,
  participant_count INTEGER,
  risk_level TEXT,
  pressure_percentage DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rc.round_id,
    rc.status,
    rc.pressure,
    rc.pot,
    rc.last1,
    rc.last2,
    rc.last3,
    (SELECT COUNT(DISTINCT user_id) FROM pumps WHERE round_id = rc.round_id) as participant_count,
    CASE 
      WHEN CAST(rc.pressure AS DECIMAL) > 90 THEN 'EXTREME'
      WHEN CAST(rc.pressure AS DECIMAL) > 70 THEN 'HIGH'
      WHEN CAST(rc.pressure AS DECIMAL) > 50 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level,
    LEAST(CAST(rc.pressure AS DECIMAL), 100) as pressure_percentage
  FROM rounds_cache rc
  WHERE rc.round_id = (SELECT MAX(round_id) FROM rounds_cache WHERE status = 'active')
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;
