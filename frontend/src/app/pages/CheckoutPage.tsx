import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, ShieldCheck, Smartphone, Building2, Truck, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice, getPrimaryImage, KENYAN_COUNTIES } from '../data/mockData';
import type { Order } from '../data/mockData';
// Type definition for available payment methods
type PaymentMethod = Order['payment_method'];

// Array of available payment methods with icons and descriptions
const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'mpesa',            label: 'M-Pesa',           icon: Smartphone,   desc: 'Pay via Safaricom M-Pesa STK push' },
  { id: 'bank_transfer',    label: 'Bank Transfer',    icon: Building2,    desc: 'Direct bank/Pesalink transfer'      },
  { id: 'cash_on_delivery', label: 'Cash on Delivery', icon: Truck,        desc: 'Pay when animal is delivered'       },
];

export function CheckoutPage() {
  // Get cart data and user info from AppContext
  const { cart, cartTotal, currentUser, clearCart, placeOrder } = useApp();
  const navigate = useNavigate();

  // ✅ SECURITY: Redirect unauthenticated users to login
  if (!currentUser) {
    return navigate('/login', { replace: true });
  }

  // State management
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa'); // Selected payment method
  const [loading, setLoading] = useState(false); // Loading state during order submission
  const [error, setError] = useState<string | null>(null); // Error message display
  
  // Form state for delivery and payment details
  const [form, setForm] = useState({
    address: '',
    county: '',
    phone: currentUser.phone || '',
    mpesaPhone: currentUser.phone || '',
    notes: '',
  });
  // Helper function to update form fields
  const update = (field: string, val: string) => setForm(prev => ({ ...prev, [field]: val }));

  // Validates Kenyan phone number formats
  // Accepts: 07XXXXXXXX, 01XXXXXXXX, +254712345678, etc.
  const isValidPhone = (phone: string) => {
    return /^(07|01|\+2547|\+2541)\d{6,}$/.test(phone);
  };

  // Show empty cart message if no items
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-5xl mb-4">🛒</p>
          <h2 className="text-[#1B2D1B] mb-2" style={{ fontWeight: 700 }}>Your cart is empty</h2>
          <Link to="/marketplace" className="text-[#2D6A4F] hover:underline text-sm">Browse Animals</Link>
        </div>
      </div>
    );
  }

  // Handle order submission
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate the phone number based on selected payment method
    const phoneToValidate = paymentMethod === 'mpesa' ? form.mpesaPhone : form.phone;
    if (!isValidPhone(phoneToValidate)) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }

    setLoading(true);

    // Simulated API delay
    await new Promise(r => setTimeout(r, 1200));

    try {
      // Call placeOrder from AppContext with order details
      const orderId = placeOrder({
        buyer: {
          id: currentUser.id,
          first_name: currentUser.first_name,
          last_name: currentUser.last_name,
          phone: currentUser.phone,
        },
        items: cart.map(item => ({
          id: `oi_${item.id}`,
          animal: item.animal,
          price_at_purchase: item.animal.price,
        })),
        total_amount: cartTotal,
        status: 'pending',
        delivery_address: form.address,
        delivery_county: form.county,
        buyer_phone: phoneToValidate,
        payment_method: paymentMethod,
        notes: form.notes || undefined,
      });

      // Clear cart and navigate to payment success page
      clearCart();
      navigate(`/payment-success?orderId=${orderId}&paymentMethod=${paymentMethod}&total=${cartTotal}`);
    } catch (err) {
      // Display error if order placement fails
      setError('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F7F4EF] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header with back button */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/cart" className="p-2 rounded-lg hover:bg-white transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-[#1B2D1B]" style={{ fontWeight: 700, fontSize: '1.5rem' }}>Checkout</h1>
        </div>

        {/* Buyer info banner - displays current user */}
        <div className="bg-[#F0F7F4] border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-gray-600">
          Ordering as <span className="text-[#2D6A4F]" style={{ fontWeight: 600 }}>{currentUser.first_name} {currentUser.last_name}</span> · {currentUser.email}
        </div>

        {/* Error message display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handlePlaceOrder}>
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column: Delivery and payment forms */}
            <div className="lg:col-span-2 space-y-5">
              {/* Delivery Details Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>Delivery Details</h2>
                <div className="space-y-4">
                  {/* Delivery address input */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>
                      Delivery Address *
                    </label>
                    <input
                    required type="text" value={form.address}
                      onChange={e => update('address', e.target.value)}
                      placeholder="e.g. 123 Westlands Road, Nairobi"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50"
                    />
                  </div>

                  {/* County/Region dropdown */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>
                      Delivery County *
                    </label>
                    <div className="relative">
                      <select
                        required value={form.county} onChange={e => update('county', e.target.value)}
                        className="w-full appearance-none px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50 pr-8"
                      >
                        <option value="">Select your county</option>
                        {KENYAN_COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* General phone number for contact/COD */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>
                      Your Phone Number *
                    </label>
                    <input
                      required type="tel" value={form.phone}
                      onChange={e => update('phone', e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50"
                    />
                    <p className="text-xs text-gray-400 mt-1">Kenyan format: 07XXXXXXXX, 01XXXXXXXX, or +254712345678</p>
                  </div>
                   {/* Optional delivery notes */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1" style={{ fontWeight: 500 }}>
                      Notes (optional)
                    </label>
                    <textarea
                      value={form.notes} onChange={e => update('notes', e.target.value)}
                      placeholder="Any special delivery instructions or requirements..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-gray-50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method Section */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>Payment Method</h2>

                {/* Payment method selector buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                  {PAYMENT_METHODS.map(method => (
                    <button key={method.id} type="button"
                      onClick={() => setPaymentMethod(method.id)}
                      className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all text-left ${
                        paymentMethod === method.id
                          ? 'border-[#2D6A4F] bg-[#F0F7F4]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <method.icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-[#2D6A4F]' : 'text-gray-400'}`} />
                      <div>
                        <p className="text-sm" style={{ fontWeight: 600 }}>{method.label}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{method.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* M-Pesa specific form */}
                {paymentMethod === 'mpesa' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <label className="block text-xs text-gray-600 mb-1.5" style={{ fontWeight: 500 }}>
                      M-Pesa Phone Number *
                    </label>
                    <input
                      required type="tel" value={form.mpesaPhone}
                      onChange={e => update('mpesaPhone', e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full px-3 py-2.5 border border-green-200 rounded-xl text-sm focus:outline-none focus:border-[#2D6A4F] bg-white"
                    />
                    <p className="text-xs text-green-700 mt-2 flex items-center gap-1">
                      <Smartphone className="w-3.5 h-3.5" />
                      You will receive an M-Pesa STK push to complete payment after order confirmation.
                    </p>
                  </div>
                )}

                {/* Bank transfer details */}
                {paymentMethod === 'bank_transfer' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Bank Transfer Details</p>
                    <div className="text-xs text-gray-600 space-y-1.5">
                      <div className="flex justify-between"><span>Bank:</span><span style={{ fontWeight: 600 }}>KCB Kenya</span></div>
                      <div className="flex justify-between"><span>Account Name:</span><span style={{ fontWeight: 600 }}>Farmart Limited</span></div>
                      <div className="flex justify-between"><span>Account Number:</span><span style={{ fontWeight: 600 }}>1234567890</span></div>
                      <div className="flex justify-between"><span>Branch:</span><span style={{ fontWeight: 600 }}>Westlands, Nairobi</span></div>
                      <p className="text-blue-700 mt-2">Use your Order ID as the payment reference (provided after placing order).</p>
                    </div>
                  </div>
                )}

                {/* Cash on delivery instructions */}
                {paymentMethod === 'cash_on_delivery' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800 flex items-start gap-2">
                      <Truck className="w-4 h-4 shrink-0 mt-0.5" />
                       <span>
                        Cash payment will be collected upon delivery. The farmer will contact you to arrange delivery timing and confirm the total amount.
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column: Order summary (sticky) */}
            <div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
                <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>Order Summary</h2>

                {/* Cart items display */}
                <div className="space-y-3 mb-4">
                  {cart.map(item => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                        <img src={getPrimaryImage(item.animal)} alt={item.animal.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#1B2D1B] line-clamp-1" style={{ fontWeight: 600 }}>{item.animal.name}</p>
                        <p className="text-xs text-gray-400">{item.animal.breed.name}</p>
                        <p className="text-xs text-[#2D6A4F]" style={{ fontWeight: 600 }}>{formatPrice(item.animal.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal ({cart.length} items)</span>
                    <span>{formatPrice(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Delivery</span>
                    <span className="text-gray-500 text-xs">Arranged with farmer</span>
                  </div>
                  {/* Total amount */}
                  <div className="flex justify-between text-[#1B2D1B] pt-2 border-t border-gray-100">
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span className="text-[#2D6A4F]" style={{ fontWeight: 800 }}>{formatPrice(cartTotal)}</span>
                  </div>
                </div>

                {/* Place order button */}
                <button type="submit" disabled={loading}
                  className="w-full mt-5 bg-[#2D6A4F] text-white py-3.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors disabled:opacity-70"
                  style={{ fontWeight: 700 }}>
                  {loading ? 'Placing Order...' : `Place Order · ${formatPrice(cartTotal)}`}
                </button>

                {/* Security badge */}
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Secured & encrypted
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}






