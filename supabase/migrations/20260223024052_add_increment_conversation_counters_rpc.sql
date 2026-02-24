-- RPC atomica para incrementar contadores de conversa (evita race condition)
CREATE OR REPLACE FUNCTION public.increment_conversation_counters(
  p_conversation_id UUID,
  p_input_tokens INT,
  p_output_tokens INT,
  p_message_count INT,
  p_model_used TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE ai_conversations
  SET
    total_input_tokens = total_input_tokens + p_input_tokens,
    total_output_tokens = total_output_tokens + p_output_tokens,
    message_count = message_count + p_message_count,
    last_message_at = NOW(),
    model_used = p_model_used,
    updated_at = NOW()
  WHERE id = p_conversation_id;
END;
$$;