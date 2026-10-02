# Mise en ligne de test (staging) — gratuit

| Élément | Service | Plan |
|---|---|---|
| Site (`apps/web`) | Vercel | Hobby (gratuit, non commercial → test uniquement) |
| API (`apps/api`) | Render | Free (s'endort après 15 min, ~1 min pour se réveiller) |
| Base de données | Neon | Free (0,5 Go, n'expire pas) |

> Créez les comptes **au nom du client (Amerivo)** et ajoutez Demat-Vision comme membre.

## 1. Base de données — Neon

1. neon.com → **Create project** → nom `amerivo`, région **Europe (Frankfurt)**, Postgres 17.
2. **Connect** → copiez la *connection string* (elle finit par `?sslmode=require`).
   Gardez-la secrète : c'est la valeur de `DATABASE_URL`.

## 2. API — Render

1. render.com → **New → Blueprint** → dépôt `nadhircheniti/Amerivo` → Render lit `render.yaml`.
2. Remplissez les variables demandées :
   - `DATABASE_URL` : la connection string Neon (obligatoire)
   - `WEB_URL` : l'adresse Vercel, ex. `https://amerivo.vercel.app` (obligatoire, pour CORS)
   - les clés Clerk / Stripe / Daily / Resend : **laissez vide pour l'instant** (étapes suivantes)
3. **Apply**. Le premier déploiement prend quelques minutes :
   installation → build → migrations de la base → données de démonstration (`SEED_DEMO=1`) → démarrage.
4. Vérifiez : `https://amerivo-api.onrender.com/api/health` → `{"ok":true,…}`
   puis `…/api/teachers` → la liste des 5 professeurs de démonstration.

## 3. Site — Vercel

1. vercel.com → **Add New → Project** → dépôt `nadhircheniti/Amerivo`.
2. **Root Directory : `apps/web`** · Framework : Next.js (détecté).
3. Variable (utile dès l'étape « relier le site à l'API ») :
   `NEXT_PUBLIC_API_URL` = `https://amerivo-api.onrender.com/api`
4. **Deploy**.

> Où ajouter une variable : projet Vercel → **Settings** → **Environment Variables** → Key / Value → cocher
> Production, Preview et Development → **Save**. Les variables `NEXT_PUBLIC_…` sont intégrées au moment de la
> construction : après un ajout ou une modification, **Deployments → ⋯ → Redeploy**.

## 4. Connexion des utilisateurs — Clerk

Sans clés Clerk, le site reste en **mode démonstration** (les formulaires naviguent sans créer de compte).

1. clerk.com → créer une application « Amerivo English ».
   - Méthodes : **Email** (avec mot de passe), **Google**, **Apple**.
   - Vérification de l'e-mail : **code par e-mail** (Email verification code).
2. Clerk → **API Keys** : copier `pk_test_…` et `sk_test_…`.
3. **Vercel** (Settings → Environment Variables) :
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = `pk_test_…`
   - `CLERK_SECRET_KEY` = `sk_test_…`
   - `NEXT_PUBLIC_API_URL` = `https://amerivo-api.onrender.com/api`
   puis **Redeploy**.
4. **Render** (service amerivo-api → Environment) :
   - `CLERK_SECRET_KEY` = `sk_test_…` (la même)
   - `ADMIN_EMAILS` = l'adresse (ou les adresses, séparées par des virgules) qui doivent être administrateur
   - `WEB_URL` = `https://amerivo-api.vercel.app,https://amerivo-api-*.vercel.app`
   - `PAYMENTS_SIMULATED` = `1` (tant que Stripe n'est pas branché : les réservations sont confirmées sans paiement)
   puis **Save, rebuild and deploy**.

Parcours : inscription → code reçu par e-mail → `/welcome` crée le compte Amerivo (âge ≥ 13 ans vérifié par
l'API) → questionnaire. Connexion → `/welcome` → espace élève, professeur ou admin selon le rôle.
Les pages `/student`, `/teacher`, `/admin`, `/classroom`, `/onboarding` exigent d'être connecté.

## 5. Paiements — Stripe (mode test)

Sans clés Stripe, `PAYMENTS_SIMULATED=1` confirme les réservations sans paiement. Dès que
`STRIPE_SECRET_KEY` est présente sur Render, les vrais paiements (test) prennent le relais.

1. dashboard.stripe.com → créer le compte → vérifier que **Test mode** (Sandbox) est activé.
2. **Developers → API keys** : copier `pk_test_…` et `sk_test_…`.
3. **Vercel** : `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_test_…` → **Redeploy**.
4. **Render** : `STRIPE_SECRET_KEY` = `sk_test_…`.
5. **Webhook** (sécurité : confirme la réservation même si l'élève ferme la page) :
   Stripe → **Developers → Webhooks → Add endpoint**
   - URL : `https://amerivo-api.onrender.com/api/webhooks/stripe`
   - Événements : `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
   - Copier le **Signing secret** (`whsec_…`) → Render : `STRIPE_WEBHOOK_SECRET`.
   Puis **Save, rebuild and deploy**.
6. **Apple Pay** (facultatif en test) : Stripe → **Settings → Payment method domains** → ajouter
   `amerivo-api.vercel.app`.

Cartes de test : `4242 4242 4242 4242` (acceptée), `4000 0027 6000 3184` (validation 3-D Secure),
`4000 0000 0000 9995` (refusée) — date future quelconque, CVC quelconque.

Fonctionnement : le créneau est réservé 30 minutes pendant le paiement ; passé ce délai il est
libéré et le paiement annulé. Un paiement arrivé après annulation est remboursé automatiquement.

## 6. Salle de classe vidéo — Daily.co

Chaque cours a sa salle privée (2 personnes max, ouverte peu avant le cours, fermée 30 min après la fin).
Seuls le professeur et l'élève du cours peuvent entrer (pas l'admin) ; le professeur est « propriétaire » de la salle.

1. dashboard.daily.co → créer le compte (gratuit : 10 000 minutes-participant par mois).
   Le nom choisi à l'inscription donne l'adresse `https://<nom>.daily.co`.
2. **Developers** → copier la **API key**.
3. **Render** : `DAILY_API_KEY` = la clé ; `DAILY_DOMAIN` = `<nom>.daily.co` (facultatif, trouvé automatiquement sinon)
   → **Save, rebuild and deploy**. Rien à faire sur Vercel.
4. Test : `CLASSROOM_EARLY_MIN=1440` (déjà dans render.yaml) ouvre la salle dès la veille du cours pour tester sans
   attendre. **En production, supprimer cette variable** (retour à 10 minutes avant le cours).

Pour tester : réserver un cours avec un compte élève, puis ouvrir la salle depuis deux navigateurs (ou un ordinateur
et un téléphone) : l'élève via « My booked lessons → Classroom », le professeur via son tableau de bord.
Dans la salle : caméra, micro, partage d'écran, discussion (non conservée) et notes partagées (enregistrées avec le cours).
Le professeur termine le cours (« End lesson ») puis rédige le compte rendu.

## 7. Recrutement des professeurs

Parcours : « Become a Teacher » → compte professeur (`/signup?as=teacher`, sans date de naissance) → candidature
en 6 étapes enregistrée au fur et à mesure (infos, profil pro avec titre et présentation, **vérification d'identité
Stripe Identity** : pièce d'identité + selfie, **lien vers une vidéo** YouTube/Vimeo/Loom de 2 min, récapitulatif,
envoi) → l'admin examine dans **Admin → Professeurs** (vidéo intégrée, notes, entretien, approuver / refuser /
suspendre) → une fois approuvé, le professeur règle ses **disponibilités, son tarif, le cours d'essai et les forfaits**
dans **Planning et disponibilités**, et apparaît dans la liste publique.

Stripe (mode test) :
- **Stripe Identity** doit être activé : dashboard Stripe → **Identity** → accepter les conditions (en test, Stripe
  propose des documents de test ; aucun vrai document n'est nécessaire).
- Dans la destination webhook, ajouter les événements `identity.verification_session.verified`,
  `identity.verification_session.requires_input`, `identity.verification_session.processing`,
  `identity.verification_session.canceled` (facultatif : le résultat est aussi relu quand le professeur revient sur
  sa candidature).
- Approbation impossible tant que l'identité n'est pas « vérifiée ».

Pas encore disponible : envoi de fichiers (photo de profil, certificats) — le professeur les ajoutera plus tard.

## 8. Contact & support — contact@amerivoenglish.com

- Le site affiche **contact@amerivoenglish.com** (pied de page « Contact us », page `/contact`, connexion, candidature professeur, offre entreprises).
- Le formulaire de `/contact` enregistre chaque message dans l'admin → **Support inbox** (badge = messages à traiter). Les admins y répondent ; la réponse est gardée dans l'historique.
- **Sans e-mail configuré** : « Save & open in my mailbox » enregistre la réponse puis ouvre la messagerie de l'admin, prête à être envoyée depuis contact@amerivoenglish.com.
- **Avec e-mail automatique (recommandé)** — Resend, gratuit jusqu'à 3 000 e-mails/mois :
  1. resend.com → créer un compte → **Domains** → **Add domain** → `amerivoenglish.com` → ajouter les enregistrements DNS indiqués (chez Namecheap) → attendre « Verified ».
  2. **API Keys** → **Create API key** (permission « Sending access »).
  3. Render → amerivo-api → **Environment** : `RESEND_API_KEY` = la clé, `EMAIL_FROM` = `Amerivo English <contact@amerivoenglish.com>`, `SUPPORT_EMAIL` = `contact@amerivoenglish.com` → **Save, rebuild and deploy**.
  4. Ensuite : chaque message du formulaire arrive aussi dans la boîte contact@ (Reply-To = le client), le client reçoit un accusé de réception, et les réponses de l'admin partent automatiquement avec Reply-To = contact@ — la conversation peut continuer depuis la boîte mail.

## Fonctionnement au quotidien

- Chaque fusion sur `main` redéploie automatiquement Render et Vercel.
- Chaque branche / pull request a une adresse de prévisualisation Vercel.
- Les migrations de base de données s'appliquent au démarrage de l'API.
- Données de démonstration : mettre `SEED_DEMO` à `0` dans Render quand on n'en veut plus.

## Passage en production (payant)

- Vercel **Pro**, Render plan payant (pas de mise en veille), Neon payant à l'usage.
- Nouveau service Render + nouvelle base Neon dédiés à la production, `SEED_DEMO=0`.
- Clés **live** Stripe / Clerk / Daily, nom de domaine (ex. `amerivo.com` + `api.amerivo.com`).
