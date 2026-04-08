import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { ArrowLeft, ShieldCheck, Smartphone, Building2, Truck, ChevronDown } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatPrice, getPrimaryImage, KENYAN_COUNTIES } from '../data/mockData';
import { Order } from '../data/mockData';

type PaymentMethod = Order['payment_method'];