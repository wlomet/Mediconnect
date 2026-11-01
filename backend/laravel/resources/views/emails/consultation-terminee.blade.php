@extends('emails.base')

@section('title', 'Votre consultation est terminée')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $name }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Votre consultation avec {{ $medecin }} du {{ $date }} est terminée.
</p>
@if ($acces)
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Vous pouvez retrouver toutes vos informations et tous vos documents dans votre espace MediConnect.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background-color:#2563eb; border-radius:8px;">
      <a href="{{ $url }}"
        style="display:inline-block; padding:12px 24px; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none;">Me connecter</a>
    </td>
  </tr>
</table>
@endif
@endsection
