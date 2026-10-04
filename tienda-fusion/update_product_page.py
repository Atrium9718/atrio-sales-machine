import os

with open('src/storefront/ProductPage.tsx', 'r') as f:
    content = f.read()

# Add useCart import
if 'useCart' not in content:
    content = content.replace("import { useParams, Link } from 'react-router-dom';", "import { useParams, Link, useNavigate } from 'react-router-dom';\nimport { useCart } from '../contexts/CartContext';")

# Add useCart inside component
if 'const { cartCount }' not in content and 'const { addToCart }' not in content:
    content = content.replace("const { slug } = useParams<{ slug: string }>();", "const { slug } = useParams<{ slug: string }>();\n  const navigate = useNavigate();\n  const { addToCart } = useCart();")

# We need a file input ref and handler
if 'const fileInputRef' not in content:
    content = content.replace("const [isQuoting, setIsQuoting] = useState(false);", "const [isQuoting, setIsQuoting] = useState(false);\n  const fileInputRef = useRef<HTMLInputElement>(null);")

if 'const { slug }' in content and 'import { useRef' not in content:
    content = content.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';")

# Let's add the handleAddToCart method
add_to_cart_fn = """
  const handleAddToCart = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!product || !quote) return;
    const file = e.target.files?.[0];
    if (!file) return;

    // Generate options string
    const optionsStr = product.attributes.map((attr: any) => {
      const selectedId = selectedOptions[attr.id];
      const val = attr.values.find((v: any) => v.id === selectedId);
      return val ? val.label : '';
    }).filter(Boolean).join(' • ');

    addToCart({
      productId: product.id,
      name: product.name,
      options: optionsStr,
      quantity: quantity,
      price: quote.total_cop,
      image: product.imageUrl,
      design: file.name,
      file: file
    });
    
    navigate('/carrito');
  };
"""

content = content.replace("const handleQuantityChange = (delta: number) => {", add_to_cart_fn + "\n  const handleQuantityChange = (delta: number) => {")

# Replace "Subir PDF y Pagar" button in both desktop and mobile views
content = content.replace(
"""<button 
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-slate-900/20"
                disabled={isQuoting}
              >
                <UploadCloud size={20} />
                Subir PDF y Pagar
              </button>""",
"""<button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-full flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-slate-900/20"
                disabled={isQuoting}
              >
                <UploadCloud size={20} />
                Subir Archivo y Comprar
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.ai,.psd,.jpg,.png" onChange={handleAddToCart} />"""
)

# Replace in mobile too
content = content.replace(
"""<button className="bg-slate-900 text-white p-3.5 rounded-full shadow-md shadow-slate-900/20"> 
               <UploadCloud size={18} />
            </button>""",
"""<button onClick={() => fileInputRef.current?.click()} className="bg-slate-900 text-white p-3.5 rounded-full shadow-md shadow-slate-900/20"> 
               <UploadCloud size={18} />
            </button>"""
)

with open('src/storefront/ProductPage.tsx', 'w') as f:
    f.write(content)
