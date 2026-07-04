import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, ArrowRight } from 'lucide-react';

const schema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Min 6 karakter'),
});

export function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true);
    try {
      await signIn(data.email, data.password);
      toast('Selamat datang kembali!');
      navigate('/');
    } catch (e: any) {
      toast(e.message || 'Gagal masuk', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-btn bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="text-2xl font-bold tracking-tightest">Tumbas</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Masuk ke akunmu</h1>
            <p className="text-sm text-foreground/50">Belanja mudah, aman, dan cepat.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="nama@email.com"
              icon={<Mail size={16} />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              Masuk <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-sm text-foreground/50">
            Belum punya akun?{' '}
            <button onClick={() => navigate('/register')} className="text-primary font-semibold hover:underline">
              Daftar sekarang
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
