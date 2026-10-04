/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { CmsProvider } from './contexts/CmsContext';
import AdminLayout from './admin/Layout';

import DashboardPage from './admin/dashboard/DashboardPage';
import TemplatesPage from './admin/templates/TemplatesPage';
import OrdersPage from './admin/orders/OrdersPage';
import SettingsPage from './admin/settings/SettingsPage';
import BannersPage from './admin/banners/BannersPage';
import CatalogPage from './admin/catalog/CatalogPage';
import ProductBuilderPage from './admin/catalog/ProductBuilderPage';
import ImpositionPage from './admin/imposition/ImpositionPage';
import PricingRulesAdminPage from './admin/settings/PricingRulesAdminPage';
import B2BAdminPage from './admin/settings/B2BAdminPage';
import MarketingAdminPage from './admin/marketing/MarketingAdminPage';
import FinanceAdminPage from './admin/finance/FinanceAdminPage';
import MediaLibraryPage from './admin/media/MediaLibraryPage';
import SeoManagerPage from './admin/seo/SeoManagerPage';
import ProductPage from './storefront/ProductPage';
import CanvasEditor from './storefront/editor/CanvasEditor';
import StorefrontLayout from './storefront/StorefrontLayout';
import CartPage from './storefront/CartPage';
import CheckoutPage from './storefront/CheckoutPage';
import HomePage from './storefront/HomePage';
import CategoryPage from './storefront/CategoryPage';
import OrderTrackingPage from './storefront/OrderTrackingPage';
import CustomerAccountPage from './storefront/CustomerAccountPage';
import BookQuoterPage from './storefront/BookQuoterPage';
import B2BPortalPage from './storefront/B2BPortalPage';
import TermsPage from './storefront/TermsPage';
import PrivacyPage from './storefront/PrivacyPage';
import LegalPage from './storefront/LegalPage';
import SeoLandingTemplate from './storefront/SeoLandingTemplate';
import DynamicPageRenderer from './storefront/DynamicPageRenderer';

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <CmsProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Storefront Routes */}
              <Route element={<StorefrontLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/categoria/:slug" element={<CategoryPage />} />
                <Route path="/cotizador-libros" element={<BookQuoterPage />} />
                <Route path="/libros" element={<BookQuoterPage />} />
                <Route path="/b2b" element={<B2BPortalPage />} />
                <Route path="/distribuidores" element={<B2BPortalPage />} />
                <Route path="/carrito" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/rastreo" element={<OrderTrackingPage />} />
                <Route path="/mi-cuenta" element={<CustomerAccountPage />} />
                <Route path="/producto/:slug" element={<ProductPage />} />
                <Route path="/diseñador/:slug" element={<CanvasEditor />} />
                
                {/* CMS Dynamic & Preset Pages */}
                <Route path="/nosotros" element={<DynamicPageRenderer presetSlug="nosotros" />} />
                <Route path="/tecnologia" element={<DynamicPageRenderer presetSlug="tecnologia" />} />
                <Route path="/guia-archivos" element={<DynamicPageRenderer presetSlug="guia-archivos" />} />
                <Route path="/alianza-atrio" element={<DynamicPageRenderer presetSlug="alianza-atrio" />} />
                <Route path="/mayoristas" element={<DynamicPageRenderer presetSlug="mayoristas" />} />
                <Route path="/p/:slug" element={<DynamicPageRenderer />} />

                <Route path="/terminos" element={<TermsPage />} />
                <Route path="/privacidad" element={<PrivacyPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/l/:slug" element={<SeoLandingTemplate />} />
              </Route>

              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="banners" element={<BannersPage />} />
                <Route path="catalog" element={<CatalogPage />} />
                <Route path="catalog/new" element={<ProductBuilderPage />} />
                <Route path="catalog/builder" element={<ProductBuilderPage />} />
                <Route path="catalog/:id" element={<ProductBuilderPage />} />
                <Route path="pricing-rules" element={<PricingRulesAdminPage />} />
                <Route path="imposition" element={<ImpositionPage />} />
                <Route path="b2b" element={<B2BAdminPage />} />
                <Route path="marketing" element={<MarketingAdminPage />} />
                <Route path="media" element={<MediaLibraryPage />} />
                <Route path="seo" element={<SeoManagerPage />} />
                <Route path="templates" element={<TemplatesPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="users" element={<SettingsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="finance" element={<FinanceAdminPage />} />
              </Route>

            </Routes>
          </BrowserRouter>
        </CmsProvider>
      </CartProvider>
    </AuthProvider>
  );
}
