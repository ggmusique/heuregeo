-- =============================================================================
-- Migration : Security fix — Restreindre patron_email_has_account à authenticated
-- Date      : 2026-05-22
-- Auteur    : Audit sécurité pré-production
-- =============================================================================
--
-- PROBLÈME V4 :
--   La RPC patron_email_has_account était accessible aux utilisateurs anon.
--   N'importe quelle requête HTTP sans authentification pouvait tester si
--   une adresse email est enregistrée dans le système.
--   Violation RGPD Article 5 (minimisation) + vecteur d'énumération.
--
-- CORRECTIF :
--   REVOKE EXECUTE ... FROM anon
--   GRANT EXECUTE ... TO authenticated uniquement.
--
-- IMPACT :
--   La page d'invitation email qui appelait cette RPC avant que l'utilisateur
--   soit connecté devra être revue si elle nécessite cette info côté anon.
--   Dans le flux actuel (invitation par email → lien → AcceptInvitePage), la
--   vérification d'email est faite par l'owner (authentifié) → pas de régression.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.patron_email_has_account(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.patron_email_has_account(text) TO authenticated;
