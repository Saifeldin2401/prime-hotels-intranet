CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_participant_id ON conversation_participants(participant_id);
;
