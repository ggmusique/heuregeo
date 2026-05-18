# Audit de Sécurité — HèureGeo
**Date :** 22 mai 2026  
**Scope :** Mise en production multi-utilisateur (multi-tenant SaaS)  
**Stack :** React 18 + TypeScript + Vite / Supabase (Auth JWT, Postgres RLS, Edge Functions Deno) / Vercel

---

## 1. Score Global et SaaS Readiness

| Axe | Score | Justification |
|-----|-------|---------------|
| **Authentification** | 7/10 | JWT Supabase correct, mais une Edge Function sans auth |
| **Autorisation (RLS)** | 7/10 | Policies complètes sur la majorité des tables, 2 RPCs SECURITY DEFINER sans check ownership |
| **Isolation multi-tenant** | 8/10 | Colonnes `user_id` bien positionnées, isolation globalement respectée |
| **Sécurité API** | 6/10 | Plusieurs APIs sans ownership explicite côté client (défense en profondeur absente) |
| **Edge Functions** | 5/10 | 1 fonction critique non authentifiée |
| **Exposition des données** | 7/10 | Pas de `service_role` côté client, `anon` key correctement limitée |
| **Secrets / Config** | 8/10 | `.env.example` correct, pas de fuite de service_role |
| **Headers / Hardening** | 4/10 | Pas de CSP, CORS `"*"` partout, pas de rate limiting |
| **Gouvernance des migrations** | 6/10 | `unapply_acompte` non définie dans les migrations |
| **Score global** | **6.4/10** | |

**SaaS Readiness : 🟡 Non prêt pour la production publique**  
2 vulnérabilités bloquantes à corriger avant tout déploiement multi-utilisateur.

---

## 2. Tableau Récapitulatif des Vulnérabilités

| # | Composant | Vulnérabilité | Gravité | OWASP | Bloquant prod ? |
|---|-----------|--------------|---------|-------|-----------------|
| V1 | `send-planning-email` Edge Function | `verify_jwt = false` → open relay email, aucune auth | **CRITIQUE** | A01 (Access Control), A07 (Auth) | ✅ OUI |
| V2 | `apply_acompte` RPC | SECURITY DEFINER sans check `user_id = auth.uid()` → manipulation des acomptes d'autrui | **CRITIQUE** | A01 (Access Control) | ✅ OUI |
| V3 | `send-patron-invite` Edge Function | Pas de binding token→caller : n'importe quel user peut envoyer un email depuis le serveur SMTP vers n'importe quelle adresse | **ÉLEVÉ** | A01 (Access Control) | ✅ OUI |
| V4 | `patron_email_has_account` RPC | Accessible à `anon` → énumération d'emails | **ÉLEVÉ** | A02 (Sensitive Data Exposure) | ⚠️ Recommandé |
| V5 | `verify_patron_invite_token` RPC | Accessible à `anon` → expose owner_id, patron_id, patron_email | **ÉLEVÉ** | A02 | ⚠️ Acceptable si tokens longs |
| V6 | `adminApi.fetchUsers` | Aucun check `is_admin` backend, données limitées seulement par RLS | **MOYEN** | A01 | ⚠️ Selon RLS admin |
| V7 | `bilanRepository.ts` | Filtres sur `patron_id` seul, pas sur `user_id` → dépendance exclusive au RLS bilans | **MOYEN** | A01 | ⚠️ Si RLS OK |
| V8 | `updatePatron` / `deletePatron` / `updateMission` / `deleteMission` / `deleteLieu` / `deleteFrais` | Pas d'ownership check côté client (`.eq("user_id", user.id)` absent) — défense en profondeur absente | **MOYEN** | A04 (Insecure Design) | ❌ Non si RLS correct |
| V9 | CORS `"*"` sur toutes les Edge Functions | Accept any origin | **FAIBLE** | A05 (Misconfiguration) | ❌ Non |
| V10 | `unapply_acompte` RPC | Non définie dans les migrations (même vecteur probable que V2) | **MOYEN** | A01 | ✅ À vérifier |
| V11 | `frais_divers` viewer | Pas de policy viewer pour lire les frais divers | **FAIBLE** | A01 | ❌ Feature gap |
| V12 | Absence de CSP / Security Headers | Pas de `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` | **MOYEN** | A05 | ⚠️ Recommandé |
| V13 | Pas de rate limiting global | Ni Edge Functions, ni RPC, ni API Supabase | **MOYEN** | A04 | ⚠️ Recommandé |
| V14 | Pas d'audit trail | Aucun log des suppressions, allocations d'acomptes, actions admin | **FAIBLE** | A09 (Logging) | ❌ Non |

