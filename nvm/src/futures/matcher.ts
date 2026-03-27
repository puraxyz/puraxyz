/**
 * Futures matcher — matches buy/sell capacity futures orders
 * when strike prices cross.
 *
 * Stub: checks for matching pairs in the orderbook and returns
 * potential matches. Actual execution (kind-31920 publication)
 * is left to the caller.
 */

import type { OrderbookEntry, FuturesOrderbook } from './orderbook.js';

export interface FuturesMatch {
  buyOrder: OrderbookEntry;
  sellOrder: OrderbookEntry;
  executionPriceMsats: number;
  capacityUnits: number;
}

/**
 * Find matching buy/sell pairs for a skill type.
 *
 * A match happens when a buy order's strike price >= a sell order's
 * strike price. Execution price is the midpoint.
 */
export function findMatches(
  orderbook: FuturesOrderbook,
  skillType: string,
): FuturesMatch[] {
  const orders = orderbook.ordersForSkill(skillType);

  // Separate into buy and sell sides
  // Convention: 'buy' tag means buyer wants capacity, 'sell' means provider offers it
  const buys = orders.filter((o) =>
    o.eventId.startsWith('b'), // placeholder heuristic — real version checks tags
  );
  const sells = orders.filter((o) => !buys.includes(o));

  // Sort: buys by descending price, sells by ascending price
  buys.sort((a, b) => b.priceMsats - a.priceMsats);
  sells.sort((a, b) => a.priceMsats - b.priceMsats);

  const matches: FuturesMatch[] = [];
  let bi = 0;
  let si = 0;

  while (bi < buys.length && si < sells.length) {
    const buy = buys[bi]!;
    const sell = sells[si]!;

    if (buy.priceMsats >= sell.priceMsats) {
      const executionPrice = Math.round(
        (buy.priceMsats + sell.priceMsats) / 2,
      );
      const capacityUnits = Math.min(buy.capacity, sell.capacity);

      matches.push({
        buyOrder: buy,
        sellOrder: sell,
        executionPriceMsats: executionPrice,
        capacityUnits,
      });
      bi++;
      si++;
    } else {
      break; // no more crosses
    }
  }

  return matches;
}
