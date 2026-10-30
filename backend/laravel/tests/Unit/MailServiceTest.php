<?php

namespace Tests\Unit;

use App\Services\MailService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

class MailServiceTest extends TestCase
{
    private function configurer(string $env, bool $actif): void
    {
        $this->app['env'] = $env;

        config([
            'services.brevo.key' => 'test-key',
            'services.brevo.enabled' => $actif,
            'services.brevo.dev' => [
                'to' => 'dev@example.test',
                'cc' => 'cc@example.test',
                'bcc' => null,
                'from' => 'local@example.test',
            ],
        ]);
    }

    public function test_simulation_locale_ne_contacte_pas_brevo(): void
    {
        Http::fake();
        $this->configurer('local', false);

        $response = app(MailService::class)->send('patient@example.test', 'Sujet', ['text' => 'Contenu']);

        $this->assertStringStartsWith('simulated-', $response['messageId']);
        Http::assertNothingSent();
    }

    public function test_envoi_local_est_redirige_vers_les_adresses_de_test(): void
    {
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => 'abc'], 201)]);
        $this->configurer('local', true);

        app(MailService::class)->send('patient@example.test', 'Sujet', [
            'text' => 'Contenu',
            'cc' => 'medecin@example.test',
        ]);

        Http::assertSent(function (Request $request) {
            $data = $request->data();

            return $data['to'] === [['email' => 'dev@example.test']]
                && $data['cc'] === [['email' => 'cc@example.test']]
                && ! array_key_exists('bcc', $data)
                && $data['sender']['email'] === 'local@example.test'
                && $data['subject'] === '[LOCAL] Sujet';
        });
    }

    public function test_envoi_local_sans_mail_dev_to_leve_une_erreur(): void
    {
        Http::fake();
        $this->configurer('local', true);
        config(['services.brevo.dev.to' => null]);

        try {
            app(MailService::class)->send('patient@example.test', 'Sujet', ['text' => 'Contenu']);
            $this->fail('Une exception était attendue.');
        } catch (RuntimeException $e) {
            $this->assertSame('MAIL_DEV_TO est requis en local pour rediriger les emails.', $e->getMessage());
        }

        Http::assertNothingSent();
    }

    public function test_production_envoie_au_destinataire_reel_meme_si_desactive(): void
    {
        Http::fake(['api.brevo.com/*' => Http::response(['messageId' => 'abc'], 201)]);
        $this->configurer('production', false);

        app(MailService::class)->send('patient@example.test', 'Sujet', ['text' => 'Contenu']);

        Http::assertSent(function (Request $request) {
            $data = $request->data();

            return $data['to'] === [['email' => 'patient@example.test']]
                && $data['subject'] === 'Sujet';
        });
    }
}
