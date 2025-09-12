-- Fix the original deposit_tokens function with correct parameter names
CREATE OR REPLACE FUNCTION deposit_tokens(
  p_user_address TEXT,
  p_token_address TEXT,
  p_amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO user_balances (user_address, token_address, balance, total_deposited)
  VALUES (p_user_address, p_token_address, p_amount, p_amount)
  ON CONFLICT (user_address, token_address)
  DO UPDATE SET 
    balance = user_balances.balance + p_amount,
    total_deposited = user_balances.total_deposited + p_amount,
    last_updated = NOW();

  result := json_build_object(
    'success', true,
    'message', 'Deposit successful',
    'amount', p_amount
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;
