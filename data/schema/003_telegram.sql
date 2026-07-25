-- OpoAlerta — soporte de alertas por Telegram.
-- Una suscripción puede ser por email o por Telegram (canal). Para Telegram, el
-- alta crea una fila pendiente (con token) y el webhook la vincula al chat_id
-- cuando la persona pulsa Start en el bot.

ALTER TABLE suscripciones ALTER COLUMN email DROP NOT NULL;
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
ALTER TABLE suscripciones ADD COLUMN IF NOT EXISTS canal TEXT NOT NULL DEFAULT 'email';

CREATE INDEX IF NOT EXISTS idx_suscripciones_telegram
    ON suscripciones (telegram_chat_id) WHERE telegram_chat_id IS NOT NULL;
