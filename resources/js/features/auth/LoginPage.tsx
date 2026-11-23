import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericCaptcha } from '@/components/ui/NumericCaptcha';
import { useAuth } from './useAuth';
import { extractErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';

const schema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const pushToast = useToastStore((s) => s.push);

  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await login({
        ...values,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer,
      });
      pushToast('Berhasil masuk.', 'success');
      navigate('/beranda', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal masuk. Periksa email, kata sandi, dan angka CAPTCHA.');
      setError('password', { message: msg });
      setCaptchaRefresh((n) => n + 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <div className="mb-6 space-y-1.5">
        <h1 className="font-display text-2xl font-bold">Masuk ke Meetingkeun</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Lanjutkan untuk membuat ruang atau melihat jadwalmu.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@contoh.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <NumericCaptcha
          captchaId={captchaId}
          answer={captchaAnswer}
          onCaptchaChange={setCaptchaId}
          onAnswerChange={setCaptchaAnswer}
          refreshSignal={captchaRefresh}
        />

        <Button type="submit" size="lg" className="w-full" loading={isLoggingIn}>
          Masuk
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        Belum punya akun?{' '}
        <Link to="/daftar" className="font-medium text-[var(--moss)] dark:text-[var(--moss-light)] hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </div>
  );
}
