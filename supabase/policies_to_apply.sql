-- Drop existing policies
DROP POLICY IF EXISTS "Permitir confirmações anônimas" ON game_participants CASCADE;
DROP POLICY IF EXISTS "Allow game participant management" ON game_participants CASCADE;
DROP POLICY IF EXISTS "Allow admin game participant management" ON game_participants CASCADE;

-- Policy for anonymous confirmations
alter policy "Permitir confirmações anônimas"
on "public"."game_participants"
to anon
using (
  (EXISTS ( SELECT 1
   FROM games
  WHERE ((games.id = game_participants.game_id) AND (games.status = 'Agendado'::text))))
)
with check (
  (EXISTS ( SELECT 1
   FROM games
  WHERE ((games.id = game_participants.game_id) AND (games.status = 'Agendado'::text))))
);

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

-- Policy for regular members
alter policy "Allow game participant management"
on "public"."game_participants"
to authenticated
using (
  (EXISTS ( SELECT 1
   FROM games g
   WHERE ((g.id = game_participants.game_id) AND
          EXISTS ( SELECT 1
                  FROM members m
                  WHERE ((m.club_id = g.club_id) AND
                         (m.user_id = auth.uid()) AND
                         (m.status = 'Ativo'::text))))))
);
