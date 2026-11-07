@extends('emails.base')

@section('title', 'Votre rendez-vous est confirmé')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $name }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Votre rendez-vous est confirmé. Voici les détails :
</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  <tr>
    <td style="padding:6px 16px 6px 0; width:110px; font-weight:bold; vertical-align:top;">Médecin</td>
    <td style="padding:6px 0; vertical-align:top;">{{ $medecin }}</td>
  </tr>
  <tr>
    <td style="padding:6px 16px 6px 0; font-weight:bold; vertical-align:top;">Date</td>
    <td style="padding:6px 0; vertical-align:top;">{{ $date }} de {{ $heureDebut }} à {{ $heureFin }}</td>
  </tr>
  @if ($adresse)
  <tr>
    <td style="padding:6px 16px 6px 0; font-weight:bold; vertical-align:top;">Adresse</td>
    <td style="padding:6px 0; vertical-align:top;">{{ $adresse }}</td>
  </tr>
  @endif
  @if ($motif)
  <tr>
    <td style="padding:6px 16px 6px 0; font-weight:bold; vertical-align:top;">Motif</td>
    <td style="padding:6px 0; vertical-align:top;">{{ $motif }}</td>
  </tr>
  @endif
</table>
@endsection
