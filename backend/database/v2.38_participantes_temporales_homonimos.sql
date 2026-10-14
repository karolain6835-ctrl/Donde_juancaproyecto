-- El nombre no identifica a una persona temporal. Conservar IDs, datos y FKs.
ALTER TABLE jugadores DROP INDEX IF EXISTS uq_participante_alias;
