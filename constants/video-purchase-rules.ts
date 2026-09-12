/** Paid videos that are part of a category pack cannot be bought individually. */
export function allowsIndividualVideoPurchase(
  title: string,
  isInCategoryPack: (t: string) => boolean
): boolean {
  return !isInCategoryPack(title);
}
