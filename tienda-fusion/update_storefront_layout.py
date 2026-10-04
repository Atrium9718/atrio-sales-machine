import os

with open('src/storefront/StorefrontLayout.tsx', 'r') as f:
    content = f.read()

# Add import
if 'useCart' not in content:
    content = content.replace("import { useAuth } from '../contexts/AuthContext';", "import { useAuth } from '../contexts/AuthContext';\nimport { useCart } from '../contexts/CartContext';")

# Replace cartCount
if 'const { user, login, logout } = useAuth();' in content:
    content = content.replace("const { user, login, logout } = useAuth();", "const { user, login, logout } = useAuth();\n  const { cartCount } = useCart();")
    
# Replace the absolute badge values
content = content.replace(
    '<span className="absolute -top-1 -right-1 bg-orange-400 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">                    0                  </span>',
    '{cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-400 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white">{cartCount}</span>}'
)

content = content.replace(
    '<span className="absolute -top-1 -right-1 bg-orange-400 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">0</span>',
    '{cartCount > 0 && <span className="absolute -top-1 -right-1 bg-orange-400 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">{cartCount}</span>}'
)

with open('src/storefront/StorefrontLayout.tsx', 'w') as f:
    f.write(content)
