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

const schema = z
  .object({
    name: z.string().min(2, 'Nama minimal 2 karakter.').max(100),
    email: z.string().email('Format email tidak valid.'),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter.'),
    password_confirmation: z.string().min(8, 'Konfirmasi kata sandi wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Konfirmasi kata sandi tidak cocok.',
    path: ['password_confirmation'],
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isRegistering } = useAuth();
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
      await registerUser({
        ...values,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer,
      });
      pushToast('Akun berhasil dibuat.', 'success');
      navigate('/beranda', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal mendaftar. Coba lagi.');
      setError('email', { message: msg });
      setCaptchaRefresh((n) => n + 1);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <div className="mb-6 space-y-1.5">
        <h1 className="font-display text-2xl font-bold">Buat akun baru</h1>
        <p className="text-sm text-[var(--ink-soft)]">
          Gratis untuk membuat ruang meeting dan mengatur jadwal.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nama lengkap"
          type="text"
          autoComplete="name"
          placeholder="Tiyas Frahesta"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Ulangi kata sandi"
          type="password"
          autoComplete="new-password"
          placeholder="Ketik ulang kata sandi"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <NumericCaptcha
          captchaId={captchaId}
          answer={captchaAnswer}
          onCaptchaChange={setCaptchaId}
          onAnswerChange={setCaptchaAnswer}
          refreshSignal={captchaRefresh}
        />

        <Button type="submit" size="lg" className="w-full" loading={isRegistering}>
          Daftar
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--ink-soft)]">
        Sudah punya akun?{' '}
        <Link to="/masuk" className="font-medium text-[var(--moss)] dark:text-[var(--moss-light)] hover:underline">
          Masuk di sini
        </Link>
      </p>
    </div>
  );
}