---

## 3. Analyse Détaillée par Section

### 3.1 [CRITIQUE] V1 — `send-planning-email` : Open Email Relay

**Localisation :**
- `supabase/functions/send-planning-email/index.ts`
- `supabase/config.toml` : `[functions.send-planning-email] verify_jwt = false`

**Description :**  
La configuration `verify_jwt = false` désactive totalement la vérification JWT Supabase en amont. La fonction ne réalise aucun check d'authentification en interne. N'importe qui sur internet peut faire :

```bash
curl -X POST https://[project].supabase.co/functions/v1/send-planning-email \
  -H "Content-Type: application/json" \
  -d '{"patron_email":"victime@example.com","employe_nom":"Moi","semaine":"2026-01","planning_url":"https://phishing.site"}'
```

**Impact :**
- Spam massif en usurpant l'identité de l'application
- Phishing : envoi de liens malveillants depuis un serveur légitime (Brevo/Gmail)
- Blacklisting du domaine email de l'application
- Coûts SMTP non maîtrisés

**Correctif :**

```toml
# supabase/config.toml — SUPPRIMER la ligne suivante
[functions.send-planning-email]
verify_jwt = false   # ← À SUPPRIMER
```

```typescript
// Dans send-planning-email/index.ts, ajouter en tête du handler :
const authHeader = req.headers.get("Authorization");
if (!authHeader) {
  return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
}

const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
  authHeader.replace("Bearer ", "")
);
if (authError || !user) {
  return new Response(JSON.stringify({ error: "JWT invalide" }), { status: 401 });
}

// Valider que patron_email est un email valide (regex basique)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(patron_email)) {
  return new Response(JSON.stringify({ error: "Email invalide" }), { status: 400 });
}

// Valider que planning_url commence par le domaine de l'app
const ALLOWED_ORIGINS = ["https://heuregeo.vercel.app", "https://heuregeo.com"];
if (!ALLOWED_ORIGINS.some(o => planning_url.startsWith(o))) {
  return new Response(JSON.stringify({ error: "URL non autorisée" }), { status: 400 });
}
```

---

### 3.2 [CRITIQUE] V2 — `apply_acompte` RPC : SECURITY DEFINER sans ownership

**Localisation :**  
`supabase/migrations/20260305020000_apply_acompte_strict_idempotent_and_lock.sql` (version finale en DB)

**Description :**  
La RPC `apply_acompte(p_acompte_id uuid)` est `SECURITY DEFINER` (bypass RLS) et accordée à `authenticated`. Elle sélectionne l'acompte par son UUID **sans vérifier que `user_id = auth.uid()`**. Un utilisateur malveillant qui connaît ou déduit l'UUID d'un acompte appartenant à un autre utilisateur peut déclencher sa ventilation sur des bilans.

```sql
-- Code actuel — VULNÉRABLE
SELECT montant, patron_id, user_id
INTO v_montant, v_patron_id, v_user_id
FROM public.acomptes
WHERE id = p_acompte_id   -- ← PAS DE VÉRIFICATION CALLER
FOR UPDATE;
```

**Impact :**  
Corruption de données financières d'autres utilisateurs : leurs bilans peuvent être marqués "payé" sans que leur propriétaire l'ait déclenché.

**Correctif SQL :**

