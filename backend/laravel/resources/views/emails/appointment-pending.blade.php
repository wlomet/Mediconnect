@extends('emails.base')

@section('title', 'Rendez-vous en attente de validation')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $doctorName }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Les rendez-vous suivants, prevus dans plus de deux semaines, sont toujours en attente de validation :
</p>
<table role="presentation" width="100%" cellpadding="8" cellspacing="0"
  style="border-collapse:collapse; font-size:14px;">
  <tr style="background-color:#f4f6f8; text-align:left;">
    <th style="border-bottom:1px solid #dddddd;">Date</th>
    <th style="border-bottom:1px solid #dddddd;">Patient</th>
    <th style="border-bottom:1px solid #dddddd;">Motif</th>
  </tr>
  @foreach ($appointments as $appointment)
  <tr>
    <td style="border-bottom:1px solid #eeeeee;">{{ $appointment->date_debut->format('d/m/Y H:i') }}</td>
    <td style="border-bottom:1px solid #eeeeee;">{{ $appointment->client->name ?? $appointment->name ?? 'Non renseigne'
      }}</td>
    <td style="border-bottom:1px solid #eeeeee;">{{ $appointment->motif }}</td>
  </tr>
  @endforeach
</table>
<p style="margin:16px 0 0; font-size:15px; line-height:1.5;">
  Merci de valider ou de traiter ces rendez-vous depuis votre espace MediConnect.
</p>
@endsection