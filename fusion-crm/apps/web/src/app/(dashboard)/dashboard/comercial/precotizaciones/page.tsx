"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import PrecotizacionesView from './PrecotizacionesView';

export default function PrecotizacionesPage() {
  const navigate = useNavigate();

  const handleOpenInCotizador = (quote: any) => {
    if (quote?.id) {
      navigate(`/dashboard/cotizador?preQuoteId=${quote.id}`);
    } else {
      navigate('/dashboard/cotizador');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 p-4 md:p-8 pb-16">
      <PrecotizacionesView onOpenInCotizador={handleOpenInCotizador} />
    </div>
  );
}
