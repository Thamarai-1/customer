export class TextNormalizer {
  /**
   * Normalizes text by converting to lowercase, collapsing whitespace,
   * removing basic markdown characters, and trimming.
   */
  static normalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[*_#`~[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a simplified canonical representation of message text for duplicate comparison.
   */
  static canonicalize(text: string): string {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }
}
