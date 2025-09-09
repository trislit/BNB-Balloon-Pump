# Supabase Database Setup Instructions

## 🎯 **Issue Identified**
The database is missing some required tables and functions for the balloon pump game to work properly.

## 📋 **Missing Components**
- ❌ `token_transactions` table
- ❌ `leaderboard` table  
- ❌ `simulate_pump_hybrid` function

## 🔧 **Solution**

### Step 1: Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project: `uvmfrbiojefvtbfgbcfk`
3. Go to **SQL Editor**

### Step 2: Run This SQL Script
Copy and paste the following SQL into the SQL Editor and run it:

```sql
-- Missing tables and functions for the balloon pump game

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'pump', 'reward')),
  amount TEXT NOT NULL,
  round_id INTEGER,
  tx_hash TEXT, -- Blockchain transaction hash (null for test mode)
  block_number INTEGER, -- Blockchain block number (null for test mode)
  is_test_mode BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leaderboard table
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id TEXT PRIMARY KEY,
  net_winnings TEXT DEFAULT '0',
  total_deposited TEXT DEFAULT '0',
  total_pumps INTEGER DEFAULT 0,
  pops_triggered INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_token_transactions_user ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_token_transactions_type ON token_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_leaderboard_winnings ON leaderboard(net_winnings DESC);

-- RLS policies
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on token_transactions" ON public.token_transactions FOR ALL USING (true);
CREATE POLICY "Allow all operations on leaderboard" ON public.leaderboard FOR ALL USING (true);

-- Update timestamp trigger for leaderboard
CREATE TRIGGER update_leaderboard_updated_at BEFORE UPDATE ON leaderboard
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to simulate pump (hybrid mode)
CREATE OR REPLACE FUNCTION simulate_pump_hybrid(
  user_address TEXT,
  pump_amount TEXT,
  is_test BOOLEAN DEFAULT true
) RETURNS TABLE(
  success BOOLEAN,
  new_pressure TEXT,
  new_pot TEXT,
  balloon_popped BOOLEAN,
  winner_reward TEXT
) AS $$
DECLARE
  current_pressure DECIMAL;
  current_pot DECIMAL;
  pump_value DECIMAL;
  new_pressure_val DECIMAL;
  new_pot_val DECIMAL;
  pressure_increase DECIMAL;
  pot_contribution DECIMAL;
  popped BOOLEAN := FALSE;
  winner_reward_val DECIMAL := 0;
BEGIN
  -- Get current round state
  SELECT CAST(COALESCE(pressure, '0') AS DECIMAL), CAST(COALESCE(pot, '0') AS DECIMAL)
  INTO current_pressure, current_pot
  FROM rounds_cache WHERE round_id = 1;

  -- Calculate pump effects
  pump_value := CAST(pump_amount AS DECIMAL);
  pressure_increase := pump_value / 10; -- 1/10th of pump amount adds to pressure
  pot_contribution := pump_value * 0.1; -- 10% goes to pot
  
  new_pressure_val := current_pressure + pressure_increase;
  new_pot_val := current_pot + pot_contribution;

  -- Check if balloon pops (>100 pressure)
  IF new_pressure_val > 100 THEN
    popped := TRUE;
    winner_reward_val := new_pot_val * 0.85; -- 85% to winner
    
    -- Award winner (only in test mode)
    IF is_test THEN
      UPDATE profiles 
      SET test_tokens = CAST(CAST(COALESCE(test_tokens, '0') AS DECIMAL) + winner_reward_val AS TEXT)
      WHERE evm_address = user_address;
    END IF;
    
    -- Reset round
    UPDATE rounds_cache SET
      pressure = '0',
      pot = '0',
      last1 = NULL,
      last2 = NULL,
      last3 = NULL,
      winner = user_address,
      final_reward = CAST(winner_reward_val AS TEXT),
      status = 'active' -- Immediately start new round
    WHERE round_id = 1;
    
    new_pressure_val := 0;
    new_pot_val := 0;
  ELSE
    -- Update round state
    UPDATE rounds_cache SET
      pressure = CAST(new_pressure_val AS TEXT),
      pot = CAST(new_pot_val AS TEXT),
      last3 = last2,
      last2 = last1,
      last1 = user_address
    WHERE round_id = 1;
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    TRUE as success,
    CAST(new_pressure_val AS TEXT) as new_pressure,
    CAST(new_pot_val AS TEXT) as new_pot,
    popped as balloon_popped,
    CAST(winner_reward_val AS TEXT) as winner_reward;
END;
$$ LANGUAGE plpgsql;

-- Verify setup
SELECT 'Missing schema setup complete!' as message;
```

### Step 3: Verify Setup
After running the SQL, you should see:
- ✅ `token_transactions` table created
- ✅ `leaderboard` table created  
- ✅ `simulate_pump_hybrid` function created
- ✅ Success message: "Missing schema setup complete!"

## 🎮 **Expected Result**
Once this is set up, the game should:
1. ✅ Show user balance (starting with 1000 test tokens)
2. ✅ Allow pumping with test tokens
3. ✅ Update game state (pressure, pot)
4. ✅ Track transactions in the database
5. ✅ Show leaderboard data

## 🔄 **Next Steps**
After running the SQL script:
1. The Railway relayer will be able to create users with test tokens
2. Users can pump and see their balance decrease
3. Game state will update in real-time
4. All transactions will be tracked in the database
