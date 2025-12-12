-- Create messaging system tables
-- This migration creates the tables needed for the internal messaging system

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- null for broadcast messages
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('direct', 'broadcast', 'system')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'archived')),
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE, -- for replies
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Message attachments table
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  uploaded_by_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_priority ON messages(priority);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON messages(property_id);
CREATE INDEX IF NOT EXISTS idx_messages_department_id ON messages(department_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_by_id ON message_attachments(uploaded_by_id);

-- Enable RLS (Row Level Security)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
-- Users can see messages they sent or received
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = recipient_id OR 
    recipient_id IS NULL -- broadcast messages
  );

-- Users can insert messages they send
CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they sent (only draft status)
CREATE POLICY "Users can update their own draft messages" ON messages
  FOR UPDATE USING (
    auth.uid() = sender_id AND status = 'draft'
  );

-- Users can mark messages as read (recipient only)
CREATE POLICY "Users can mark messages as read" ON messages
  FOR UPDATE USING (
    auth.uid() = recipient_id AND 
    status IN ('sent', 'delivered')
  );

-- Users can archive their own messages
CREATE POLICY "Users can archive their own messages" ON messages
  FOR UPDATE USING (
    auth.uid() IN (sender_id, recipient_id) AND
    status != 'archived'
  );

-- RLS Policies for message attachments
-- Users can view attachments of messages they can see
CREATE POLICY "Users can view attachments of accessible messages" ON message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE messages.id = message_attachments.message_id
      AND (
        auth.uid() = messages.sender_id OR 
        auth.uid() = messages.recipient_id OR 
        messages.recipient_id IS NULL
      )
    )
  );

-- Users can insert attachments to messages they sent
CREATE POLICY "Users can insert attachments to their messages" ON message_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by_id AND
    EXISTS (
      SELECT 1 FROM messages 
      WHERE messages.id = message_attachments.message_id
      AND auth.uid() = messages.sender_id
    )
  );

-- Users can update attachments they uploaded
CREATE POLICY "Users can update their own attachments" ON message_attachments
  FOR UPDATE USING (auth.uid() = uploaded_by_id);

-- Users can delete attachments they uploaded
CREATE POLICY "Users can delete their own attachments" ON message_attachments
  FOR DELETE USING (auth.uid() = uploaded_by_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for messages table
CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set sent_at when status changes to sent
CREATE OR REPLACE FUNCTION set_sent_at_on_send()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'sent' AND NEW.status = 'sent' THEN
    NEW.sent_at = now();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic sent_at
CREATE TRIGGER set_sent_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_sent_at_on_send();

-- Create function to automatically set read_at when status changes to read
CREATE OR REPLACE FUNCTION set_read_at_on_read()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'read' AND NEW.status = 'read' THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic read_at
CREATE TRIGGER set_read_at_trigger
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION set_read_at_on_read();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON message_attachments TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create view for message counts per user
CREATE OR REPLACE VIEW user_message_stats AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.email,
  COUNT(CASE WHEN m.sender_id = p.id AND m.status != 'archived' THEN 1 END) as sent_messages,
  COUNT(CASE WHEN m.recipient_id = p.id AND m.status != 'archived' THEN 1 END) as received_messages,
  COUNT(CASE WHEN m.recipient_id = p.id AND m.status = 'sent' THEN 1 END) as unread_messages,
  COUNT(CASE WHEN m.priority = 'urgent' AND m.recipient_id = p.id AND m.status != 'archived' THEN 1 END) as urgent_messages
FROM profiles p
LEFT JOIN messages m ON (p.id = m.sender_id OR p.id = m.recipient_id)
WHERE p.is_active = true
GROUP BY p.id, p.full_name, p.email;

-- Grant access to the view
GRANT SELECT ON user_message_stats TO authenticated;
