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
    
