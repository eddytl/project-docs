Voici la synthèse complète et détaillée de tout ce qui est acté.

---

## La plateforme en une phrase

> Un SaaS B2B multi-tenant qui permet à des entreprises camerounaises de créer et diffuser des quiz compétitifs avec gains à leur audience, via SMS shortcode, WhatsApp ou web, sans que tu touches ni aux lots, ni aux opérateurs, ni à l'argent.

---

## 1. Le positionnement

**Tu es éditeur logiciel uniquement.** Tu vends un outil, pas un service de jeu. Chaque client B2B porte l'entière responsabilité de sa relation avec son agrégateur SMS, son opérateur télécom, et la remise physique de ses lots. Cette séparation est volontaire et très saine légalement.

**Le marché cible est le Cameroun** pour le lancement, avec MTN et Orange comme opérateurs dominants, et MTN MoMo / Orange Money comme modes de paiement des abonnements.

---

## 2. Les acteurs

**Toi — l'éditeur SaaS**
Tu développes et maintiens la plateforme. Tu factures les clients B2B en XAF chaque mois. Tu ne connais pas les joueurs finaux, tu ne touches pas aux lots.

**Les clients B2B** — tes payeurs directs
Ce sont des entreprises camerounaises : chaînes TV, radios, brasseries, opérateurs télécoms, banques, grandes surfaces. Ils créent les quiz, définissent les questions et les points, configurent les canaux, fixent les lots, gèrent les sessions, et remettent eux-mêmes les récompenses aux gagnants.

**Les joueurs** — les utilisateurs finaux
Le grand public camerounais. Ils participent via SMS en envoyant des réponses à un numéro court, ou via WhatsApp, ou via une landing page web. Ils ne paient pas la plateforme — leur relation financière est uniquement avec l'opérateur télécom via le SMS surtaxé, ce qui est géré entièrement côté client B2B.

---

## 3. Les canaux — tous configurables par le client B2B

