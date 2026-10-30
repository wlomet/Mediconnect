@extends('emails.base')

@section('title', 'Réinitialisation de votre mot de passe')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $name }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Vous avez demandé la réinitialisation de votre mot de passe MediConnect. Cliquez sur le bouton ci-dessous pour en
  choisir un nouveau.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#2563eb; border-radius:8px;">
      <a href="{{ $url }}"
        style="display:inline-block; padding:12px 24px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">Réinitialiser
        mon mot de passe</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px; font-size:14px; line-height:1.5; color:#555555;">
  Ce lien est valable {{ $expire }} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre
  mot de passe ne sera pas modifié.
</p>
<p style="margin:0; font-size:12px; line-height:1.5; color:#888888; word-break:break-all;">
  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : {{ $url }}
</p>
@endsection