```sql
CREATE OR REPLACE FUNCTION public.apply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_montant    numeric;
  v_patron_id  uuid;
  v_user_id    uuid;
  -- ... (autres variables inchangées)
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'apply_acompte: utilisateur non authentifié';
  END IF;

  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id
    AND user_id = v_caller_id   -- ← FIX : ownership check
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_acompte: acompte % non trouvé ou non autorisé', p_acompte_id;
  END IF;
  -- reste de la fonction inchangé
END;
$$;
```

---

### 3.3 [CRITIQUE] V10 — `unapply_acompte` : RPC non définie dans les migrations

**Localisation :** `src/services/api/acomptesApi.ts` ligne 41  

```typescript
const { error } = await supabase.rpc("unapply_acompte", { p_acompte_id: acompteId });
```

La fonction est appelée dans le code mais **aucune migration ne la définit**. Elle existe donc directement en base (non versionnée) et possiblement sans le check `user_id = auth.uid()`. **Même correctif que V2 à appliquer.**

Action immédiate : Exporter la définition depuis Supabase Dashboard et l'ajouter dans une migration.

---

### 3.4 [ÉLEVÉ] V3 — `send-patron-invite` : No token-to-caller binding

**Localisation :** `supabase/functions/send-patron-invite/index.ts`

**Description :**  
La fonction vérifie que l'appelant est authentifié (✅), mais ne vérifie pas que l'invitation (`invite_token`) appartient bien à cet utilisateur. Un utilisateur A peut envoyer un email "officiel" Brevo/Hèuregeo à n'importe quelle adresse avec n'importe quel contenu dans `owner_nom` et `invite_url`.

**Correctif :**

```typescript
// Après extraction du token et du user, vérifier l'ownership en DB
const { data: invitation, error: invErr } = await supabaseClient
  .from("patron_invitations")
  .select("owner_id, patron_email")
  .eq("invite_token", token)
  .eq("owner_id", user.id)   // ← owner doit être le caller
  .eq("status", "pending")
  .single();

if (invErr || !invitation) {
  return new Response(JSON.stringify({ error: "Invitation non trouvée ou non autorisée" }), { status: 403 });
}

// Utiliser invitation.patron_email au lieu du patron_email du body
// pour éviter toute injection
const safeEmail = invitation.patron_email;
```

---

### 3.5 [ÉLEVÉ] V4 — Énumération d'emails via `patron_email_has_account`

**Localisation :** `supabase/migrations/20260513_check_email_exists.sql`

```sql
GRANT EXECUTE ON FUNCTION public.patron_email_has_account(text) TO anon, authenticated;
```

N'importe quelle requête non authentifiée peut tester l'existence d'un email. Violation RGPD (article 5 — minimisation des données).

**Correctif :**

```sql
-- Option 1 : restreindre à authenticated uniquement
REVOKE EXECUTE ON FUNCTION public.patron_email_has_account(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.patron_email_has_account(text) TO authenticated;
```

Si la fonction est nécessaire côté page d'invitation (accès anon), ajouter un délai artificiel et logger les appels pour détecter le brute-force :

```sql
-- Option 2 : réponse normalisée avec délai (évite timing attack)
-- En pratique, masquer le résultat derrière un token d'invitation vérifié
```

---

### 3.6 [ÉLEVÉ] V5 — `verify_patron_invite_token` accessible à `anon`

**Localisation :** `supabase/migrations/20260515020000_invite_role.sql`

```sql
GRANT EXECUTE ON FUNCTION public.verify_patron_invite_token(text) TO anon, authenticated;
```

