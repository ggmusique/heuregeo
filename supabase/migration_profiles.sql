-- =============================================
-- Migration : création table profiles
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- 1. Création de la table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom      text NOT NULL DEFAULT '',
  nom         text NOT NULL DEFAULT '',
  adresse     text DEFAULT '',
  code_postal text DEFAULT '',
  ville       text DEFAULT '',
  telephone   text DEFAULT '',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Sécurité Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Utilisateur gère son propre profil"
  ON public.profiles FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Trigger : crée un profil vide automatiquement à chaque nouvelle inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Pour les utilisateurs existants : crée leur profil vide s'il n'existe pas
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
