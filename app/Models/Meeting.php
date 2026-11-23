<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Hash;

class Meeting extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'host_id',
        'title',
        'description',
        'type',
        'status',
        'scheduled_at',
        'duration_minutes',
        'passcode_hash',
        'lobby_enabled',
        'locked',
        'started_at',
        'ended_at',
    ];

    protected $hidden = [
        'passcode_hash',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
            'lobby_enabled' => 'boolean',
            'locked' => 'boolean',
            'duration_minutes' => 'integer',
        ];
    }

    public function host(): BelongsTo
    {
        return $this->belongsTo(User::class, 'host_id');
    }

    public function participants(): HasMany
    {
        return $this->hasMany(MeetingParticipant::class);
    }

    public function hasPasscode(): bool
    {
        return ! empty($this->passcode_hash);
    }

    public function verifyPasscode(?string $passcode): bool
    {
        if (! $this->hasPasscode()) {
            return true;
        }

        if ($passcode === null || $passcode === '') {
            return false;
        }

        return Hash::check($passcode, $this->passcode_hash);
    }

    public static function generateUniqueCode(): string
    {
        // Unambiguous lowercase alphanumeric characters (excludes 0, o, 1, l)
        $alphabet = '23456789abcdefghijkmnpqrstuvwxyz';
        $maxIndex = strlen($alphabet) - 1;

        do {
            $blocks = [];
            for ($b = 0; $b < 3; $b++) {
                $block = '';
                for ($i = 0; $i < 3; $i++) {
                    $block .= $alphabet[random_int(0, $maxIndex)];
                }
                $blocks[] = $block;
            }
            $code = implode('-', $blocks);
        } while (static::where('code', $code)->exists());

        return $code;
    }
}
