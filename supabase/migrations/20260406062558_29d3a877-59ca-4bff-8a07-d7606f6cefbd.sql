
CREATE OR REPLACE FUNCTION public.notify_follow_request(requester_id uuid, target_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  SELECT COALESCE(username, display_name, 'Someone') INTO requester_name
  FROM public.profiles WHERE id = requester_id;

  INSERT INTO public.notifications (user_id, type, message, from_user_id, read)
  VALUES (target_id, 'follow_request', requester_name || ' has requested to follow you', requester_id, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_follow_accepted(accepter_id uuid, requester_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  SELECT COALESCE(username, display_name, 'Someone') INTO accepter_name
  FROM public.profiles WHERE id = accepter_id;

  INSERT INTO public.notifications (user_id, type, message, from_user_id, read)
  VALUES (requester_id, 'follow_accepted', accepter_name || ' accepted your follow request', accepter_id, false);
END;
$$;
