---
description: "Regles pour les emails du backend Laravel : service MailService, templates Blade, commande mail:test"
applyTo: "backend/laravel/**"
---

# Instructions Copilot - Emails (backend Laravel)

Projet : `backend/laravel`. Langue des messages et des commentaires : francais.

## Service d'envoi : `App\Services\MailService`

- Fichier : `backend/laravel/app/Services/MailService.php`.
- Envoi via l'API Brevo (`POST https://api.brevo.com/v3/smtp/email`), pas via SMTP.
- Cle lue dans `.env` par `BREVO_API_KEY`, exposee par `config('services.brevo.key')`.
- Signature : `send(array|string $to, string $subject, array $options = []): array`, retourne la reponse Brevo (`messageId`).
- Options supportees :
  - `html` / `text` : au moins un des deux est requis.
  - `cc`, `bcc` : adresses en string ou `['email' => ..., 'name' => ...]`.
  - `attachments` : chemins en string ou `['path' => ..., 'name' => ...]`.
  - `scheduled_at` : `DateTimeInterface|string`, doit etre dans le futur.
  - `sender` : `['email' => ..., 'name' => ...]`.
- L'expediteur n'utilise pas `MAIL_FROM_NAME` par defaut : passer `sender` avec `name` explicitement.
- L'adresse expediteur doit etre verifiee dans Brevo.
- Ne pas ajouter de nouveau mode d'envoi (SMTP, Mailable) sans demande explicite.

## Mode local (simulation et redirection)

- Actif uniquement si `APP_ENV=local`. En production, aucun effet.
- `MAIL_SEND_ENABLED` (lu par `config('services.brevo.enabled')`, defaut `true`) :
  - `false` : aucun appel Brevo, retourne `['messageId' => 'simulated-...']`, log du contenu dans `laravel.log`. La cle `BREVO_API_KEY` n'est pas requise.
  - `true` : envoi reel, mais redirige vers les adresses de test.
- Variables de redirection (`config('services.brevo.dev')`) : `MAIL_DEV_TO` (obligatoire si envoi actif en local, sinon exception), `MAIL_DEV_CC`, `MAIL_DEV_BCC`, `MAIL_DEV_FROM`. Vide = cc/bcc supprimes, expediteur inchange.
- Le sujet est prefixe par `[LOCAL]` lors de la redirection.
- Les validations (destinataires, contenu, pieces jointes, date) restent actives dans les deux cas.

## Templates Blade : `backend/laravel/resources/views/emails/`

- `base.blade.php` : layout commun (en-tete MediConnect, pied de page).
  - Contenu injecte par `@yield('content')`, titre par `@yield('title')`.
- Chaque nouveau mail est un fichier `emails/<nom>.blade.php` qui commence par `@extends('emails.base')`.
  - Definir `@section('title', ...)` et `@section('content') ... @endsection`.
- Mise en forme : CSS en ligne (`style="..."`), mise en page en tables, pour la compatibilite des clients mail. Pas de classes CSS ni de fichiers externes.
- Pour envoyer un template : `$html = view('emails.<nom>', $data)->render();` puis `options['html'] = $html`.

## Commande de test : `mail:test`

- Fichier : `backend/laravel/app/Console/Commands/SendTestMail.php`.
- Utilise `MailService` et le template `emails.test`.
- Commande `php artisan mail:test` : envoie un vrai mail. Ne pas l'executer sans accord explicite de l'utilisateur.

## Points connus

- Erreur `cURL error 77` : le `curl.cainfo` du php.ini utilise doit pointer vers un `cacert.pem` existant (ex. `D:\laragon_6_0\etc\ssl\cacert.pem`).
- Apres modification du `.env`, lancer `php artisan config:clear`.
