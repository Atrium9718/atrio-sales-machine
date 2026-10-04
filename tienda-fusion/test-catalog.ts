import { db } from './src/db';
import { categories } from './src/db/schema';
import { eq } from 'drizzle-orm';
async function test() {
  const all = await db.select().from(categories).where(eq(categories.active, true));
  console.log(all);
}
test().catch(console.error);
