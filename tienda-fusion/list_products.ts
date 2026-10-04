import { db } from './src/db';
import { products } from './src/db/schema';
async function main() {
  const p = await db.select().from(products);
  console.log(JSON.stringify(p.map(x => ({id: x.id, name: x.name})), null, 2));
  process.exit(0);
}
main();
