# Tester les emails en local

Les emails passent par `MailService` (API Brevo). En local (`APP_ENV=local`), vous pouvez les simuler ou les rediriger vers vos propres adresses, sans rien envoyer aux vrais destinataires.

## Configuration (`backend/laravel/.env`)

| Variable | Rôle |
|----------|------|
| `MAIL_SEND_ENABLED` | `false` : aucun envoi, le contenu est écrit dans `storage/logs/laravel.log`. `true` : envoi réel, redirigé vers les adresses de test. Défaut `true`. |
| `MAIL_DEV_TO` | Destinataire de test. **Obligatoire** si `MAIL_SEND_ENABLED=true` en local. |
| `MAIL_DEV_CC` | Copie de test. Vide = pas de copie. |
| `MAIL_DEV_BCC` | Copie cachée de test. Vide = pas de copie cachée. |
| `MAIL_DEV_FROM` | Expéditeur de test. Vide = expéditeur d'origine. |

Exemple pour le quotidien :

```env
MAIL_SEND_ENABLED=false
```

Exemple pour vérifier la réception réelle :

```env
MAIL_SEND_ENABLED=true
MAIL_DEV_TO=moi@exemple.fr
MAIL_DEV_CC=
MAIL_DEV_BCC=
MAIL_DEV_FROM=
```

Après toute modification du `.env` :

```bash
php artisan config:clear
```

## Comportement

- **Simulation (`MAIL_SEND_ENABLED=false`)** : aucun appel à Brevo. L'envoi est considéré comme réussi (`messageId` fictif `simulated-...`). Le destinataire, le sujet et les pièces jointes sont visibles dans les logs.
- **Redirection (`MAIL_SEND_ENABLED=true`)** : le destinataire, le cc, le bcc et l'expéditeur sont remplacés par les valeurs `MAIL_DEV_*`. Le sujet est préfixé `[LOCAL]`.
- **Validation** : les adresses, le contenu et les pièces jointes sont toujours contrôlés, même en simulation.
- **Production** : ces variables sont ignorées. L'envoi est toujours réel.

## Consulter les emails simulés

```bash
# Windows PowerShell
Select-String -Path storage\logs\laravel.log -Pattern "Envoi email simule"
```

## Tests

```bash
php artisan test --filter MailServiceTest
```

Ces tests couvrent la simulation, la redirection, l'erreur si `MAIL_DEV_TO` est vide, et l'envoi réel en production.

## Erreurs fréquentes

| Message | Solution |
|---------|----------|
| `MAIL_DEV_TO est requis en local...` | Renseigner `MAIL_DEV_TO`, ou passer `MAIL_SEND_ENABLED=false`. |
| `BREVO_API_KEY est absent du fichier .env.` | Renseigner `BREVO_API_KEY`. Non requis si `MAIL_SEND_ENABLED=false` en local. |
| Les modifications du `.env` n'ont pas d'effet | Lancer `php artisan config:clear`. |
