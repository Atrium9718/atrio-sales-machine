import os

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Add imports
import_cart = "import CartPage from './storefront/CartPage';\n"
import_checkout = "import CheckoutPage from './storefront/CheckoutPage';\n"

if 'CartPage' not in content:
    content = content.replace("import HomePage from './storefront/HomePage';", import_cart + import_checkout + "import HomePage from './storefront/HomePage';")

# Add routes
routes = """
            <Route path="/categoria/:slug" element={<CategoryPage />} />
            <Route path="/carrito" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
"""

if '<Route path="/carrito"' not in content:
    content = content.replace('<Route path="/categoria/:slug" element={<CategoryPage />} />', routes.strip())

with open('src/App.tsx', 'w') as f:
    f.write(content)
