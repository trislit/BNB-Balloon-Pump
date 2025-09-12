-- Create a new deposit function with a different name to test
CREATE OR REPLACE FUNCTION deposit_tokens_v2(
  user_address TEXT,
  token_address TEXT,
  amount DECIMAL
) RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  INSERT INTO user_balances (user_address, token_address, balance, total_deposited)
  VALUES (deposit_tokens_v2.user_address, deposit_tokens_v2.token_address, deposit_tokens_v2.amount, deposit_tokens_v2.amount)
  ON CONFLICT (user_address, token_address)
  DO UPDATE SET 
    balance = user_balances.balance + EXCLUDED.amount,
    total_deposited = user_balances.total_deposited + EXCLUDED.amount,
    last_updated = NOW();

  result := json_build_object(
    'success', true,
    'message', 'Deposit successful',
    'amount', deposit_tokens_v2.amount
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;
