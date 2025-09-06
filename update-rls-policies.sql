-- =================================================
-- UPDATE RLS POLICIES ONLY (for existing tables)
-- Run this if tables already exist
-- =================================================

-- Drop existing policies (if they exist)
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can insert game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can update game sessions" ON game_sessions;
DROP POLICY IF EXISTS "Users can view game players" ON game_players;
DROP POLICY IF EXISTS "Users can insert game players" ON game_players;
DROP POLICY IF EXISTS "Users can update own game players" ON game_players;
DROP POLICY IF EXISTS "Users can view user actions" ON user_actions;
DROP POLICY IF EXISTS "Users can insert user actions" ON user_actions;
DROP POLICY IF EXISTS "Public can view blockchain cache" ON blockchain_cache;
DROP POLICY IF EXISTS "Public can insert blockchain cache" ON blockchain_cache;
DROP POLICY IF EXISTS "Public can update blockchain cache" ON blockchain_cache;

-- Also drop the new permissive policies if they exist
DROP POLICY IF EXISTS "Allow all operations on user_sessions" ON user_sessions;
DROP POLICY IF EXISTS "Allow all operations on game_sessions" ON game_sessions;
DROP POLICY IF EXISTS "Allow all operations on game_players" ON game_players;
DROP POLICY IF EXISTS "Allow all operations on user_actions" ON user_actions;
DROP POLICY IF EXISTS "Allow all operations on blockchain_cache" ON blockchain_cache;

-- Create new permissive policies for development
CREATE POLICY "Allow all operations on user_sessions" ON user_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on game_sessions" ON game_sessions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on game_players" ON game_players
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_actions" ON user_actions
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on blockchain_cache" ON blockchain_cache
  FOR ALL USING (true);

-- Success message
SELECT '✅ RLS Policies updated successfully!' as message;
