import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Font registration would go here (e.g. Roboto)

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
  },
  logo: {
    width: 100,
  },
  title: {
    fontSize: 24,
    color: '#1e3a8a', // blue-900
    fontWeight: 'bold',
  },
  quoteMeta: {
    alignItems: 'flex-end',
  },
  metaText: {
    color: '#666',
    marginTop: 3,
  },
  clientSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  clientBox: {
    backgroundColor: '#f9fafb',
    padding: 10,
    width: '48%',
    borderRadius: 4,
  },
  label: {
    fontSize: 8,
    color: '#9ca3af',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  valueBold: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  table: {
    width: 'auto',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#333',
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  colDesc: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colUnit: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right', fontWeight: 'bold' },
  
  totals: {
    alignItems: 'flex-end',
    marginBottom: 40,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 5,
  },
  totalsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    borderTopWidth: 2,
    borderTopColor: '#333',
    paddingTop: 5,
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
    marginTop: 'auto',
  },
  conditions: {
    width: '50%',
  },
  signature: {
    width: '50%',
    alignItems: 'center',
    paddingTop: 20,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: '#999',
    width: 150,
    marginBottom: 5,
  },
  watermark: {
    position: 'absolute',
    top: '30%',
    left: '20%',
    opacity: 0.1,
    transform: 'rotate(-45deg)',
    fontSize: 80,
    color: 'red',
  }
});

interface QuotePDFProps {
  quote: any; // In a real app, type this strictly
}

export const QuotePDF = ({ quote }: QuotePDFProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      
      {quote.status === 'DRAFT' && (
        <Text style={styles.watermark}>BORRADOR</Text>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>FUSION.</Text>
          <Text style={styles.metaText}>Impresión & Empaques</Text>
          <Text style={styles.metaText}>NIT: 900.123.456-7</Text>
        </View>
        <View style={styles.quoteMeta}>
          <Text style={{ fontSize: 18, color: '#9ca3af', marginBottom: 5 }}>COTIZACIÓN</Text>
          <Text style={{ fontSize: 14, fontWeight: 'bold' }}>{quote.number}</Text>
          <Text style={styles.metaText}>Fecha: {quote.issueDate}</Text>
          <Text style={styles.metaText}>Validez: 15 días</Text>
        </View>
      </View>

      {/* Client Info */}
      <View style={styles.clientSection}>
        <View style={styles.clientBox}>
          <Text style={styles.label}>Preparado para</Text>
          <Text style={styles.valueBold}>{quote.clientName}</Text>
          <Text>{quote.contactName}</Text>
        </View>
        <View style={[styles.clientBox, { alignItems: 'flex-end' }]}>
          <Text style={styles.label}>Ejecutivo de Cuenta</Text>
          <Text style={styles.valueBold}>{quote.ownerName || 'Carlos Gómez'}</Text>
          <Text>carlos@fusion.com</Text>
        </View>
      </View>

      {/* Table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.label]}>Descripción</Text>
          <Text style={[styles.colQty, styles.label]}>Cant.</Text>
          <Text style={[styles.colUnit, styles.label]}>V. Unit</Text>
          <Text style={[styles.colTotal, styles.label]}>Total</Text>
        </View>
        
        {quote.items.map((item: any, i: number) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <View style={styles.colDesc}>
              <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{item.description}</Text>
              {(item.size || item.materials) && (
                <Text style={{ color: '#666', fontSize: 8 }}>
                  Tamaño: {item.size} • Material: {item.materials}
                </Text>
              )}
            </View>
            <Text style={styles.colQty}>{item.quantity}</Text>
            <Text style={styles.colUnit}>${item.unitPrice.toLocaleString()}</Text>
            <Text style={styles.colTotal}>${item.lineTotal.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totals} wrap={false}>
        <View style={styles.totalsRow}>
          <Text>Subtotal</Text>
          <Text>${quote.subtotal.toLocaleString()}</Text>
        </View>
        <View style={styles.totalsRow}>
          <Text>IVA</Text>
          <Text>${quote.vatAmount.toLocaleString()}</Text>
        </View>
        <View style={styles.totalsTotal}>
          <Text>TOTAL</Text>
          <Text>${quote.total.toLocaleString()}</Text>
        </View>
      </View>

      {/* Footer / Conditions */}
      <View style={styles.footer} wrap={false}>
        <View style={styles.conditions}>
          <Text style={[styles.label, { color: '#333', fontWeight: 'bold' }]}>Condiciones Comerciales</Text>
          <Text style={{ fontSize: 8, color: '#666', marginTop: 5 }}>
            • Tiempo de entrega: {quote.deliveryTime || '5-7 días hábiles'}{'\n'}
            • Forma de pago: {quote.paymentTerms || '50% anticipo, 50% entrega'}{'\n'}
            • Los precios no incluyen costos de envío fuera de la ciudad.
          </Text>
        </View>
        <View style={styles.signature}>
          <View style={styles.signatureLine}></View>
          <Text style={{ fontWeight: 'bold', fontSize: 10 }}>Firma de Aprobación</Text>
          <Text style={{ fontSize: 8, color: '#999' }}>Representante Autorizado</Text>
        </View>
      </View>
      
      {/* Page Numbers */}
      <Text style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', color: '#999', fontSize: 8 }} render={({ pageNumber, totalPages }) => (
        `Página ${pageNumber} de ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);
