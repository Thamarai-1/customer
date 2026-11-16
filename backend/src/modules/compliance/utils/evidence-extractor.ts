export class EvidenceExtractor {
  /**
   * Extracts currency values like $85.50, USD 85.50, $120 from text.
   */
  static extractCurrencyAmounts(text: string): number[] {
    if (!text) return [];
    const regex = /(?:\$|usd\s*|eur\s*|gbp\s*)(\d+(?:\.\d{2})?)/gi;
    const amounts: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        amounts.push(parseFloat(match[1]));
      }
    }
    return amounts;
  }

  /**
   * Extracts percentage numbers like 20%, 50 % from text.
   */
  static extractPercentages(text: string): number[] {
    if (!text) return [];
    const regex = /(\d+)\s*%/g;
    const percentages: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        percentages.push(parseInt(match[1], 10));
      }
    }
    return percentages;
  }

  /**
   * Extracts potential offer codes (e.g., GOLD20OFF, OFFER-XYZ, WELCOME10).
   */
  static extractOfferCodes(text: string): string[] {
    if (!text) return [];
    const regex = /\b[A-Z0-9_-]{5,20}\b/g;
    const matches = text.match(regex) || [];
    // Filter common uppercase words
    const commonWords = new Set(['HELLO', 'DEAR', 'THANKS', 'THANK', 'PLEASE', 'CUSTOMER', 'MEMBER', 'ACCOUNT', 'EMAIL', 'MOBILE', 'DISCOUNT']);
    return matches.filter((m) => !commonWords.has(m) && /[0-9]/.test(m));
  }
}
