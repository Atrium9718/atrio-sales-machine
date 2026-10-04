import { db } from '../src/db';
import { products } from '../src/db/schema';
import { eq } from 'drizzle-orm';

const images: Record<string, string> = {
  "Tarjetas de Presentación Pro": "https://images.unsplash.com/photo-1589330694653-066fc3e595b0?q=80&w=800&auto=format&fit=crop",
  "Volantes Promocionales Media Carta": "https://images.unsplash.com/photo-1563205797-17eb910405ec?q=80&w=800&auto=format&fit=crop",
  "Pendón Publicitario Roll-Up": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=800&auto=format&fit=crop",
  "Etiquetas Adhesivas Troqueladas": "https://images.unsplash.com/photo-1588636171929-e58f00db1e08?q=80&w=800&auto=format&fit=crop",
  "Separador de Libros Personalizado": "https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?q=80&w=800&auto=format&fit=crop",
  "Cajas Personalizadas Premium": "https://images.unsplash.com/photo-1607344645866-009c320b63e0?q=80&w=800&auto=format&fit=crop",
  "Carpetas Corporativas con Bolsillo": "https://images.unsplash.com/photo-1616423640778-28d1b53229bd?q=80&w=800&auto=format&fit=crop"
};

async function main() {
  const allProducts = await db.select().from(products);
  
  for (const prod of allProducts) {
    const matchedUrl = images[prod.name];
    if (matchedUrl) {
      await db.update(products).set({ imageUrl: matchedUrl }).where(eq(products.id, prod.id));
      console.log(`Updated ${prod.name}`);
    }
  }
  console.log("Done seeding images.");
  process.exit(0);
}
main();
