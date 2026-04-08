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
