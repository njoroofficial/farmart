import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, ShieldCheck, Smartphone, Building2, Truck, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice, getPrimaryImage, KENYAN_COUNTIES } from '../data/mockData';
import { Order } from '../data/mockData';

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






