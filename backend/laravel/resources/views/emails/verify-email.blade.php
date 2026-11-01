@extends('emails.base')

@section('title', 'Activez votre compte MediConnect')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $name }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Merci pour votre inscription sur MediConnect. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et
  activer votre compte.
</p>
@if ($suite)
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">{{ $suite }}</p>
@endif
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#2563eb; border-radius:8px;">
      <a href="{{ $url }}"
        style="display:inline-block; padding:12px 24px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">Activer
        mon compte</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px; font-size:14px; line-height:1.5; color:#555555;">
  Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette inscription, ignorez ce message.
</p>
<p style="margin:0; font-size:12px; line-height:1.5; color:#888888; word-break:break-all;">
  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur : {{ $url }}
</p>
@endsection