La fonction retourne `owner_id`, `patron_id`, `patron_email`. L'accès `anon` est nécessaire pour la page d'acceptation d'invitation avant login. C'est **acceptable** si et seulement si :
- Les tokens sont des UUIDs v4 (128 bits d'entropie → non-guessable ✅)
- Les tokens expirent (vérification `invite_expires > now()` ✅)
- Les tokens sont à usage unique (vérification `status = 'pending'` ✅)

**Recommandation (non bloquant) :** Retirer `patron_email` du `RETURNS TABLE` si la page d'invitation n'en a pas besoin côté client.

---

### 3.7 [MOYEN] V6 — `adminApi.fetchUsers` sans vérification backend

**Localisation :** `src/services/api/adminApi.ts`

```typescript
const { data, error } = await supabase.from("profiles").select("...");
```

Aucun filtre sur le caller. La sécurité repose entièrement sur le RLS. Vérifier que la policy admin SELECT existe :

```sql
-- Vérification à faire dans Supabase Dashboard
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

Si la policy `admin_read_all_profiles` n'existe pas ou permet des fuites, ajouter :

```sql
DROP POLICY IF EXISTS "admin_read_all_profiles" ON public.profiles;
CREATE POLICY "admin_read_all_profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id                   -- toujours se voir soi-même
    OR owner_id = auth.uid()          -- voir ses patrons
    OR (                              -- admin voit tout
      SELECT is_admin FROM public.profiles WHERE id = auth.uid()
    ) = true
  );
```

---

### 3.8 [MOYEN] V7 — `bilanRepository.ts` : filtres sur `patron_id` seul

**Localisation :** `src/services/bilanRepository.ts`

Les requêtes `bilans_status_v2` filtrent sur `patron_id` mais pas sur `user_id`. L'isolation repose entièrement sur la policy RLS bilans. C'est correct **si la policy est**  :

```sql
-- Policy existante (20260515030000)
USING (user_id = auth.uid() OR patron_id IN (
  SELECT id FROM public.patrons WHERE user_id = auth.uid()
));
```

**Recommandation :** Ajouter explicitement `.eq("user_id", userId)` dans les queries du côté owner pour la défense en profondeur.

---

### 3.9 [MOYEN] V8 — Absence d'ownership côté client sur les mutations

**Tables concernées :** `missions`, `lieux`, `frais_km`, `frais_divers`, `patrons`, `clients`

Toutes les opérations UPDATE/DELETE côté client se limitent à `.eq("id", id)` sans `.eq("user_id", user.id)`. Si une policy RLS est mal configurée ou supprimée accidentellement, n'importe quel utilisateur authentifié pourrait modifier les données d'un autre.

**Correctif (défense en profondeur) :**

```typescript
// Exemple dans missionsApi.ts
const { data, error } = await supabase
  .from("missions")
  .update(updates)
  .eq("id", id)
  .eq("user_id", user.id)   // ← à ajouter partout
  .select()
  .single();
