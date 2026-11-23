import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { motionTokens } from '@/lib/motionTokens';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NumericCaptcha } from '@/components/ui/NumericCaptcha';
import { useAuthModalStore } from '@/stores/useAuthModalStore';
import { useAuth } from './useAuth';
import { extractErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
});

const registerSchema = z
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

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function AuthModal() {
  const { open, mode, closeModal, setMode } = useAuthModalStore();
  const navigate = useNavigate();
  const location = useLocation();
  const pushToast = useToastStore((s) => s.push);
  const { login, isLoggingIn, register: registerUser, isRegistering } = useAuth();

  const [captchaId, setCaptchaId] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  const handleClose = () => {
    closeModal();
    if (location.pathname === '/masuk' || location.pathname === '/daftar') {
      navigate('/', { replace: true });
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, location.pathname]);

  // Refresh CAPTCHA whenever mode switches or modal opens
  useEffect(() => {
    if (open) {
      setCaptchaRefresh((n) => n + 1);
      setCaptchaAnswer('');
    }
  }, [open, mode]);

  const handleLogin = async (values: LoginValues) => {
    try {
      await login({
        ...values,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer,
      });
      closeModal();
      pushToast('Berhasil masuk.', 'success');
      navigate('/beranda', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal masuk. Periksa email, kata sandi, dan angka CAPTCHA.');
      loginForm.setError('password', { message: msg });
      setCaptchaRefresh((n) => n + 1);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    try {
      await registerUser({
        ...values,
        captcha_id: captchaId,
        captcha_answer: captchaAnswer,
      });
      closeModal();
      pushToast('Akun berhasil dibuat.', 'success');
      navigate('/beranda', { replace: true });
    } catch (err) {
      const msg = extractErrorMessage(err, 'Gagal mendaftar. Coba lagi.');
      registerForm.setError('email', { message: msg });
      setCaptchaRefresh((n) => n + 1);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={mode === 'login' ? 'Masuk ke Meetingkeun' : 'Daftar akun Meetingkeun'}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
            className="fixed inset-0 bg-[#16211C]/55 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Modal / Mobile Sheet */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{
              duration: motionTokens.duration.normal,
              ease: motionTokens.easing.smooth,
            }}
            className="relative z-10 w-full max-w-md rounded-t-[16px] sm:rounded-[16px] border border-[var(--line)] bg-[var(--paper)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[var(--ink)] max-h-[92dvh] overflow-y-auto sm:p-6"
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <BrandLogo size="sm" />
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup"
                className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] text-[var(--ink-soft)] hover:bg-[var(--paper-2)] hover:text-[var(--ink)]"
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>
            </div>

            {/* Segmented Mode Switcher */}
            <div className="mb-5 grid grid-cols-2 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`relative min-h-[38px] cursor-pointer rounded-[8px] text-sm font-medium transition-colors ${
                  mode === 'login' ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {mode === 'login' && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                    className="absolute inset-0 rounded-[8px] border border-[var(--line)] bg-[var(--paper)]"
                  />
                )}
                <span className="relative z-10">Masuk</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('register')}
                className={`relative min-h-[38px] cursor-pointer rounded-[8px] text-sm font-medium transition-colors ${
                  mode === 'register' ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                {mode === 'register' && (
                  <motion.span
                    layoutId="auth-tab-pill"
                    transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                    className="absolute inset-0 rounded-[8px] border border-[var(--line)] bg-[var(--paper)]"
                  />
                )}
                <span className="relative z-10">Daftar</span>
              </button>
            </div>

            {/* Forms */}
            {mode === 'login' ? (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: motionTokens.duration.fast }}
                onSubmit={loginForm.handleSubmit(handleLogin)}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold">Selamat datang kembali</h2>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Masuk untuk membuat ruang atau mengelola jadwal meeting.
                  </p>
                </div>

                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@contoh.com"
                  error={loginForm.formState.errors.email?.message}
                  {...loginForm.register('email')}
                />
                <Input
                  label="Kata sandi"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  error={loginForm.formState.errors.password?.message}
                  {...loginForm.register('password')}
                />

                <NumericCaptcha
                  captchaId={captchaId}
                  answer={captchaAnswer}
                  onCaptchaChange={setCaptchaId}
                  onAnswerChange={setCaptchaAnswer}
                  refreshSignal={captchaRefresh}
                />

                <Button type="submit" size="lg" className="w-full" loading={isLoggingIn}>
                  Masuk sekarang
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="register-form"
                initial={{ opacity: 0, x: 6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: motionTokens.duration.fast }}
                onSubmit={registerForm.handleSubmit(handleRegister)}
                className="space-y-3.5"
              >
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-bold">Buat akun baru</h2>
                  <p className="text-xs text-[var(--ink-soft)]">
                    Gratis untuk membuat ruang meeting dan mengatur jadwal.
                  </p>
                </div>

                <Input
                  label="Nama lengkap"
                  type="text"
                  autoComplete="name"
                  placeholder="Tiyas Frahesta"
                  error={registerForm.formState.errors.name?.message}
                  {...registerForm.register('name')}
                />
                <Input
                  label="Email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@contoh.com"
                  error={registerForm.formState.errors.email?.message}
                  {...registerForm.register('email')}
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Input
                    label="Kata sandi"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    error={registerForm.formState.errors.password?.message}
                    {...registerForm.register('password')}
                  />
                  <Input
                    label="Ulangi sandi"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Ketik ulang sandi"
                    error={registerForm.formState.errors.password_confirmation?.message}
                    {...registerForm.register('password_confirmation')}
                  />
                </div>

                <NumericCaptcha
                  captchaId={captchaId}
                  answer={captchaAnswer}
                  onCaptchaChange={setCaptchaId}
                  onAnswerChange={setCaptchaAnswer}
                  refreshSignal={captchaRefresh}
                />

                <Button type="submit" size="lg" className="w-full" loading={isRegistering}>
                  Daftar sekarang
                </Button>
              </motion.form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
