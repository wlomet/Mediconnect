@extends('emails.base')

@section('title', 'Suppression prévue de vos données')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour,</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  {{ $type === 'user' ? 'Le compte' : "L'établissement" }} <strong>{{ $label }}</strong> n'a plus d'activité sur
  MediConnect depuis le {{ $lastActivity }}.
</p>
@if ($overdue)
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Ses données sont désormais éligibles à la suppression. Connectez-vous à MediConnect dans les plus brefs délais pour
  les conserver.
</p>
@else
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Conformément à notre politique de conservation, ces données seront supprimées le <strong>{{ $deadline }}</strong>.
</p>
<p style="margin:0; font-size:15px; line-height:1.5;">
  Pour les conserver, connectez-vous à MediConnect avant cette date.
</p>
@endif
@endsection