```

---

### 3.10 [MOYEN] V12 — Absence de Security Headers

**Localisation :** `vite.config.js` (aucun header configuré), pas de `vercel.json`

Configurer les headers de sécurité sur Vercel :

```json
// vercel.json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(self)" },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com"
        }
      ]
    }
  ]
}
```

---

### 3.11 [MOYEN] V13 — Absence de Rate Limiting

Aucune des Edge Functions ni des RPCs ne limite le débit d'appels. Vecteurs d'abus :
- Spam d'emails (`send-planning-email`, `send-patron-invite`) 
- Brute-force de codes invitation (`search_by_invite_code`, `verify_patron_invite_token`)
- Flood de creation d'acomptes / bilans

**Correctif Supabase :** Activer le rate limiting dans le Dashboard → Project Settings → API.  
**Correctif Edge Functions :** Implémenter un check de fréquence via la table `profiles` ou Redis (Upstash).

---

## 4. Ce qui est déjà bien sécurisé ✅

| Composant | Sécurité en place |
|-----------|------------------|
| **`delete-user` Edge Function** | JWT vérifié, check `is_admin`, protection auto-suppression, ordre de suppression correct (profil avant auth) |
| **`cancel-patron-invite` Edge Function** | JWT vérifié, binding `invitation.owner_id === caller.id` |
| **`create_inapp_invitation` RPC** | `auth.uid()` obligatoire, validation `initiated_by`, no orphan check |
| **`activate_patron_invite` RPC** | SECURITY DEFINER sécurisé, `invite_expires > now()`, `status = 'pending'` |
| **RLS `acomptes`** | 4 policies CRUD avec `user_id = auth.uid()` (migration 20260520000000) |
| **RLS `acompte_allocations`** | SELECT, INSERT, UPDATE, DELETE correctement liés à `acomptes.user_id` |
| **RLS `agenda_events`** | 4 policies CRUD avec `user_id = auth.uid()` |
| **RLS `patron_invitations`** | `owner_manage_invitations` → `owner_id = auth.uid()` |
| **RLS `patrons`** | Filtre `user_id = auth.uid()` |
| **RLS `clients`** | + policy viewer via `owner_id` |
| **RLS `frais_km`** | 4 policies CRUD |
| **RLS `bilans_status_v2`** | Policies owner + patron + viewer actives |
| **`patronsApi.fetchPatrons`** | Filtre explicit `.eq("user_id", userId)` ✅ |
| **Pas de `service_role` côté client** | `src/services/supabase.ts` utilise uniquement `anon key` |
| **`.env.example`** | Ne contient pas `SERVICE_ROLE_KEY` |
| **`frais_divers.user_id`** | DEFAULT `auth.uid()` ajouté (migration 20260520010000) |
| **`public_read_invite_by_token`** | Corrigé en migration 20260520000000 (QUAL=true supprimé) |
| **`search_by_invite_code`** | Restreint à `authenticated` uniquement |
| **Isolation multi-tenant globale** | `user_id = auth.uid()` présent sur toutes les tables principales |

---

## 5. Plan d'Action Priorité

### 🔴 Bloquant — À corriger avant toute mise en prod

**[P0-1]** Ajouter `verify_jwt = true` (ou supprimer la ligne) dans `supabase/config.toml` + ajouter auth check dans `send-planning-email/index.ts` + validation email/URL.

**[P0-2]** Ajouter `AND user_id = auth.uid()` dans `apply_acompte` + exporter et versionner `unapply_acompte` avec le même correctif.

**[P0-3]** Ajouter le binding token→caller dans `send-patron-invite` : lire l'invitation en DB et utiliser son `patron_email` plutôt que celui du body.

### 🟠 Important — À corriger dans la semaine suivant la mise en prod

**[P1-1]** Restreindre `patron_email_has_account` à `authenticated` uniquement.

**[P1-2]** Créer `vercel.json` avec les security headers (CSP, X-Frame-Options, etc.).

**[P1-3]** Ajouter `.eq("user_id", user.id)` sur toutes les mutations UPDATE/DELETE côté client.

**[P1-4]** Vérifier que `adminApi.fetchUsers` est inaccessible aux non-admins (policy RLS ou check frontend bloquant + API guard).

### 🟡 Amélioration — Sprint suivant

**[P2-1]** Configurer le rate limiting Supabase (Dashboard API Settings).

**[P2-2]** Restreindre CORS des Edge Functions au domaine de l'app plutôt que `"*"`.

**[P2-3]** Ajouter une table d'audit trail pour les opérations sensibles (suppressions, allocations, actions admin).

**[P2-4]** Ajouter la policy viewer pour `frais_divers` si elle doit être visible.

**[P2-5]** Exporter toutes les fonctions DB qui existent hors migrations et les versionner.

---

## 6. Migrations SQL Correctifs (prêtes à appliquer)

### Migration P0-2 : fix apply_acompte

```sql
-- File: supabase/migrations/20260522000000_security_fix_apply_acompte.sql

