import { db } from './src/db';
import { products } from './src/db/schema';
async function main() {
  const p = await db.select().from(products);
  p.forEach(prod => {
    console.log(`${prod.name}: ${prod.imageUrl ? prod.imageUrl.substring(0, 30) + '...' : 'NULL'}`);
  });
  process.exit(0);
}
main();
