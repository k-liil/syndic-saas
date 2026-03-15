# Deployment Demo

Ce projet peut etre deploye en mode demo avec :

- Vercel pour l'application Next.js
- Supabase pour la base PostgreSQL

## 1. Prerequis

- un repo GitHub contenant ce projet
- un compte Vercel
- un projet Supabase

## 2. Variables d'environnement

Configurer dans Vercel :

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_URL`
- `NEXTAUTH_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `GOOGLE_CLIENT_ID` si Google login est active
- `GOOGLE_CLIENT_SECRET` si Google login est active

Utiliser `.env.example` comme modele.

## 3. URLs conseillees

En local :

- `AUTH_URL=http://localhost:3000`
- `NEXTAUTH_URL=http://localhost:3000`

En demo Vercel :

- `AUTH_URL=https://ton-projet.vercel.app`
- `NEXTAUTH_URL=https://ton-projet.vercel.app`

## 4. Base de donnees

Pour l'application :

- `DATABASE_URL` doit pointer vers l'URL pooler Supabase sur le port `6543`

Pour Prisma migrations :

- `DIRECT_URL` doit pointer vers l'URL directe Supabase sur le port `5432`

## 5. Premiere mise en ligne

1. Pousser le projet sur GitHub.
2. Importer le repo dans Vercel.
3. Ajouter les variables d'environnement.
4. Lancer la migration de base :

```bash
npx prisma migrate deploy
```

5. Regenerer Prisma si besoin :

```bash
npx prisma generate
```

6. Deployer.

## 6. Apres deploiement

Verifier :

- `/login`
- `/dashboard`
- `/setup/settings`
- `/ops/receipts`
- import CSV recettes
- import CSV paiements

## 7. Google Login

Si Google est active :

- ajouter l'URL de callback Vercel dans Google Cloud

```txt
https://ton-projet.vercel.app/api/auth/callback/google
```

## 8. Limites du mode demo

- Vercel gratuit : bien pour demo/test, pas pour vraie prod client
- Supabase gratuit : bien pour essai, limites de ressources et de veille

## 9. Passage en vrai SaaS

Quand tu passeras en payant :

- Vercel Pro ou equivalent
- Supabase payant ou Postgres dedie
- domaine custom
- monitoring
- sauvegardes
- compte super admin multi-organisations
