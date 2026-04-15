CREATE OR REPLACE FUNCTION public.accept_follow_request(request_notification_id uuid, request_requester_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.follow_requests
    WHERE requester_id = request_requester_id
      AND target_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Follow request not found';
  END IF;

  INSERT INTO public.follows (follower_id, following_id)
  SELECT request_requester_id, current_user_id
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.follows
    WHERE follower_id = request_requester_id
      AND following_id = current_user_id
  );

  DELETE FROM public.follow_requests
  WHERE requester_id = request_requester_id
    AND target_id = current_user_id;

  PERFORM public.notify_follow_accepted(current_user_id, request_requester_id);

  UPDATE public.notifications
  SET read = true
  WHERE id = request_notification_id
    AND user_id = current_user_id;
END;
$$;