**Canal SMS shortcode** — le canal principal.
Le client B2B contracte lui-même avec son agrégateur SMS (Africa's Talking, Infobip, ou autre) et obtient son numéro court auprès de MTN ou Orange Cameroun. Il renseigne dans son dashboard : sa clé API agrégateur, son shortcode, son Sender ID, ses mots-clés de réponse, et ses templates de messages MT avec variables dynamiques. Ta plateforme reçoit les SMS MO via webhook HTTP POST sécurisé par signature HMAC, et envoie les SMS MT via l'API de l'agrégateur du client.

**SMS MO** — Mobile Originated — c'est le joueur qui parle : il envoie sa réponse (A, B, C, D) ou son mot-clé d'inscription ("JOUER") depuis son mobile vers le shortcode.

**SMS MT** — Mobile Terminated — c'est la plateforme qui parle : elle envoie les questions, les confirmations de réponse, les tickets de tirage, les rappels, et les annonces de gagnants.

**Canal WhatsApp Business** — canal complémentaire.
Le client fournit son token WhatsApp Business API. Même logique MO/MT que le SMS, plus riche en format. Un numéro WhatsApp Business = une seule session active à la fois, comme pour le shortcode.

**Canal Landing Page Web** — canal web.
Une page joueur responsive générée automatiquement par ta plateforme pour chaque quiz, accessible via lien ou QR code. Pas de contrainte de session simultanée sur ce canal.

**Règle transversale** — un shortcode ou un numéro WhatsApp ne peut héberger qu'une seule session active à la fois. Si un client tente d'en lancer une deuxième, le dashboard bloque avec un message explicite.

---

## 4. Les modes de jeu — deux modes distincts

### Mode 1 — Classement final
À la clôture de la session, les X premiers joueurs ayant le plus grand score total sont déclarés gagnants et reçoivent un SMS MT d'annonce. X est configurable par le client. En cas d'égalité de score, le joueur dont le premier SMS MO est arrivé le plus tôt l'emporte. Le client peut aussi choisir de déclarer tous les ex-aequo gagnants. Un SMS MT optionnel peut être envoyé aux non-gagnants.

### Mode 2 — Tirage au sort par tickets
Un joueur accumule des points en répondant correctement aux questions. Quand il atteint un seuil de points configurable par le client, il obtient automatiquement un ticket de tirage au sort numéroté, reçu immédiatement par SMS MT. Son compteur de points repart à zéro et il peut obtenir d'autres tickets. Un plafond de tickets par joueur est configurable. Le tirage est déclenché **manuellement** par le client depuis son dashboard — il peut ainsi synchroniser l'annonce avec une émission TV ou radio en direct. Le tirage est irréversible une fois lancé.

---

## 5. Le scoring

Chaque question a un nombre de points défini librement par le client à la création du quiz. Une bonne réponse rapporte les points de la question. Une mauvaise réponse rapporte zéro. Le score total d'un joueur est la somme des points de toutes ses bonnes réponses. Dans le Mode 2, le seuil de tickets est exprimé en points (et non en nombre de bonnes réponses), ce qui est cohérent avec la pondération des questions.

---

## 6. Les questions

**Type** — QCM uniquement. Le joueur répond toujours par une lettre : A, B, C ou D. Parsing MO simple et sans ambiguïté.

**Options** — 2, 3 ou 4 options configurables par question individuellement. Le client choisit à la création.

**Bonne réponse** — une seule option correcte par question, désignée par le client.

**Ordre** — séquentiel, défini par le client. Le joueur ne peut pas sauter une question.

**Envoi** — une question à la fois, la suivante est envoyée uniquement après réception de la réponse MO du joueur. C'est un dialogue SMS séquentiel et interactif.

**Déclenchement de Q1** — configurable par le client : soit inscription explicite (joueur envoie mot-clé → bienvenue → confirme → Q1), soit inscription implicite (joueur envoie mot-clé → bienvenue + Q1 dans le même MT).

---

## 7. Les règles métier des réponses joueur

**Première réponse définitive** — sur chaque question, seule la première réponse MO reçue est prise en compte. Les suivantes sont ignorées silencieusement. C'est aussi ce timestamp qui sert pour les ex-aequo.

**Réponse invalide** — si le joueur envoie une lettre inexistante pour cette question (ex: "D" sur une question à 2 options, ou "Z"), la plateforme renvoie un SMS d'erreur court indiquant les options valides. La question reste en attente.

**Normalisation** — les réponses en minuscule ("a") sont acceptées et converties en majuscule. Les espaces avant/après sont ignorés.

**Reprise automatique** — si le joueur s'est arrêté en milieu de session, dès qu'il envoie n'importe quel SMS la plateforme lui renvoie sa prochaine question en attente. Pas besoin de mot-clé de reprise.

**Timeout** — à la clôture de la session. Les questions sans réponse au moment de la clôture comptent 0 point. Pas de timer individuel par question.

**Identification joueur** — par MSISDN. Un joueur peut utiliser plusieurs canaux (SMS et WhatsApp) sur la même session, ses scores se cumulent sur le même profil joueur.

**SMS hors session** — si un joueur envoie un SMS alors qu'aucune session n'est active sur ce shortcode, il reçoit un MT informatif. Même chose s'il répond après la clôture.

---

## 8. Le cycle de vie d'une session

Une session est une instance d'un quiz avec une durée de vie, des joueurs, et un résultat. Un même quiz peut générer plusieurs sessions, créées **manuellement** par le client à chaque fois — pas de récurrence automatique.

Les états successifs d'une session :

**DRAFT** — création en cours, tout est modifiable, aucun joueur ne peut participer.

**SCHEDULED** — session finalisée et verrouillée, questions non modifiables, la plateforme attend la date d'ouverture.

**OPEN** — session active, SMS MO acceptés, MT envoyés, leaderboard en temps réel.

**CLOSING** — clôture atteinte (automatique à la date_fin, ou manuelle par le client, ou les deux). Plus aucun MO accepté, calcul du classement final en cours.

**DRAWING** — Mode 2 uniquement, déclenché manuellement par le client. Tirage aléatoire parmi les tickets valides, SMS MT gagnants envoyés automatiquement.

**CLOSED** — état final immuable. Gagnants proclamés, résultats archivés, exportables en CSV.

L'annulation est possible depuis tout état sauf CLOSED.

---

## 9. La facturation SaaS

Trois plans d'abonnement mensuel en XAF :

- **Starter — 25 000 XAF/mois** : 1 quiz actif, 500 participants max, 1 canal configuré, SMS + WhatsApp.
- **Business — 75 000 XAF/mois** : 5 quiz actifs, 5 000 participants, 3 canaux, analytics complets.
- **Enterprise — 200 000 XAF/mois** : illimité, tous canaux, white-label, support dédié et SLA.

Revenus complémentaires : SMS hors quota (10 XAF/SMS), frais de setup one-shot (50 000 à 150 000 XAF), option white-label en add-on sur Business (+30 000 XAF/mois). Le paiement se fait en Mobile Money (MTN MoMo, Orange Money) ou virement bancaire pour les grands comptes. Facturation mensuelle automatique avec cycle de relance sur 15 jours avant suspension.

---

## 10. Ce qui reste à définir

| Sujet | Priorité |
|---|---|
| Parcours joueur complet pas à pas | 🔲 Prochain |
| Dashboard client B2B et fonctionnalités | 🔲 Prochain |
| Gestion des comptes et tenants | 🔲 Prochain |
| Schéma base de données | 🔲 Après concept |
| Architecture technique | 🔲 Après concept |
| Intégration WhatsApp Business API | 🔲 Après concept |

---

Est-ce que cette synthèse reflète fidèlement ta vision ? Y a-t-il des points à corriger ou à préciser avant de continuer ?