-- Fix critique : apply_acompte doit vérifier que l'acompte appartient au caller
-- Vecteur : authenticated user appelle RPC avec UUID d'acompte d'un autre user
CREATE OR REPLACE FUNCTION public.apply_acompte(p_acompte_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id      uuid := auth.uid();
  v_montant        numeric;
  v_patron_id      uuid;
  v_user_id        uuid;
  v_reste          numeric;
  v_bilan          record;
  v_total_applique numeric := 0;
BEGIN
  -- ❶ Vérification authentification
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'apply_acompte: utilisateur non authentifié';
  END IF;

  -- ❷ Lock + vérification ownership (FIX SÉCURITÉ)
  SELECT montant, patron_id, user_id
  INTO v_montant, v_patron_id, v_user_id
  FROM public.acomptes
  WHERE id = p_acompte_id
    AND user_id = v_caller_id   -- ← FIX : ownership obligatoire
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'apply_acompte: acompte % non trouvé ou non autorisé', p_acompte_id;
  END IF;

  IF v_montant <= 0 THEN
    RAISE NOTICE 'apply_acompte: acompte % montant <= 0, skip', p_acompte_id;
    RETURN;
  END IF;

  -- Supprimer les allocations existantes (idempotence)
  DELETE FROM public.acompte_allocations WHERE acompte_id = p_acompte_id;

  -- Calculer reste à distribuer
  v_reste := v_montant;

  -- Distribuer sur les bilans non payés du même patron (plus anciens d'abord)
  FOR v_bilan IN
    SELECT id, reste_a_percevoir
    FROM public.bilans_status_v2
    WHERE patron_id = v_patron_id
      AND user_id = v_user_id
      AND reste_a_percevoir > 0
    ORDER BY periode_value ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_reste <= 0;

    DECLARE
      v_alloc numeric := LEAST(v_reste, v_bilan.reste_a_percevoir);
    BEGIN
      INSERT INTO public.acompte_allocations (acompte_id, bilan_id, montant_applique)
      VALUES (p_acompte_id, v_bilan.id, v_alloc);

      UPDATE public.bilans_status_v2
      SET acompte_applique = COALESCE(acompte_applique, 0) + v_alloc,
          reste_a_percevoir = reste_a_percevoir - v_alloc,
          statut = CASE WHEN reste_a_percevoir - v_alloc <= 0 THEN 'paye' ELSE statut END
      WHERE id = v_bilan.id;

      v_reste := v_reste - v_alloc;
      v_total_applique := v_total_applique + v_alloc;
    END;
  END LOOP;

  RAISE NOTICE 'apply_acompte done: acompte %, montant %, alloue %, reste %',
    p_acompte_id, v_montant, v_total_applique, v_reste;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_acompte(uuid) TO authenticated;
```

### Migration P1-1 : restreindre patron_email_has_account

```sql
-- File: supabase/migrations/20260522010000_security_fix_email_enumeration.sql

-- Fix : restreindre la fonction d'énumération d'emails aux utilisateurs authentifiés
REVOKE EXECUTE ON FUNCTION public.patron_email_has_account(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.patron_email_has_account(text) TO authenticated;
```

---

## 7. Ce qui bloque la production

| Blocant | Correction estimée |
|---------|-------------------|
| `send-planning-email` sans auth → spam/phishing | 2h : config.toml + 30 lignes de code |
| `apply_acompte` sans ownership check | 1h : migration SQL + tests |
| `send-patron-invite` email injection | 1h : lecture invitation en DB |

**Total estimé correction des blocants : 4-5 heures**

---

## 8. Recommandations Architecture Future

1. **Centraliser la vérification d'authentification** dans les Edge Functions via un middleware partagé (`_shared/auth.ts`) plutôt que de réimplémenter la logique dans chaque fonction.

2. **Remplacer les RPCs SECURITY DEFINER par des transactions RLS-aware** quand possible. Quand SECURITY DEFINER est nécessaire, toujours commencer par `IF auth.uid() IS NULL THEN RAISE; END IF;` et vérifier l'ownership sur la première SELECT.

3. **Séparer les rôles DB Postgres** : créer un rôle `app_user` avec permissions minimales (pas de SUPERUSER, pas de CREATEDB) pour exécuter les queries applicatives.

4. **Audit trail via triggers** : créer une table `audit_log (table_name, record_id, operation, user_id, changed_at, old_data jsonb, new_data jsonb)` alimentée par des triggers AFTER sur les tables financières (acomptes, bilans_status_v2, acompte_allocations).

5. **Secrets rotation** : documenter une procédure de rotation de l'`anon key` et du JWT secret (Supabase Dashboard → Project Settings → API → Reset).

6. **Tests de pénétration automatisés** : intégrer des tests Vitest qui vérifient que les RPCs SECURITY DEFINER rejettent des UUIDs d'autres utilisateurs (cross-user exploit tests).

---

*Rapport généré lors de l'audit de sécurité pré-production du 22 mai 2026.*
