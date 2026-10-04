import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  User, 
  Search, 
  LogOut, 
  MapPin, 
  Phone, 
  Mail, 
  Home, 
  Grid, 
  Printer, 
  Truck, 
  Package, 
  BookOpen, 
  Menu, 
  X, 
  ChevronRight, 
  ChevronDown,
  Building2, 
  PenTool, 
  MessageCircle, 
  ShieldCheck, 
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useCms } from '../contexts/CmsContext';
import TopPromoBar from './components/TopPromoBar';

import PromoPopupModal from './components/PromoPopupModal';

export default function StorefrontLayout() {
  const { user, isAdmin, login, logout, isLoggingIn, loginError, clearLoginError } = useAuth();
  const { cartCount } = useCart();
  const { config } = useCms();
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');


  // Close mobile drawer and dropdown when route changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
    setIsUserDropdownOpen(false);
  }, [location.pathname]);

  // Click outside to close user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileDrawerOpen]);

  const isProductPage = location.pathname.startsWith('/producto/');
  const isDesignerPage = location.pathname.startsWith('/diseñador/');
  const hideBottomNav = isProductPage || isDesignerPage;

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
    return isActive
      ? "text-teal-600 flex flex-col items-center justify-center flex-1 py-1 font-bold transition-all"
      : "text-slate-500 hover:text-teal-600 flex flex-col items-center justify-center flex-1 py-1 font-medium transition-colors";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/categoria/todas?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileDrawerOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f2f2] flex flex-col font-sans selection:bg-teal-400 selection:text-slate-950 overflow-x-hidden">
      {/* Top Promotional Bar (Managed from Banners Admin) */}
      <TopPromoBar />

      {/* Aviso cuando el inicio de sesión con Google falla */}
      {loginError && (
        <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md bg-white border border-red-200 shadow-xl rounded-2xl p-4 flex items-start gap-3">
          <span className="text-red-600 text-sm font-bold flex-1">{loginError}</span>
          <button onClick={clearLoginError} className="text-slate-400 hover:text-slate-700 shrink-0" aria-label="Cerrar aviso">
            <X size={18} />
          </button>
        </div>
      )}

      {/* HEADER PRINCIPAL: barra utilitaria + panel blanco con esquina cortada */}
      <header className="sticky top-0 z-40 bg-[#f2f2f2]/90 backdrop-blur-md pb-3">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">

          {/* Barra utilitaria */}
          <div className="hidden md:flex items-center justify-between h-10 text-[11px] font-semibold tracking-wide text-slate-600 uppercase">
            <div className="flex items-center gap-2">
              <span className="bg-white rounded-md px-2.5 py-1 text-slate-900">COP $</span>
              <span className="bg-white rounded-md px-2.5 py-1 text-slate-900">Español</span>
              <span className="normal-case tracking-normal text-slate-500 ml-2 hidden lg:inline">Envíos a toda Colombia · Despachos diarios</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link to="/rastreo" className="hover:text-slate-950 transition-colors">Rastrear pedido</Link>
              <Link to="/b2b" className="hover:text-slate-950 transition-colors">Portal B2B</Link>
              <Link to="/privacidad" className="hover:text-slate-950 transition-colors">Privacidad</Link>
              <a href="https://wa.me/573110000000" target="_blank" rel="noreferrer" className="hover:text-slate-950 transition-colors">Contacto</a>
            </nav>
          </div>

          {/* Panel principal */}
          <div className="relative mt-2 md:mt-0">
            {/* Fondo blanco con chaflán (en una capa aparte para no recortar el menú desplegable) */}
            <div className="absolute inset-0 bg-white rounded-[22px] sm:rounded-[28px] cut-tl cut-md pointer-events-none" aria-hidden="true" />

            <div className="relative">
              <div className="flex items-center gap-2 sm:gap-4 h-16 sm:h-[84px] px-3 sm:px-8">
                {/* Menú móvil */}
                <button
                  type="button"
                  onClick={() => setIsMobileDrawerOpen(true)}
                  className="lg:hidden p-2 text-slate-800 hover:bg-[#f2f2f2] rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Abrir menú"
                >
                  <Menu size={22} />
                </button>

                {/* Logo */}
                <Link to="/" className="flex items-center gap-2.5 group shrink-0">
                  {config.branding.logoLightUrl ? (
                    <img src={config.branding.logoLightUrl} alt={config.branding.siteName} className="h-9 sm:h-11 w-auto object-contain" />
                  ) : (
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center">
                      <span className="absolute left-0 top-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-teal-400" />
                      <Printer size={24} strokeWidth={2.2} className="relative text-slate-950 translate-x-1 translate-y-1" />
                    </div>
                  )}
                  <div className="flex flex-col leading-[1.05]">
                    <span className="font-bold text-base sm:text-lg tracking-tight text-slate-950 uppercase">
                      {(config.branding.siteName || 'Fusión').split(' ')[0]}
                    </span>
                    <span className="font-bold text-[11px] sm:text-sm tracking-tight text-slate-950 uppercase">
                      {config.branding.siteName ? config.branding.siteName.split(' ').slice(1, 3).join(' ') || 'Gráfica' : 'Gráfica'}
                    </span>
                  </div>
                </Link>

                {/* Buscador */}
                <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6 relative items-center">
                  <span className="absolute left-1.5 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-[0_1px_4px_rgba(0,0,0,0.06)] pointer-events-none">
                    <Search size={17} className="text-slate-900" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar productos"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-14 pr-4 py-3 bg-[#f2f2f2] rounded-full text-sm text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-400 transition-all"
                  />
                </form>

                <div className="flex-1 md:hidden" />

                {/* Acciones */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
                  <Link
                    to="/cotizador-libros"
                    className="hidden lg:flex w-11 h-11 rounded-full border border-stone-200 hover:border-slate-900 items-center justify-center text-slate-900 transition-colors"
                    title="Cotizador de libros"
                  >
                    <BookOpen size={19} />
                  </Link>

                  <Link
                    to="/carrito"
                    className="relative w-11 h-11 rounded-full border border-stone-200 hover:border-slate-900 flex items-center justify-center text-slate-900 transition-colors"
                    title="Ver carrito"
                    aria-label="Carrito"
                  >
                    <ShoppingCart size={19} />
                    {cartCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-teal-400 text-slate-950 text-[11px] font-bold min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full border-2 border-white">
                        {cartCount}
                      </span>
                    )}
                  </Link>

                  {user ? (
                    <div className="relative shrink-0" ref={userDropdownRef}>
                      <button
                        onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                        className="flex items-center gap-2.5 pl-1 lg:pl-3 pr-1 py-1 rounded-full hover:bg-[#f2f2f2] transition-colors"
                      >
                        <span className="hidden lg:inline text-sm text-slate-500">
                          Hola, <span className="text-slate-950 font-semibold">{(user.displayName || 'Cliente').split(' ')[0]}</span>
                        </span>
                        {user.photoURL ? (
                          <img src={user.photoURL} alt="Perfil" className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center text-sm font-bold">
                            {user.email?.[0].toUpperCase()}
                          </div>
                        )}
                        <ChevronDown size={16} className={`hidden lg:block text-slate-700 transition-transform ${isUserDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                  {/* ACCOUNT DROPDOWN MENU */}
                  {isUserDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 animate-scale-in">
                      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50/80 rounded-t-2xl">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-slate-900 truncate">{user.displayName || 'Cliente Registrado'}</p>
                          {isAdmin && (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-teal-600 text-white px-1.5 py-0.5 rounded-md">
                              ADMIN
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">{user.email}</p>
                      </div>

                      <div className="py-1">
                        {isAdmin && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsUserDropdownOpen(false)}
                            className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-teal-950 bg-teal-50 hover:bg-teal-100 transition-colors border-y border-teal-200/80 my-1"
                          >
                            <div className="flex items-center gap-2.5">
                              <Printer size={16} className="text-teal-700" />
                              <span>Panel de Taller / Admin</span>
                            </div>
                            <ChevronRight size={14} className="text-teal-700" />
                          </Link>
                        )}

                        <Link 
                          to="/mi-cuenta" 
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
                        >
                          <Package size={16} className="text-teal-600" />
                          <span>Mis Pedidos & Re-órdenes</span>
                        </Link>

                        <Link 
                          to="/cotizador-libros" 
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
                        >
                          <BookOpen size={16} className="text-teal-600" />
                          <span>Cotizador de Libros & Revistas</span>
                        </Link>

                        <Link 
                          to="/b2b" 
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
                        >
                          <Building2 size={16} className="text-teal-600" />
                          <span>Portal B2B Distribuidores</span>
                        </Link>

                        <Link 
                          to="/rastreo" 
                          onClick={() => setIsUserDropdownOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                        >
                          <Truck size={16} className="text-slate-400" />
                          <span>Rastrear mi Pedido</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-stone-100">
                        <button 
                          onClick={() => {
                            setIsUserDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                        >
                          <LogOut size={16} className="text-rose-500" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </div>
                    </div>
                  )}
                    </div>
                  ) : (
                    <button
                      onClick={() => login()}
                      disabled={isLoggingIn}
                      className="flex items-center justify-center sm:justify-start gap-2 h-11 w-11 sm:w-auto sm:pl-1.5 sm:pr-4 rounded-full bg-slate-950 hover:bg-slate-800 text-white disabled:opacity-60 transition-colors"
                      aria-label="Iniciar sesión"
                    >
                      <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><User size={16} /></span>
                      <span className="text-sm font-semibold hidden sm:inline">{isLoggingIn ? 'Ingresando…' : 'Ingresar'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Segunda fila: categorías + contacto (escritorio) */}
              <div className="hidden lg:flex items-center justify-between border-t border-stone-200 h-14 px-8">
                <nav className="flex items-center h-full">
                  {[
                    { label: 'Papelería', to: '/categoria/papeleria-comercial' },
                    { label: 'Publicidad', to: '/categoria/publicidad-volantes' },
                    { label: 'Gran formato', to: '/categoria/gran-formato' },
                    { label: 'Etiquetas', to: '/categoria/etiquetas-adhesivos' },
                    { label: 'Empaques', to: '/categoria/empaques-cajas' },
                    { label: 'Libros', to: '/cotizador-libros' },
                  ].map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={`mr-8 text-[15px] font-medium transition-colors ${location.pathname === item.to ? 'text-slate-950 underline decoration-teal-400 decoration-[3px] underline-offset-[10px]' : 'text-slate-800 hover:text-slate-950'}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <span className="h-full w-px bg-stone-200 mr-8" />
                  <Link to="/categoria/todas" className="text-[15px] font-semibold text-red-500 hover:text-red-600">Ofertas</Link>
                </nav>
                <div className="flex items-center gap-6 text-[15px] font-semibold text-slate-950">
                  <a href={`mailto:${config.branding.email || 'ventas@fusiongrafica.com.co'}`} className="flex items-center gap-2 hover:text-slate-700">
                    <span>{config.branding.email || 'ventas@fusiongrafica.com.co'}</span>
                    <Mail size={18} className="text-slate-500" />
                  </a>
                  <a href={`tel:${config.branding.phone || '+573110000000'}`} className="flex items-center gap-2 hover:text-slate-700">
                    <span>{config.branding.phone || '+57 311 000 0000'}</span>
                    <Phone size={18} className="text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Buscador móvil */}
              <div className="md:hidden px-3 pb-3">
                <form onSubmit={handleSearch} className="relative flex items-center">
                  <span className="absolute left-1.5 w-8 h-8 rounded-full bg-white flex items-center justify-center pointer-events-none">
                    <Search size={16} className="text-slate-900" />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar productos"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-[#f2f2f2] rounded-full text-sm text-slate-900 placeholder-slate-500 outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER (SIDEBAR DESLIZABLE) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          
          {/* Drawer Container */}
          <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500 text-neutral-950 flex items-center justify-center">
                  <Printer size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <span className="font-black text-lg text-white block leading-none">Fusión</span>
                  <span className="text-[9px] font-bold text-teal-300 uppercase tracking-widest">Gráfica W2P</span>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>

            {/* User status card in drawer */}
            <div className="p-4 bg-slate-50 border-b border-slate-100">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Perfil" className="w-10 h-10 rounded-full border border-slate-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-teal-500 text-neutral-950 flex items-center justify-center font-bold text-sm">
                        {user.email?.[0].toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.displayName || 'Cliente Registrado'}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500" title="Cerrar sesión">
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900">Bienvenido a Fusión</p>
                    <p className="text-[11px] text-slate-500">Inicia sesión para ver tus pedidos</p>
                  </div>
                  <button 
                    onClick={login}
                    disabled={isLoggingIn}
                    className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-60 text-neutral-950 text-xs font-bold rounded-full shadow-xs transition-colors"
                  >
                    {isLoggingIn ? 'Ingresando...' : 'Ingresar'}
                  </button>
                </div>
              )}
            </div>

            {/* Navigation links */}
            <div className="p-4 space-y-1 flex-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-2">
                Navegación Principal
              </p>
              
              <Link 
                to="/" 
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold text-sm transition-colors"
              >
                <Home size={18} className="text-slate-400" />
                <span>Página de Inicio</span>
              </Link>

              <Link 
                to="/categoria/todas" 
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold text-sm transition-colors"
              >
                <Grid size={18} className="text-slate-400" />
                <span>Catálogo Completo</span>
              </Link>

              <Link 
                to="/cotizador-libros" 
                className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-teal-50/70 border border-teal-200/60 text-teal-900 font-bold text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <BookOpen size={18} className="text-teal-600" />
                  <span>Cotizador Libros & Revistas</span>
                </div>
                <span className="bg-teal-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">PRO</span>
              </Link>

              <Link 
                to="/b2b" 
                className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-teal-50/70 border border-teal-200/60 text-teal-950 font-bold text-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 size={18} className="text-teal-600" />
                  <span>Portal B2B Mayoristas</span>
                </div>
                <span className="bg-teal-500 text-neutral-950 text-[9px] font-black px-1.5 py-0.5 rounded-md">DTO</span>
              </Link>

              <Link 
                to="/diseñador/tarjetas-estandar" 
                className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold text-sm transition-colors"
              >
                <PenTool size={18} className="text-slate-400" />
                <span>Editor Canvas Online</span>
              </Link>

              <div className="pt-3">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-2">
                  Gestión y Seguimiento
                </p>

                <Link 
                  to="/rastreo" 
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold text-sm transition-colors"
                >
                  <Truck size={18} className="text-slate-400" />
                  <span>Rastrear Pedido</span>
                </Link>

                <Link 
                  to="/mi-cuenta" 
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-slate-700 hover:bg-teal-50 hover:text-teal-700 font-bold text-sm transition-colors"
                >
                  <Package size={18} className="text-slate-400" />
                  <span>Mis Pedidos & Re-órdenes</span>
                </Link>

                {user && isAdmin && (
                  <Link 
                    to="/admin" 
                    onClick={() => setIsMobileDrawerOpen(false)}
                    className="flex items-center justify-between px-3.5 py-3 rounded-2xl text-teal-900 bg-teal-50 border border-teal-200/80 font-bold text-sm transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Printer size={18} className="text-teal-600" />
                      <span>Panel de Taller / Admin</span>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-teal-600 text-white px-1.5 py-0.5 rounded">ADMIN</span>
                  </Link>
                )}
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
              <a 
                href="https://wa.me/573110000000" 
                target="_blank" 
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
              >
                <MessageCircle size={16} />
                <span>Atención por WhatsApp</span>
              </a>
              <p className="text-[10px] text-center text-slate-400 font-medium">
                Fusión Gráfica • Impresión 300 DPI
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {!hideBottomNav && (
        <nav 
          aria-label="Navegación móvil"
          className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/80 flex items-center h-16 z-40 pb-[max(env(safe-area-inset-bottom),8px)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] rounded-t-3xl"
        >
          <Link to="/" className={navItemClass('/')} aria-label="Inicio">
            <Home size={20} className={location.pathname === '/' ? "fill-teal-600 text-teal-600" : ""} />
            <span className="text-[10px] mt-0.5">Inicio</span>
          </Link>
          
          <Link to="/categoria/todas" className={navItemClass('/categoria')} aria-label="Catálogo">
            <Grid size={20} className={location.pathname.startsWith('/categoria') ? "fill-teal-600 text-teal-600" : ""} />
            <span className="text-[10px] mt-0.5">Catálogo</span>
          </Link>

          <Link to="/cotizador-libros" className={navItemClass('/cotizador-libros')} aria-label="Libros">
            <BookOpen size={20} className={location.pathname === '/cotizador-libros' ? "fill-teal-600 text-teal-600" : ""} />
            <span className="text-[10px] mt-0.5">Libros</span>
          </Link>
          
          <Link to="/carrito" className={navItemClass('/carrito')} aria-label="Carrito">
            <div className="relative">
              <ShoppingCart size={20} className={location.pathname === '/carrito' ? "fill-teal-600 text-teal-600" : ""} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[8px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5">Carrito</span>
          </Link>
          
          <Link to="/mi-cuenta" className={navItemClass('/mi-cuenta')} aria-label="Mi Cuenta">
            <User size={20} className={location.pathname.startsWith('/mi-cuenta') ? "fill-teal-600 text-teal-600" : ""} />
            <span className="text-[10px] mt-0.5">{user ? 'Cuenta' : 'Ingresar'}</span>
          </Link>
        </nav>
      )}

      {/* FOOTER (Diseño Cálido, Moderno y Confiable con Medios de Pago Colombianos) */}
      <footer className="bg-slate-950 text-slate-400 py-12 lg:py-16 mt-auto border-t border-teal-500/20 relative overflow-hidden">
        {/* Glow ambient background lights */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pb-12 border-b border-slate-800">
            
            {/* Columna 1: Marca & Calidad */}
            <div className="space-y-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2.5 text-white">
                {config.branding.logoLightUrl ? (
                  <img src={config.branding.logoLightUrl} alt={config.branding.siteName} className="h-9 w-auto object-contain" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 flex items-center justify-center font-black shadow-md">
                    <Printer size={20} strokeWidth={2.5} />
                  </div>
                )}
                <div>
                  <span className="font-black text-xl tracking-tight text-white block leading-none">
                    {config.branding.siteName || 'FUSIÓN'}
                  </span>
                  <span className="text-[9px] font-black text-teal-400 uppercase tracking-widest">
                    Comunicación Gráfica W2P
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed font-medium text-slate-400">
                Tu imprenta litográfica y Web-to-Print de confianza en Colombia. Especialistas en libros, revistas, papelería corporativa, etiquetas y empaques con acabados prémium.
              </p>
              <div className="flex items-center gap-2 text-xs font-bold text-teal-300 bg-teal-950/60 p-2.5 rounded-xl border border-teal-500/30 w-fit">
                <ShieldCheck size={16} className="text-teal-400" />
                <span>{config.branding.guaranteeBadgeText || '300 DPI CTP • Calidad Litográfica'}</span>
              </div>
            </div>

            {/* Columnas Dinámicas del Footer desde el CMS */}
            {config.footerColumns?.slice(0, 2).map((col) => (
              <div key={col.id}>
                <h3 className="text-white font-extrabold text-sm sm:text-base mb-4 tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                  <span>{col.title}</span>
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
                  {col.links.map((link) => (
                    <li key={link.id}>
                      <Link 
                        to={link.url} 
                        className={`transition-colors flex items-center gap-1.5 ${
                          link.isHighlight ? 'text-teal-400 font-bold hover:text-teal-300' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{link.label}</span>
                        {link.badge && (
                          <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[9px] font-black px-1.5 py-0.2 rounded-md">
                            {link.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Columna 4: Ubicación y Contacto Dinámico */}
            <div>
              <h3 className="text-white font-extrabold text-sm sm:text-base mb-4 tracking-tight flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                <span>Planta & Contacto</span>
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm font-medium">
                <li className="flex items-start gap-2.5">
                  <MapPin size={16} className="text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-200">Planta Litográfica & Oficinas</span>
                    <p className="text-[11px] text-slate-400">
                      {config.branding.address || 'Carrera 23 # 25-18'}, {config.branding.city || 'Manizales'}, {config.branding.department || 'Caldas'}, Colombia
                    </p>
                  </div>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone size={16} className="text-emerald-400 shrink-0" />
                  <a href={`tel:${config.branding.phone || '+573110000000'}`} className="hover:text-emerald-300 font-bold text-slate-200">
                    {config.branding.phone || '+57 (606) 880-0000'}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <div className="w-4 flex justify-center shrink-0">
                    <span className="text-teal-400 font-bold">@</span>
                  </div>
                  <a href={`mailto:${config.branding.email || 'contacto@fusiongrafica.com.co'}`} className="hover:text-teal-300 text-slate-200">
                    {config.branding.email || 'ventas@fusiongrafica.com.co'}
                  </a>
                </li>
                <li className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  📦 Cobertura nacional con guías de envío vía Coordinadora, Servientrega, Inter Rapidísimo y Envía.
                </li>
              </ul>
            </div>

          </div>

          {/* Colombian Payment Badges & Legal Section */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-bold text-slate-300 mr-1">Pagos Seguros:</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">Wompi</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">PSE</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">Bancolombia</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">Nequi</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">Daviplata</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-300">Tarjetas de Crédito</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <Link to="/terminos" className="hover:text-teal-400 transition-colors">Términos</Link>
              <Link to="/privacidad" className="hover:text-teal-400 transition-colors">Privacidad</Link>
              <Link to="/legal" className="hover:text-teal-400 transition-colors">Aviso Legal</Link>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>© {new Date().getFullYear()} {config.branding.siteName || 'Fusión Comunicación Gráfica'}. Todos los derechos reservados. Impreso con pasión en Colombia.</p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Quick Chat Action Button */}
      <aside aria-label="Contacto por WhatsApp" className="fixed bottom-20 md:bottom-6 right-4 z-40">
        <a
          href="https://wa.me/573110000000?text=Hola,%20quisiera%20asesoria%20con%20una%20cotizacion%20de%20impresion"
          target="_blank"
          rel="noreferrer"
          className="group flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white pl-3.5 pr-4 py-3 rounded-full shadow-[0_8px_25px_rgba(16,185,129,0.35)] transition-all hover:scale-105 active:scale-95"
          title="¿Dudas con tu archivo o cotización? Habla con un impresor experto"
        >
          <div className="relative">
            <MessageCircle size={20} className="fill-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-teal-400 rounded-full"></span>
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[11px] font-black leading-none">¿Dudas con tu diseño?</span>
            <span className="text-[9px] text-emerald-100 font-medium">Asesoría Inmediata</span>
          </div>
        </a>
      </aside>

      {/* Global Promotional Popup Modal */}
      <PromoPopupModal />
    </div>
  );
}

