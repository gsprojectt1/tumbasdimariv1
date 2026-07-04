import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from '../lib/router';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { getRoute, formatDistance, formatDuration, createDestinationIcon, createCourierIcon } from '../lib/maps';
import { formatRupiah, timeAgo, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/EmptyState';
import { MapPin, Store, Home, MessageCircle, Truck, Check, Clock, Navigation, AlertTriangle, Loader2, Package } from 'lucide-react';
import type { Order, Delivery, DeliveryTracking } from '../lib/types';
import L from 'leaflet';

const steps = [
  { key: 'paid', label: 'Pesanan diterima', icon: Check },
  { key: 'accepted', label: 'Menuju toko', icon: Store },
  { key: 'picked_up', label: 'Pesanan diambil', icon: Truck },
  { key: 'on_the_way', label: 'Dalam perjalanan', icon: Truck },
  { key: 'arrived', label: 'Tiba', icon: MapPin },
  { key: 'completed', label: 'Selesai', icon: Check },
];

export function OrderTrackingPage() {
  const { id } = useParams();
  const { navigate } = useRouter();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [tracking, setTracking] = useState<DeliveryTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [routeLoading, setRouteLoading] = useState(true);
  const [routeError, setRouteError] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const storeMarker = useRef<L.Marker | null>(null);
  const buyerMarker = useRef<L.Marker | null>(null);
  const courierMarker = useRef<L.Marker | null>(null);
  const routeLine = useRef<L.Polyline | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => { setLoadError(true); setLoading(false); }, 10000);
    (async () => {
      try {
        const { data: ord, error: oErr } = await supabase
          .from('orders')
          .select('*, store:stores(*), items:order_items(*)')
          .eq('id', id)
          .maybeSingle();
        if (oErr) throw oErr;
        setOrder(ord as Order | null);
        const { data: del } = await supabase
          .from('deliveries')
          .select('*')
          .eq('order_id', id)
          .maybeSingle();
        setDelivery(del as Delivery | null);
      } catch {
        setLoadError(true);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    })();
    return () => clearTimeout(timeout);
  }, [id]);

  // Realtime: subscribe to order status changes
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` },
        (payload) => setOrder(payload.new as Order))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Realtime: subscribe to delivery tracking
  useEffect(() => {
    if (!delivery?.id) return;
    const channel = supabase
      .channel(`tracking-${delivery.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'delivery_tracking', filter: `delivery_id=eq.${delivery.id}` },
        (payload) => setTracking(payload.new as DeliveryTracking))
      .subscribe();
    (async () => {
      const { data } = await supabase
        .from('delivery_tracking')
        .select('*')
        .eq('delivery_id', delivery.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setTracking(data as DeliveryTracking);
    })();
    return () => { supabase.removeChannel(channel); };
  }, [delivery]);

  const isCourierDelivery = order?.delivery_type === 'courier' && !!order?.courier_id;
  const isSelfPickup = order?.delivery_type === 'self_pickup';
  const isSellerDelivery = order?.delivery_type === 'seller_delivery';
  const showMap = isCourierDelivery;

  // Initialize Leaflet map only when needed
  useEffect(() => {
    if (!showMap || !mapRef.current || mapInstance.current) return;

    const map = L.map(mapRef.current, { center: [-6.2088, 106.8456], zoom: 13, zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, [showMap]);

  // Add markers and route
  useEffect(() => {
    if (!showMap || !order?.store?.latitude || !order?.buyer_latitude || !mapInstance.current) return;

    const storeLoc = { lat: order.store.latitude, lng: order.store.longitude! };
    const buyerLoc = { lat: order.buyer_latitude, lng: order.buyer_longitude! };

    if (storeMarker.current) storeMarker.current.remove();
    if (buyerMarker.current) buyerMarker.current.remove();
    if (routeLine.current) routeLine.current.remove();

    storeMarker.current = L.marker([storeLoc.lat, storeLoc.lng], {
      icon: L.divIcon({
        className: 'store-marker',
        html: `<div style="width: 32px; height: 32px; position: relative;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#F26B3A" stroke="#c2410c" stroke-width="1"/><circle cx="12" cy="9" r="3" fill="white"/></svg></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32],
      }),
    }).addTo(mapInstance.current).bindPopup(`<b>Toko:</b> ${order.store.name}`);

    buyerMarker.current = L.marker([buyerLoc.lat, buyerLoc.lng], { icon: createDestinationIcon() })
      .addTo(mapInstance.current).bindPopup('<b>Lokasi Tujuan</b>');

    const bounds = L.latLngBounds([[storeLoc.lat, storeLoc.lng], [buyerLoc.lat, buyerLoc.lng]]);
    mapInstance.current.fitBounds(bounds, { padding: [50, 50] });

    // Timeout for route loading
    const routeTimeout = setTimeout(() => { setRouteError(true); setRouteLoading(false); }, 10000);
    setRouteLoading(true);
    setRouteError(false);

    getRoute(storeLoc, buyerLoc)
      .then((route) => {
        clearTimeout(routeTimeout);
        if (route && mapInstance.current) {
          routeLine.current = L.polyline(route.geometry, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(mapInstance.current);
          setRouteInfo({ distance: formatDistance(route.distance), duration: formatDuration(route.duration) });
        } else {
          routeLine.current = L.polyline([[storeLoc.lat, storeLoc.lng], [buyerLoc.lat, buyerLoc.lng]], { color: '#2563eb', weight: 5, opacity: 0.8, dashArray: '10, 10' }).addTo(mapInstance.current);
          setRouteError(true);
        }
      })
      .catch(() => {
        clearTimeout(routeTimeout);
        setRouteError(true);
        if (mapInstance.current) {
          routeLine.current = L.polyline([[storeLoc.lat, storeLoc.lng], [buyerLoc.lat, buyerLoc.lng]], { color: '#2563eb', weight: 5, opacity: 0.8, dashArray: '10, 10' }).addTo(mapInstance.current);
        }
      })
      .finally(() => setRouteLoading(false));

    return () => clearTimeout(routeTimeout);
  }, [order, showMap]);

  // Update courier marker
  useEffect(() => {
    if (!tracking || !mapInstance.current || !showMap) return;
    const pos: [number, number] = [tracking.latitude, tracking.longitude];
    if (!courierMarker.current) {
      courierMarker.current = L.marker(pos, { icon: createCourierIcon() }).addTo(mapInstance.current).bindPopup('<b>Lokasi Kurir</b>');
    } else {
      courierMarker.current.setLatLng(pos);
    }
    mapInstance.current.panTo(pos);
  }, [tracking, showMap]);

  if (loading) return <Spinner className="py-20" />;
  if (loadError) return (
    <div className="py-20 text-center">
      <p className="text-foreground/50 mb-3">Gagal memuat pesanan</p>
      <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
    </div>
  );
  if (!order) return <div className="py-20 text-center text-foreground/50">Pesanan tidak ditemukan</div>;

  const currentStepIdx = steps.findIndex((s) => s.key === order.status);
  const progress = currentStepIdx >= 0 ? ((currentStepIdx + 1) / steps.length) * 100 : 0;

  return (
    <div className="pb-24 md:pb-12 max-w-3xl mx-auto px-4 md:px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight mb-1">Lacak Pesanan</h1>
      <p className="text-sm text-foreground/50 mb-4">
        {timeAgo(order.created_at)} • {formatRupiah(order.total)}
      </p>

      {/* Map - only for courier delivery with courier assigned */}
      {showMap && (
        <div className="h-56 rounded-card border border-border overflow-hidden bg-muted mb-4 relative">
          <div ref={mapRef} className="w-full h-full" />
          {routeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
              <Loader2 className="animate-spin text-primary" size={24} />
            </div>
          )}
          {routeError && !routeLoading && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-btn bg-warning/10 border border-warning/30 text-warning text-xs font-medium">
              <AlertTriangle size={12} /> Rute garis lurus
            </div>
          )}
        </div>
      )}

      {/* No map for self_pickup / seller_delivery */}
      {(isSelfPickup || isSellerDelivery) && (
        <div className="p-4 rounded-card border border-border mb-4 bg-accent-soft/30 flex items-center gap-3">
          {isSelfPickup ? <Store size={20} className="text-primary" /> : <Package size={20} className="text-primary" />}
          <div>
            <p className="text-sm font-bold">{isSelfPickup ? 'Ambil Sendiri' : 'Diantar Penjual'}</p>
            <p className="text-xs text-foreground/50">{isSelfPickup ? 'Ambil pesanan langsung di toko' : 'Pesanan diantar oleh penjual'}</p>
          </div>
        </div>
      )}

      {/* Waiting for courier */}
      {order.delivery_type === 'courier' && !order.courier_id && (
        <div className="p-4 rounded-card border border-border mb-4 flex items-center gap-3">
          <Loader2 className="animate-spin text-primary" size={20} />
          <p className="text-sm font-medium text-foreground/60">Menunggu kurir dijemput...</p>
        </div>
      )}

      {/* Route info */}
      {routeInfo && showMap && (
        <div className="flex items-center gap-4 mb-4 p-3 rounded-card bg-muted">
          <div className="flex items-center gap-2 text-sm"><Navigation size={14} className="text-primary" /><span className="font-semibold">{routeInfo.distance}</span></div>
          <div className="flex items-center gap-2 text-sm"><Clock size={14} className="text-primary" /><span className="font-semibold">{routeInfo.duration}</span></div>
        </div>
      )}

      {/* Progress */}
      <div className="p-4 rounded-card border border-border mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold">Status pengiriman</p>
          {delivery?.status && <span className="text-xs font-semibold text-primary capitalize">{delivery.status.replace('_', ' ')}</span>}
        </div>
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          <div className="absolute left-4 top-0 w-0.5 bg-primary transition-all" style={{ height: `${progress}%` }} />
          <div className="space-y-4">
            {steps.map((s, i) => {
              const done = i <= currentStepIdx;
              return (
                <div key={s.key} className="flex items-center gap-3 relative">
                  <div className={cn('w-8 h-8 rounded-pill flex items-center justify-center shrink-0 z-10 transition-colors', done ? 'bg-primary text-white' : 'bg-muted text-foreground/30')}>
                    <s.icon size={14} />
                  </div>
                  <span className={cn('text-sm font-medium', done ? 'text-foreground' : 'text-foreground/40')}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 rounded-card border border-border mb-4">
        <p className="text-sm font-bold mb-3">Produk ({order.items?.length || 0})</p>
        <div className="space-y-2">
          {order.items?.map((item) => (
            <div key={item.id} className="flex gap-3">
              <img src={item.image_url || 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg?auto=compress&cs=tinysrgb&w=200'} alt="" className="w-12 h-12 rounded-btn border border-border object-cover" />
              <div className="flex-1">
                <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                <p className="text-xs text-foreground/50">{item.quantity}x • {formatRupiah(item.price)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" fullWidth onClick={() => navigate('/chat')}><MessageCircle size={16} /> Chat</Button>
        {tracking && (
          <Button fullWidth onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${tracking.latitude},${tracking.longitude}&travelmode=driving`, '_blank')}>
            <Navigation size={16} /> Buka Maps
          </Button>
        )}
      </div>
    </div>
  );
}
