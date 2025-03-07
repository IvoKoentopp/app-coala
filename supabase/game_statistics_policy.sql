-- Policy for game statistics management
ALTER POLICY "Allow game statistics management"
ON "public"."game_statistics"
FOR ALL
TO authenticated
USING (
  (EXISTS ( SELECT 1
   FROM games g
   WHERE ((g.id = game_statistics.game_id) AND
          EXISTS ( SELECT 1
                  FROM members m
                  WHERE ((m.club_id = g.club_id) AND
                         (m.user_id = auth.uid()) AND
                         (m.status = 'Ativo'::text))))))
);
