import { useSearchParams, Link } from 'react-router';
import { CheckCircle, Package, ArrowRight, Home, Phone, MapPin, CreditCard } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice, getPrimaryImage } from '../data/mockData';

const PAYMENT_LABELS: Record<string, string> = {
  mpesa:            'M-Pesa',
  bank_transfer:    'Bank Transfer',
  cash_on_delivery: 'Cash on Delivery',
};

export function PaymentSuccessPage() {
  const [params]  = useSearchParams();
  const orderId   = params.get('orderId') || '';
  const { orders } = useApp();

  // Look up the order from context state
  const order = orders.find(o => o.id === orderId);

  return (
    <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-[#D8EAD1] flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-12 h-12 text-[#2D6A4F]" />
          </div>
          <h1 className="text-[#1B2D1B] mb-2" style={{ fontWeight: 800, fontSize: '1.75rem' }}>Order Placed! 🎉</h1>
          <p className="text-gray-500 text-sm">
            Your order has been successfully placed. The farmer will review and confirm it shortly.
          </p>
        </div>

        {/* Order details card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-5">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-[#F0F7F4] flex items-center justify-center">
              <Package className="w-5 h-5 text-[#2D6A4F]" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Order Reference</p>
              <p className="text-[#1B2D1B] font-mono text-sm" style={{ fontWeight: 700 }}>
                {orderId.toUpperCase() || 'ORD-000'}
              </p>
            </div>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700" style={{ fontWeight: 600 }}>
              Pending
            </span>
          </div>

          {/* Order items */}
          {order && (
            <>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3" style={{ fontWeight: 600 }}>Items Ordered</p>
              <div className="space-y-2.5 mb-4">
                {order.items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <img src={getPrimaryImage(item.animal)} alt={item.animal.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#1B2D1B] truncate" style={{ fontWeight: 600 }}>{item.animal.name}</p>
                      <p className="text-xs text-gray-400">{item.animal.breed.name}</p>
                    </div>
                    <p className="text-sm text-[#2D6A4F] shrink-0" style={{ fontWeight: 700 }}>
                      {formatPrice(item.price_at_purchase)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Order meta */}
              <div className="space-y-2.5 text-sm border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-500 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Payment</span>
                  <span style={{ fontWeight: 600 }}>{PAYMENT_LABELS[order.payment_method] || order.payment_method}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-500 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" /> Delivery</span>
                  <span className="text-right" style={{ fontWeight: 600 }}>
                    {order.delivery_county}, Kenya
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Contact</span>
                  <span style={{ fontWeight: 600 }}>{order.buyer_phone}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-800" style={{ fontWeight: 700 }}>Total Amount</span>
                  <span className="text-[#2D6A4F]" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </>
          )}

          {!order && (
            <div className="space-y-2.5 text-sm">
              {[
                { label: 'Status',       value: 'Pending Confirmation', color: 'text-amber-600' },
                { label: 'Date',         value: new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Notification', value: 'Sent to your registered phone' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={item.color ? item.color : 'text-[#1B2D1B]'} style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="bg-[#F0F7F4] rounded-2xl p-5 mb-6">
          <p className="text-sm text-[#1B2D1B] mb-3" style={{ fontWeight: 700 }}>What happens next?</p>
          <ol className="space-y-2">
            {[
              'The farmer reviews your order within 24 hours',
              'You receive confirmation via SMS to your registered phone',
              'The farmer contacts you to arrange delivery logistics',
              'Payment is processed based on your selected payment method',
            ].map((step, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                <span className="w-5 h-5 rounded-full bg-[#2D6A4F] text-white text-xs flex items-center justify-center shrink-0 mt-0.5" style={{ fontWeight: 600 }}>
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="text-xs text-[#2D6A4F] mt-3" style={{ fontWeight: 600 }}>
            📞 The farmer will contact you on your registered phone within 24 hours.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link to="/marketplace"
            className="flex items-center justify-center gap-2 bg-[#2D6A4F] text-white py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
            style={{ fontWeight: 600 }}>
            Continue Shopping <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/"
            className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm hover:bg-white transition-colors">
            <Home className="w-4 h-4" /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
