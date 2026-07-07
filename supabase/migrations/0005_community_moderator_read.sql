-- Era 5.5 fix (found in live-verify): moderators must be able to SELECT community_templates rows to
-- act on them. 0004 gives moderators an UPDATE policy (community_moderate) but NO SELECT policy, and
-- Postgres applies SELECT policies to the rows an `UPDATE ... WHERE` must locate — so a moderator's
-- takedown silently matched 0 rows. Moderators also need read access to run a review/takedown queue.
--
-- Regular users are unaffected: is_moderator() is false for them, so they still see only their OWN
-- rows via a direct select (community_owner_all) and reach everyone else's APPROVED rows only through
-- the SECURITY DEFINER browse RPCs (community_list / community_get), which never expose author_id.
create policy "community_moderator_read" on public.community_templates for select to authenticated
  using (public.is_moderator());
