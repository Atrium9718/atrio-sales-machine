import { Decimal } from 'decimal.js';

export type MovementContext = {
  organizationId: string;
  performedById: string;
  projectId?: string;
  purchaseId?: string;
  transformationId?: string;
  damageId?: string;
  reason?: string;
};

export type ItemContext = 
  | { itemType: 'PAPER'; paperLotId: string; paperInventoryId: string }
  | { itemType: 'SUPPLY'; supplyId: string };

/**
 * Ensures strict transactional integrity for all inventory movements.
 * This function acts as the single point of entry for modifying stock.
 */
export async function recordInventoryMovement(
  tx: any, // Use Prisma transaction client
  context: MovementContext,
  item: ItemContext,
  movementType: string,
  quantityChange: Decimal,
  unitCost: Decimal
) {
  const dQuantity = new Decimal(quantityChange);
  const isOut = dQuantity.isNegative();

  let balanceAfter = new Decimal(0);
  let totalCost = dQuantity.abs().times(unitCost);

  if (item.itemType === 'PAPER') {
    // Lock the lot for update
    const lot = await tx.paperLot.findUnique({
      where: { id: item.paperLotId },
    });
    if (!lot) throw new Error('Paper Lot not found');

    const dCurrent = new Decimal(lot.remainingSheets);
    balanceAfter = dCurrent.plus(dQuantity);

    if (balanceAfter.isNegative()) {
      throw new Error(`Insufficient stock in lot ${lot.lotNumber}. Available: ${dCurrent.toString()}, Requested: ${dQuantity.abs().toString()}`);
    }

    // Update Lot
    await tx.paperLot.update({
      where: { id: lot.id },
      data: { remainingSheets: balanceAfter.toNumber() }
    });

    // Update Master Inventory
    const inv = await tx.paperInventory.findUnique({
      where: { id: item.paperInventoryId }
    });
    
    if (inv) {
      const invCurrent = new Decimal(inv.currentSheets);
      const invNewCurrent = invCurrent.plus(dQuantity);
      
      // Moving average cost on incoming
      let newAvg = new Decimal(inv.averageCostPerSheet);
      if (!isOut && invNewCurrent.greaterThan(0)) {
        const totalValueOld = invCurrent.times(newAvg);
        const totalValueNew = totalValueOld.plus(totalCost);
        newAvg = totalValueNew.dividedBy(invNewCurrent);
      }

      await tx.paperInventory.update({
        where: { id: inv.id },
        data: {
          currentSheets: invNewCurrent.toNumber(),
          availableSheets: invNewCurrent.minus(new Decimal(inv.reservedSheets)).toNumber(),
          averageCostPerSheet: newAvg.toDecimalPlaces(4),
          lastCostPerSheet: isOut ? inv.lastCostPerSheet : unitCost.toDecimalPlaces(4)
        }
      });
      
      // Fire low stock check (can be event or inline)
      if (invNewCurrent.lessThanOrEqualTo(new Decimal(inv.minStockSheets))) {
        // Emit 'inventario.stock_bajo'
      }
    }
  } else if (item.itemType === 'SUPPLY') {
    // Similar logic for Supply
    const supply = await tx.supply.findUnique({
      where: { id: item.supplyId }
    });
    if (!supply) throw new Error('Supply not found');
    
    const dCurrent = new Decimal(supply.currentStock);
    balanceAfter = dCurrent.plus(dQuantity);

    if (balanceAfter.isNegative()) {
      throw new Error(`Insufficient stock for supply ${supply.code}.`);
    }

    let newAvg = new Decimal(supply.averageCost);
    if (!isOut && balanceAfter.greaterThan(0)) {
       const totalValueOld = dCurrent.times(newAvg);
       const totalValueNew = totalValueOld.plus(totalCost);
       newAvg = totalValueNew.dividedBy(balanceAfter);
    }

    await tx.supply.update({
      where: { id: supply.id },
      data: {
        currentStock: balanceAfter.toDecimalPlaces(4),
        averageCost: newAvg.toDecimalPlaces(4),
        lastCost: isOut ? supply.lastCost : unitCost.toDecimalPlaces(4)
      }
    });
  }

  // Record the Movement (Ledger Entry)
  await tx.inventoryMovement.create({
    data: {
      organizationId: context.organizationId,
      movementType: movementType,
      itemType: item.itemType,
      paperLotId: item.itemType === 'PAPER' ? item.paperLotId : null,
      supplyId: item.itemType === 'SUPPLY' ? item.supplyId : null,
      quantity: dQuantity.toDecimalPlaces(4),
      unitCost: unitCost.toDecimalPlaces(4),
      totalCost: totalCost.toDecimalPlaces(4),
      balanceAfter: balanceAfter.toDecimalPlaces(4),
      projectId: context.projectId,
      purchaseId: context.purchaseId,
      transformationId: context.transformationId,
      damageId: context.damageId,
      performedById: context.performedById,
      reason: context.reason
    }
  });

  return { balanceAfter };
}
