-- Policy for admins to manage participants
CREATE POLICY "Allow admin game participant management"
ON "public"."game_participants"
FOR ALL
TO authenticated
USING (
  (EXISTS ( SELECT 1
   FROM games g
   WHERE ((g.id = game_participants.game_id) AND
          EXISTS ( SELECT 1
                  FROM members m
                  WHERE ((m.club_id = g.club_id) AND
                         (m.user_id = auth.uid()) AND
                         (m.is_admin = true))))))
);
