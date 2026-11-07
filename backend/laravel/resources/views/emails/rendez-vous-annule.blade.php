@extends('emails.base')

@section('title', 'Votre rendez-vous est annulé')

@section('content')
<h2 style="margin:0 0 16px; font-size:18px; color:#222222;">Bonjour {{ $name }},</h2>
<p style="margin:0 0 16px; font-size:15px; line-height:1.5;">
  Votre rendez-vous avec {{ $medecin }} le {{ $date }} de {{ $heureDebut }} à {{ $heureFin }} a été annulé.
</p>
@endsection
