<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meeting_participants', function (Blueprint $table) {
            $table->index(['meeting_id', 'role', 'status', 'left_at'], 'mp_meeting_role_status_left_idx');
        });

        Schema::table('meetings', function (Blueprint $table) {
            $table->index(['status', 'started_at'], 'meetings_status_started_idx');
        });
    }

    public function down(): void
    {
        Schema::table('meeting_participants', function (Blueprint $table) {
            $table->dropIndex('mp_meeting_role_status_left_idx');
        });

        Schema::table('meetings', function (Blueprint $table) {
            $table->dropIndex('meetings_status_started_idx');
        });
    }
};
