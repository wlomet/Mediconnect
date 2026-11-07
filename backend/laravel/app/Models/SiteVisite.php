<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteVisite extends Model
{
    // Jour calendaire de Paris : le public visé est français.
    public const FUSEAU = 'Europe/Paris';

    protected $table = 'site_visites';

    protected $fillable = [
        'jour',
        'visiteur_id',
    ];

    public $incrementing = false;

    public $timestamps = false;

    public static function aujourdhui(): string
    {
        return now(self::FUSEAU)->toDateString();
    }
}
