import os

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("import { AuthProvider } from './contexts/AuthContext';", "import { AuthProvider } from './contexts/AuthContext';\nimport { CartProvider } from './contexts/CartContext';")
content = content.replace("<AuthProvider>", "<AuthProvider>\n      <CartProvider>")
content = content.replace("</AuthProvider>", "  </CartProvider>\n    </AuthProvider>")

with open('src/App.tsx', 'w') as f:
    f.write(content)
