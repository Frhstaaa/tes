import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from './Input';

interface NumericCaptchaProps {
  captchaId: string;
  answer: string;
  onCaptchaChange: (id: string) => void;
  onAnswerChange: (answer: string) => void;
  refreshSignal?: number;
  error?: string;
}

export function NumericCaptcha({
  answer,
  onCaptchaChange,
  onAnswerChange,
  refreshSignal = 0,
  error,
}: NumericCaptchaProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const loadCaptcha = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ captcha_id: string; image_data_url: string }>('/captcha');
      onCaptchaChange(res.data.captcha_id);
      setImageUrl(res.data.image_data_url);
      onAnswerChange('');
    } finally {
      setLoading(false);
    }
  }, [onCaptchaChange, onAnswerChange]);

  useEffect(() => {
    loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshSignal]);

  return (
    <div className="space-y-2.5 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-[var(--ink-soft)]">
          Cocokkan angka pada foto
        </span>
        <button
          type="button"
          onClick={loadCaptcha}
          disabled={loading}
          aria-label="Muat ulang angka verifikasi"
          className="inline-flex min-h-[32px] items-center gap-1.5 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] px-2.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper-2)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
          <span>Ganti foto</span>
        </button>
      </div>

      <div className="flex items-center justify-center overflow-hidden rounded-[8px] border border-[var(--line)] bg-[#ECE6D8] p-1">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Foto angka verifikasi"
            className="h-[56px] w-[190px] select-none object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-[56px] w-[190px] items-center justify-center text-xs text-[#4A5750]">
            Memuat foto angka...
          </div>
        )}
      </div>

      <Input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={5}
        placeholder="Ketik 5 angka di atas"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value.replace(/\D/g, '').slice(0, 5))}
        error={error}
        className="bg-[var(--paper)] font-mono tracking-widest"
        required
      />
    </div>
  );
}
