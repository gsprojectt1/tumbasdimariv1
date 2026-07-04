import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase, STORAGE_BUCKET } from './supabase';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactRupiah(value: number): string {
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (value >= 1_000) return `Rp${(value / 1_000).toFixed(0)}rb`;
  return formatRupiah(value);
}

export function formatNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.0', '')}rb`;
  return String(value);
}

export function timeAgo(date: string | Date): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} hari lalu`;
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function haversineKm(
  lat1: number, lng1: number, lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const ONGKIR_PER_KM = 1500;
export const ONGKIR_MIN = 3000;

export function calcOngkir(km: number): number {
  return Math.max(ONGKIR_MIN, Math.round(km * ONGKIR_PER_KM));
}

export function calcEta(km: number): number {
  // assume 30 km/h average in city
  return Math.max(5, Math.round((km / 30) * 60));
}

export function discountPercent(price: number, original: number): number {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function compressImage(file: File, maxSize = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        } else if (height > maxSize) {
          width = (width * maxSize) / height;
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  const compressed = await compressImage(file);
  const blob = await (await fetch(compressed)).blob();
  const fileName = `${path}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
