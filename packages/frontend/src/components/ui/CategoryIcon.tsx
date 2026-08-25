import {
  Baby, Bus, CreditCard, Dumbbell, GraduationCap, HeartPulse, Home,
  Landmark, Package, ShieldCheck, Shirt, ShoppingCart, Smartphone, Tv, Zap,
} from 'lucide-react';

const categoryIconMap = {
  housing: Home,
  energy: Zap,
  food: ShoppingCart,
  insurance: ShieldCheck,
  credit: CreditCard,
  subscription: Tv,
  tax: Landmark,
  transport: Bus,
  health: HeartPulse,
  childcare: Baby,
  sport: Dumbbell,
  education: GraduationCap,
  clothing: Shirt,
  telecom: Smartphone,
  other: Package,
};

export function CategoryIcon({ category, size = 15 }: { category: string; size?: number }) {
  const Icon = categoryIconMap[category as keyof typeof categoryIconMap] || Package;
  return <Icon size={size} aria-hidden="true" />;
}
