<?php

namespace App\Policies;

use App\Models\Meeting;
use App\Models\User;

class MeetingPolicy
{
    public function manage(User $user, Meeting $meeting): bool
    {
        return $user->id === $meeting->host_id;
    }

    public function moderate(User $user, Meeting $meeting): bool
    {
        if ($user->id === $meeting->host_id) {
            return true;
        }

        return $meeting->participants()
            ->where('user_id', $user->id)
            ->where('role', 'cohost')
            ->where('status', 'admitted')
            ->exists();
    }
}
