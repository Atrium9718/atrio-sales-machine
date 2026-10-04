import os

with open('src/storefront/CheckoutPage.tsx', 'r') as f:
    content = f.read()

# Add useCart import
if 'useCart' not in content:
    content = content.replace("import { Truck, CreditCard, ShieldCheck, ChevronLeft, Info } from 'lucide-react';", "import { Truck, CreditCard, ShieldCheck, ChevronLeft, Info } from 'lucide-react';\nimport { useCart } from '../contexts/CartContext';")

# replace variables
if 'const { items, subtotal, iva } = useCart();' not in content:
    content = content.replace("const navigate = useNavigate();", "const navigate = useNavigate();\n  const { items, subtotal, iva, clearCart } = useCart();")
    
# Delete mock data from CheckoutPage
content = content.replace("""  // Mock data  const subtotal = 325000;  const iva = 61750;""", "")

content = content.replace(
"""  const handlePayment = () => {
    setIsProcessing(true);
    // Simular API a pasarela
    setTimeout(() => {
      setIsProcessing(false);
      alert('Pago Exitoso. Redirigiendo a confirmación...');
      navigate('/');
    }, 2000);
  };""",
"""  const handlePayment = () => {
    setIsProcessing(true);
    // Simular API a pasarela
    setTimeout(() => {
      setIsProcessing(false);
      alert('Pago Exitoso. Redirigiendo a confirmación...');
      clearCart();
      navigate('/');
    }, 2000);
  };"""
)

with open('src/storefront/CheckoutPage.tsx', 'w') as f:
    f.write(content)
