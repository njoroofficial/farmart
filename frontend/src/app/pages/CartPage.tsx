import { Link, useNavigate } from 'react-router';
import { ShoppingCart, Trash2, ArrowRight, MapPin, Scale, Clock, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice, formatAge, getPrimaryImage } from '../data/mockData';

export function CartPage() {
  const { cart, removeFromCart, cartTotal, currentUser } = useApp();
  const navigate = useNavigate();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-[#1B2D1B] mb-2" style={{ fontWeight: 700 }}>Sign in to view your cart</h2>
          <Link to="/login" className="text-[#2D6A4F] hover:underline text-sm">Sign In</Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F4EF] flex items-center justify-center">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🛒</span>
          <h2 className="text-[#1B2D1B] mb-2" style={{ fontWeight: 700 }}>Your cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6">Browse our marketplace and add animals to your cart</p>
          <Link to="/marketplace"
            className="bg-[#2D6A4F] text-white px-6 py-3 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
            style={{ fontWeight: 600 }}>
            Browse Animals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F4EF] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-[#1B2D1B] mb-6" style={{ fontWeight: 700, fontSize: '1.75rem' }}>
          Shopping Cart{' '}
          <span className="text-gray-400 text-lg">({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ── Cart Items ── */}
          <div className="lg:col-span-2 space-y-3">
            {cart.map(item => {
              const a = item.animal;
              const primaryImg = getPrimaryImage(a);
              return (
                <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link to={`/animals/${a.id}`} className="shrink-0">
                      <div className="w-24 h-24 rounded-xl overflow-hidden">
                        <img src={primaryImg} alt={a.name} className="w-full h-full object-cover" />
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 mr-2">
                          <Link to={`/animals/${a.id}`}>
                            <h3 className="text-[#1B2D1B] hover:text-[#2D6A4F] line-clamp-1" style={{ fontWeight: 600 }}>
                              {a.name}
                            </h3>
                          </Link>
                          <p className="text-xs text-gray-400 mb-1">{a.animal_type.name} · {a.breed.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" /> {formatAge(a.age_months)}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Scale className="w-3 h-3" /> {a.weight_kg} kg
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" /> {a.location}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">
                            Farmer: {a.farmer.first_name} {a.farmer.last_name} · {a.farmer.county}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.animal.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors p-1 shrink-0"
                          title="Remove from cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">Added {new Date(item.added_at).toLocaleDateString('en-KE')}</span>
                        <p className="text-[#2D6A4F]" style={{ fontWeight: 700 }}>{formatPrice(a.price)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <Link to="/marketplace" className="flex items-center gap-2 text-sm text-[#2D6A4F] hover:underline pt-1">
              ← Continue Shopping
            </Link>
          </div>

          {/* ── Order Summary ── */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-[#1B2D1B] mb-4" style={{ fontWeight: 700 }}>Order Summary</h2>

              <div className="space-y-2.5 text-sm border-b border-gray-100 pb-4 mb-4">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between text-gray-600">
                    <span className="line-clamp-1 flex-1 mr-2">{item.animal.name}</span>
                    <span style={{ fontWeight: 500 }}>{formatPrice(item.animal.price)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cart.length} items)</span>
                  <span>{formatPrice(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery</span>
                  <span className="text-[#2D6A4F]" style={{ fontWeight: 500 }}>Arranged with farmer</span>
                </div>
                <div className="flex justify-between text-[#1B2D1B] pt-2 border-t border-gray-100">
                  <span style={{ fontWeight: 700 }}>Total</span>
                  <span className="text-[#2D6A4F]" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{formatPrice(cartTotal)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full flex items-center justify-center gap-2 mt-5 bg-[#2D6A4F] text-white py-3.5 rounded-xl text-sm hover:bg-[#235A41] transition-colors"
                style={{ fontWeight: 700 }}
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="bg-[#F0F7F4] rounded-xl p-4 space-y-2">
              {[
                { icon: ShieldCheck, text: 'Secure & encrypted checkout' },
                { icon: MapPin,      text: 'Delivery arranged directly with farmer' },
              ].map(b => (
                <div key={b.text} className="flex items-center gap-2 text-xs text-gray-600">
                  <b.icon className="w-4 h-4 text-[#2D6A4F] shrink-0" /> {b.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
