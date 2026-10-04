import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  async createInvoice(orderData: any): Promise<{ invoiceId: string; status: string; pdfUrl: string }> {
    this.logger.log(`Iniciando conexión con API de Siigo/Alegra para la orden: ${orderData.orderId}`);
    
    // Simular latencia de API externa
    await new Promise(resolve => setTimeout(resolve, 1500));

    this.logger.log(`Factura electrónica DIAN generada exitosamente para la orden: ${orderData.orderId}`);

    return {
      invoiceId: `FE-${Math.floor(Math.random() * 100000)}`,
      status: 'ISSUED',
      pdfUrl: `https://facturacion.siigo.com/mock/fe-${orderData.orderId}.pdf`
    };
  }
}
