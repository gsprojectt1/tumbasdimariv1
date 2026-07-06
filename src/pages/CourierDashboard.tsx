import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/auth';
import { useCourier, useAvailableDeliveries, useActiveDelivery } from '../lib/hooks';
import { useRouter } from '../lib/router';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import {
  getRoute,
  formatDistance,
  formatDuration,
  createIcon,
  createDestinationIcon,
  createCourierIcon,
  getCurrentLocation,
} from '../lib/maps';
import { formatRupiah, haversineKm, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Bike, Package, DollarSign, Navigation, MapPin, Store, Home, Clock, Check, Power, Loader2, AlertTriangle, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import type { Delivery } from '../lib/types';

export function CourierDashboard() {
  const { user, profile } = useAuth();
  const { data: courier } = useCourier();
  const { data: available } = useAvailableDeliveries();
  const { data: active } = useActiveDelivery();
  const { navigate } = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<'available' | 'active' | 'history' | 'earnings'>('available');
  const [history, setHistory] = useState<Delivery[]>([]);

  useEffect(() => {
    if (profile?.role !== 'courier') {
      navigate('/');
      return;
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (courier?.status !== 'approved') return;
    (async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('*, order:orders(*, store:stores(*), items:order_items(*))')
        .eq('courier_id', user!.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(20);
      setHistory((data || []) as Delivery[]);
    })();
  }, [courier, user?.id]);

  if (profile?.role !== 'courier') return null;

  if (!courier) return <div className="py-20 text-center text-foreground/50">Memuat...</div>;

  if (courier.status !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <EmptyState
          icon={<Bike size={24} />}
          title="Menunggu verifikasi"
          description="Akun kurirmu sedang diverifikasi admin. Kamu bisa menerima pesanan setelah disetujui."
        />
      </div>
    );
  }

  const earnings = history.reduce((s, d) => {
    const ongkir = d.order?.shipping_cost || 0;
    return s + Math.round(ongkir * 0.7);
  }, 0);

  return (
    <div className="pb-24 md:pb-12 max-w-5xl mx-auto px-4 md:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard Kurir</h1>
          <p className="text-sm text-foreground/50">
            {courier.vehicle_plate} • Rating {courier.rating.toFixed(1)}
          </p>
        </div>
        <button
          onClick={async () => {
            await supabase
              .from('couriers')
              .update({ is_online: !courier.is_online })
              .eq('id', courier.id);
            window.location.reload();
          }}
          className={cn(
            'flex items-center gap-1.5 px-3 h-9 rounded-pill text-xs font-semibold',
            courier.is_online ? 'bg-success/10 text-success' : 'bg-muted text-foreground/50'
          )}
        >
          <Power size={14} /> {courier.is_online ? 'Online' : 'Offline'}
        </button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
        <button onClick={() => navigate('/courier/withdrawal')} className="shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-pill border border-border text-xs font-semibold hover:border-primary">
          <Wallet size={14} /> Tarik Saldo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <StatCard icon={Package} label="Pengiriman" value={String(courier.total_deliveries)} />
        <StatCard icon={DollarSign} label="Pendapatan" value={formatRupiah(earnings)} />
        <StatCard icon={Bike} label="Rating" value={courier.rating.toFixed(1)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto no-scrollbar">
        {(['available', 'active', 'history', 'earnings'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 px-4 h-9 rounded-pill text-xs font-semibold transition-colors',
              tab === t ? 'bg-primary text-white' : 'border border-border'
            )}
          >
            {t === 'available' ? 'Tersedia' : t === 'active' ? 'Aktif' : t === 'history' ? 'Riwayat' : 'Penghasilan'}
          </button>
        ))}
      </div>

      {tab === 'available' && (
        <div className="space-y-2">
          {active && (
            <div className="p-3 rounded-card bg-accent-soft border border-primary/20 text-sm font-semibold text-primary">
              Kamu memiliki pengiriman aktif. Selesaikan dulu.
            </div>
          )}
          {!available || available.length === 0 ? (
            <EmptyState icon={<Package size={24} />} title="Tidak ada pesanan" description="Pesanan baru akan muncul di sini." />
          ) : (
            available.map((d) => (
              <AvailableOrder
                key={d.id}
                delivery={d}
                onAccept={async () => {
                  const { error } = await supabase
                    .from('deliveries')
                    .update({ courier_id: user!.id, status: 'to_seller', accepted_at: new Date().toISOString() })
                    .eq('id', d.id);
                  if (error) toast('Gagal menerima', 'error');
                  else {
                    toast('Pesanan diterima!');
                    setTab('active');
                    window.location.reload();
                  }
                }}
              />
            ))
          )}
        </div>
      )}

      {tab === 'active' &&
        (active ? <ActiveDelivery delivery={active} courierId={user!.id} /> : <EmptyState icon={<Navigation size={24} />} title="Tidak ada pengiriman aktif" />)}

      {tab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <EmptyState icon={<Clock size={24} />} title="Belum ada riwayat" />
          ) : (
            history.map((d) => (
              <div key={d.id} className="p-3 rounded-card border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{d.order?.store?.name || 'Toko'}</span>
                  <span className="text-sm font-bold text-success">
                    {formatRupiah(Math.round((d.order?.shipping_cost || 0) * 0.7))}
                  </span>
                </div>
                <p className="text-xs text-foreground/50 mt-1">{d.order?.buyer_address || ''}</p>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'earnings' && (
        <div className="space-y-4">
          <div className="p-4 rounded-card border border-border">
            <p className="text-xs text-foreground/50">Total Penghasilan</p>
            <p className="text-2xl font-bold text-success">{formatRupiah(earnings)}</p>
          </div>
          <Button fullWidth size="lg" onClick={() => navigate('/courier/withdrawal')}><Wallet size={18} /> Tarik Saldo</Button>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-card border border-border">
      <div className="w-7 h-7 rounded-btn bg-accent-soft flex items-center justify-center mb-1.5">
        <Icon size={14} className="text-primary" />
      </div>
      <p className="text-[10px] text-foreground/50">{label}</p>
      <p className="text-sm font-bold tracking-tight">{value}</p>
    </motion.div>
  );
}

function AvailableOrder({ delivery, onAccept }: { delivery: Delivery; onAccept: () => void }) {
  const order = delivery.order;
  if (!order) return null;
  return (
    <div className="p-4 rounded-card border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold">{order.store?.name}</span>
        <span className="text-sm font-bold text-primary">
          {formatRupiah(Math.round((order.shipping_cost || 0) * 0.7))}
        </span>
      </div>
      <div className="space-y-1 text-xs text-foreground/60">
        <div className="flex items-center gap-1.5">
          <Store size={12} /> {order.store?.city || 'Indonesia'}
        </div>
        <div className="flex items-center gap-1.5">
          <Home size={12} /> {order.buyer_address || 'Alamat pembeli'}
        </div>
        <div className="flex items-center gap-1.5">
          <Package size={12} /> {order.items?.length || 0} produk
        </div>
      </div>
      <Button fullWidth size="sm" className="mt-3" onClick={onAccept}>
        Terima pesanan
      </Button>
    </div>
  );
}

function ActiveDelivery({ delivery, courierId }: { delivery: Delivery; courierId: string }) {
  const toast = useToast();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const courierMarkerRef = useRef<L.Marker | null>(null);
  const storeMarkerRef = useRef<L.Marker | null>(null);
  const buyerMarkerRef = useRef<L.Marker | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [phase, setPhase] = useState(delivery.status);
  const [eta, setEta] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);

  const order = delivery.order;
  const storeLoc = order?.store?.latitude
    ? { lat: order.store.latitude, lng: order.store.longitude! }
    : null;
  const buyerLoc = order?.buyer_latitude
    ? { lat: order.buyer_latitude, lng: order.buyer_longitude }
    : null;

  // Get destination based on phase
  const getDestination = () => {
    if (phase === 'to_seller' || phase === 'at_seller') {
      return storeLoc;
    }
    return buyerLoc;
  };

  // Render route with OSRM
  const renderRoute = async (from: { lat: number; lng: number }, to: { lat: number; lng: number }) => {
    setRouteLoading(true);
    setRouteError(false);

    // Clear existing route
    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    const route = await getRoute(from, to);

    if (route && mapInstance.current) {
      routeLineRef.current = L.polyline(route.geometry, {
        color: '#F26B3A',
        weight: 5,
        opacity: 0.8,
      }).addTo(mapInstance.current);

      setEta(formatDuration(route.duration));
      setDistance(formatDistance(route.distance));
    } else {
      // Fallback to straight line
      if (mapInstance.current) {
        routeLineRef.current = L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          {
            color: '#F26B3A',
            weight: 5,
            opacity: 0.8,
            dashArray: '10, 10',
          }
        ).addTo(mapInstance.current);
      }
      setRouteError(true);
      setEta(null);
      setDistance(null);
    }

    setRouteLoading(false);
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, {
      center: [-6.2088, 106.8456],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Setup markers and initial route
  useEffect(() => {
    if (!storeLoc || !buyerLoc || !mapInstance.current) return;

    // Clear existing markers
    if (storeMarkerRef.current) storeMarkerRef.current.remove();
    if (buyerMarkerRef.current) buyerMarkerRef.current.remove();

    // Add store marker
    storeMarkerRef.current = L.marker([storeLoc.lat, storeLoc.lng], {
      icon: L.divIcon({
        className: 'store-marker',
        html: `<div style="width: 32px; height: 32px; position: relative;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F26B3A" stroke="#c2410c" stroke-width="1"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    })
      .addTo(mapInstance.current)
      .bindPopup(`<b>Toko:</b> ${order?.store?.name || 'Toko'}`);

    // Add buyer marker
    buyerMarkerRef.current = L.marker([buyerLoc.lat, buyerLoc.lng], {
      icon: createDestinationIcon(),
    })
      .addTo(mapInstance.current)
      .bindPopup('<b>Lokasi Pembeli</b>');

    // Fit bounds to show both markers
    const bounds = L.latLngBounds([
      [storeLoc.lat, storeLoc.lng],
      [buyerLoc.lat, buyerLoc.lng],
    ]);
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });

    // Get current position and start routing
    getCurrentLocation()
      .then((pos) => {
        const courierLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };

        // Add courier marker
        if (courierMarkerRef.current) courierMarkerRef.current.remove();
        courierMarkerRef.current = L.marker([courierLoc.lat, courierLoc.lng], {
          icon: createCourierIcon(),
        })
          .addTo(mapInstance.current!)
          .bindPopup('<b>Lokasi Kamu</b>');

        // Render route to destination
        const dest = getDestination();
        if (dest) {
          renderRoute(courierLoc, dest);
        }
      })
      .catch(() => {
        toast('Tidak bisa mendapatkan lokasi', 'error');
        setRouteLoading(false);
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // GPS tracking
  useEffect(() => {
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;

        // Publish to DB
        await supabase.from('delivery_tracking').insert({
          delivery_id: delivery.id,
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0,
        });

        // Update marker
        if (courierMarkerRef.current) {
          courierMarkerRef.current.setLatLng([latitude, longitude]);
          if (mapInstance.current) {
            mapInstance.current.panTo([latitude, longitude], { animate: true });
          }
        }

        // Auto-arrival detection
        const dest = getDestination();
        if (dest) {
          const dist = haversineKm(latitude, longitude, dest.lat, dest.lng) * 1000;
          if (dist < 50) {
            if (phase === 'to_seller') {
              await supabase
                .from('deliveries')
                .update({ status: 'at_seller', phase: 'to_buyer' })
                .eq('id', delivery.id);
              setPhase('at_seller');
              toast('Tiba di toko! Ambil pesanan.');
            } else if (phase === 'to_buyer') {
              await supabase
                .from('deliveries')
                .update({ status: 'at_buyer', phase: 'completed' })
                .eq('id', delivery.id);
              setPhase('at_buyer');
              toast('Tiba di tujuan!');
            }
          }
        }
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Refresh route every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (courierMarkerRef.current && mapInstance.current) {
        const pos = courierMarkerRef.current.getLatLng();
        const dest = getDestination();
        if (dest) renderRoute({ lat: pos.lat, lng: pos.lng }, dest);
      }
    }, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sellerLoc, buyerLoc]);

  const advancePhase = async () => {
    if (phase === 'at_seller') {
      await supabase
        .from('deliveries')
        .update({ status: 'to_buyer', phase: 'to_buyer' })
        .eq('id', delivery.id);
      setPhase('to_buyer');
      // Notify buyer and seller
      await supabase.from('notifications').insert([
        { user_id: delivery.order?.buyer_id, type: 'delivery', title: 'Kurir dalam perjalanan', body: 'Pesananmu sedang diantar ke lokasi tujuan' },
        { user_id: delivery.order?.store?.seller_id, type: 'delivery', title: 'Pesanan diambil kurir', body: 'Kurir telah mengambil pesanan dan menuju pembeli' },
      ]);
      // Re-render route to buyer
      if (courierMarkerRef.current && buyerLoc) {
        const pos = courierMarkerRef.current.getLatLng();
        renderRoute({ lat: pos.lat, lng: pos.lng }, buyerLoc);
      }
    } else if (phase === 'at_buyer') {
      await supabase
        .from('deliveries')
        .update({ status: 'completed', phase: 'completed', completed_at: new Date().toISOString() })
        .eq('id', delivery.id);
      await supabase
        .from('couriers')
        .update({ total_deliveries: (courier as any).total_deliveries + 1 })
        .eq('user_id', courierId);
      // Notify buyer and seller
      await supabase.from('notifications').insert([
        { user_id: delivery.order?.buyer_id, type: 'delivery', title: 'Pesanan tiba', body: 'Pesananmu telah tiba di lokasi tujuan' },
        { user_id: delivery.order?.store?.seller_id, type: 'delivery', title: 'Pengiriman selesai', body: 'Pesanan telah sampai ke pembeli' },
      ]);
      toast('Pengiriman selesai!');
      window.location.reload();
    }
  };

  const phaseLabel: Record<string, string> = {
    to_seller: 'Menuju toko',
    at_seller: 'Di toko',
    to_buyer: 'Menuju pembeli',
    at_buyer: 'Tiba di tujuan',
    completed: 'Selesai',
  };

  const dest = getDestination();

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-card border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold">{phaseLabel[phase] || phase}</span>
          {eta && distance && (
            <span className="text-xs font-semibold text-primary">
              ETA {eta} • {distance}
            </span>
          )}
        </div>
        <div className="h-64 rounded-card border border-border overflow-hidden relative">
          <div ref={mapRef} className="w-full h-full" />
          {routeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
          {routeError && !routeLoading && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-btn bg-warning/10 border border-warning/30 text-warning text-xs font-medium">
              <AlertTriangle size={12} />
              Rute garis lurus
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-card border border-border">
        <p className="text-sm font-bold mb-2">Detail</p>
        <div className="space-y-1.5 text-xs text-foreground/60">
          <div className="flex items-center gap-2">
            <Store size={14} /> {order?.store?.name} — {order?.store?.city}
          </div>
          <div className="flex items-center gap-2">
            <Home size={14} /> {order?.buyer_address}
          </div>
          <div className="flex items-center gap-2">
            <Package size={14} /> {order?.items?.length || 0} produk
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (dest) {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${dest.lat},${dest.lng}&travelmode=driving`,
                '_blank'
              );
            }
          }}
        >
          <Navigation size={16} /> Buka Google Maps
        </Button>
        {(phase === 'at_seller' || phase === 'at_buyer') && (
          <Button fullWidth onClick={advancePhase}>
            <Check size={16} /> {phase === 'at_seller' ? 'Pesanan diambil' : 'Selesaikan'}
          </Button>
        )}
      </div>
    </div>
  );
}
