import { calculateBestPrice } from './calculateBestPrice';

describe('calculateBestPrice', () => {
  const product = { price: 10000, id: 'prod1' };

  it('should return default price if no offers provided', () => {
    const result = calculateBestPrice(product, []);
    expect(result.hasOffer).toBe(false);
    expect(result.effectivePrice).toBe(10000);
  });

  it('should calculate percent discount without cap', () => {
    const offers = [{ id: '1', type: 'PERCENT', value: 10 }];
    const result = calculateBestPrice(product, offers);
    expect(result.hasOffer).toBe(true);
    expect(result.discountAmount).toBe(1000);
    expect(result.effectivePrice).toBe(9000);
  });

  it('should calculate percent discount with cap', () => {
    const offers = [{ id: '1', type: 'PERCENT', value: 10, maxDiscount: 500 }];
    const result = calculateBestPrice(product, offers);
    expect(result.discountAmount).toBe(500);
    expect(result.effectivePrice).toBe(9500);
  });

  it('should calculate flat discount', () => {
    const offers = [{ id: '1', type: 'FLAT', value: 2000 }];
    const result = calculateBestPrice(product, offers);
    expect(result.discountAmount).toBe(2000);
    expect(result.effectivePrice).toBe(8000);
  });

  it('should apply the single best offer among multiple', () => {
    const offers = [
      { id: '1', type: 'FLAT', value: 1500 },
      { id: '2', type: 'PERCENT', value: 20, maxDiscount: 1000 } // 1000 discount
    ];
    const result = calculateBestPrice(product, offers);
    expect(result.discountAmount).toBe(1500);
    expect(result.appliedOffer.id).toBe('1');
  });

  it('should ignore expired offers', () => {
    const past = new Date(Date.now() - 10000).toISOString();
    const offers = [{ id: '1', type: 'FLAT', value: 1000, validTill: past }];
    const result = calculateBestPrice(product, offers);
    expect(result.hasOffer).toBe(false);
  });

  it('should ignore offers below minOrderValue', () => {
    const offers = [{ id: '1', type: 'FLAT', value: 1000, minOrderValue: 20000 }];
    const result = calculateBestPrice(product, offers);
    expect(result.hasOffer).toBe(false);
  });

  it('should not allow discount greater than price', () => {
    const offers = [{ id: '1', type: 'FLAT', value: 20000 }];
    const result = calculateBestPrice(product, offers);
    expect(result.discountAmount).toBe(10000);
    expect(result.effectivePrice).toBe(0);
  });

  it('should handle missing price or zero price', () => {
    const result = calculateBestPrice({ price: 0 }, [{ id: '1', type: 'FLAT', value: 100 }]);
    expect(result.effectivePrice).toBe(0);
    expect(result.hasOffer).toBe(false);
  });
});
