-- Removed hardcoded credentials, users must be created by admin or via signup

-- Insert demo contacts
INSERT INTO contacts (phone_number, name) VALUES
  ('+52 55 1234 5678', 'Juan Perez'),
  ('+52 55 9876 5432', 'Ana Martinez'),
  ('+52 55 5555 1234', 'Luis Fernandez'),
  ('+52 55 7777 8888', 'Sofia Lopez'),
  ('+52 55 3333 4444', 'Pedro Sanchez')
ON CONFLICT (phone_number) DO NOTHING;

-- Note: Conversations and messages will be created once users exist
-- The following sections are commented out until you have real users in the system

-- Insert demo conversations (requires users)
-- INSERT INTO conversations (contact_id, assigned_agent_id, status, priority, last_message_at) 
-- SELECT 
--   c.id, 
--   u.id,
--   CASE WHEN random() < 0.3 THEN 'closed' ELSE 'open' END,
--   CASE WHEN random() < 0.2 THEN 'high' WHEN random() < 0.5 THEN 'normal' ELSE 'low' END,
--   NOW() - (random() * INTERVAL '7 days')
-- FROM contacts c
-- CROSS JOIN LATERAL (
--   SELECT id FROM users WHERE role = 'agent' ORDER BY random() LIMIT 1
-- ) u
-- LIMIT 5
-- ON CONFLICT DO NOTHING;

-- Insert demo messages (requires conversations)
-- INSERT INTO messages (conversation_id, sender_type, sender_id, content, created_at)
-- SELECT 
--   conv.id,
--   CASE WHEN random() < 0.5 THEN 'contact' ELSE 'agent' END,
--   CASE WHEN random() < 0.5 THEN conv.contact_id ELSE conv.assigned_agent_id END,
--   CASE 
--     WHEN random() < 0.2 THEN 'Hola, necesito ayuda con mi orden'
--     WHEN random() < 0.4 THEN 'Cuanto tarda el envio?'
--     WHEN random() < 0.6 THEN 'Ya realice el pago'
--     WHEN random() < 0.8 THEN 'Gracias por tu ayuda!'
--     ELSE 'Perfecto, entiendo'
--   END,
--   conv.last_message_at - (random() * INTERVAL '1 hour')
-- FROM conversations conv
-- LIMIT 20
-- ON CONFLICT DO NOTHING;

-- Insert demo orders
INSERT INTO orders (order_number, contact_id, status, total_amount, items, shipping_address) 
SELECT 
  'ORD-' || LPAD((row_number() OVER())::TEXT, 6, '0'),
  c.id,
  CASE 
    WHEN random() < 0.2 THEN 'pending'
    WHEN random() < 0.5 THEN 'processing'
    WHEN random() < 0.8 THEN 'shipped'
    ELSE 'delivered'
  END,
  (random() * 1000 + 50)::DECIMAL(10,2),
  jsonb_build_array(
    jsonb_build_object('name', 'Producto A', 'quantity', floor(random() * 3 + 1)::int, 'price', 199.99),
    jsonb_build_object('name', 'Producto B', 'quantity', floor(random() * 2 + 1)::int, 'price', 299.99)
  ),
  'Calle Principal #123, Col. Centro, CDMX'
FROM contacts c
LIMIT 10
ON CONFLICT (order_number) DO NOTHING;

-- Note: Macros will be created by users as they need them
-- You can uncomment this section once you have at least one user created

-- Insert demo macros (requires at least one user)
-- INSERT INTO macros (title, content, shortcut, created_by) 
-- SELECT 
--   title, content, shortcut, (SELECT id FROM users WHERE role = 'agent' LIMIT 1)
-- FROM (VALUES
--   ('Saludo Inicial', 'Hola! Gracias por contactarnos. ¿En qué puedo ayudarte hoy?', '/hola'),
--   ('Consultar Orden', 'Claro, déjame verificar el estado de tu orden. ¿Podrías proporcionarme tu número de orden?', '/orden'),
--   ('Tiempo de Envío', 'El tiempo de envío estimado es de 3-5 días hábiles para entregas nacionales.', '/envio'),
--   ('Despedida', '¡Gracias por tu mensaje! Si necesitas algo más, no dudes en contactarnos.', '/adios'),
--   ('Horario Atención', 'Nuestro horario de atención es de Lunes a Viernes de 9:00 AM a 6:00 PM.', '/horario')
-- ) AS t(title, content, shortcut)
-- ON CONFLICT DO NOTHING;
