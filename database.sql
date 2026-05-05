-- 1. Création de la table 'profiles' (Extension de auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Création de la table 'bilans' (Ta deuxième entité métier)
CREATE TABLE public.bilans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    transport_score NUMERIC DEFAULT 0,
    housing_score NUMERIC DEFAULT 0,
    food_score NUMERIC DEFAULT 0,
    consumption_score NUMERIC DEFAULT 0,
    waste_score NUMERIC DEFAULT 0,
    total_score NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Fonction qui copie les données du nouvel inscrit vers la table profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Le trigger qui écoute les inscriptions
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Activation de la sécurité sur les deux tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bilans ENABLE ROW LEVEL SECURITY;

-- Fonction utilitaire pour vérifier si l'utilisateur courant est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT is_admin FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Lecture : L'utilisateur connecté peut voir son propre profil
CREATE POLICY "Lecture profil personnel" 
ON public.profiles FOR SELECT 
USING ( auth.uid() = id );

-- Modification : L'utilisateur connecté peut modifier son propre profil
CREATE POLICY "Modification profil personnel" 
ON public.profiles FOR UPDATE 
USING ( auth.uid() = id );

-- Admin : L'administrateur peut voir tous les profils
CREATE POLICY "Admin : Lecture tous les profils" 
ON public.profiles FOR SELECT 
USING ( public.is_admin() );

-- Admin : L'administrateur peut supprimer des profils
CREATE POLICY "Admin : Suppression profils" 
ON public.profiles FOR DELETE 
USING ( public.is_admin() );

--------------------------------------------------------
-- POLITIQUES POUR LA TABLE 'BILANS' 
--------------------------------------------------------

-- Création : L'utilisateur connecté peut sauvegarder SON bilan
CREATE POLICY "Création de son propre bilan" 
ON public.bilans FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- Lecture : L'utilisateur connecté peut voir SES anciens bilans
CREATE POLICY "Lecture de ses propres bilans" 
ON public.bilans FOR SELECT 
USING ( auth.uid() = user_id );

-- Suppression : L'utilisateur connecté peut supprimer SES anciens bilans
CREATE POLICY "Suppression de ses propres bilans" 
ON public.bilans FOR DELETE 
USING ( auth.uid() = user_id );

-- Admin : L'administrateur peut voir tous les bilans globaux (pour faire des statistiques par exemple)
CREATE POLICY "Admin : Lecture tous les bilans" 
ON public.bilans FOR SELECT 
USING ( public.is_admin() );`

create or replace function public.admin_bilan_summary()
returns table (
  avg_total_score numeric
)
language sql
security definer
set search_path = public
as $$
  select avg(total_score)::numeric as avg_total_score
  from public.bilans;
$$;

revoke all on function public.admin_bilan_summary() from public;
grant execute on function public.admin_bilan_summary() to authenticated;