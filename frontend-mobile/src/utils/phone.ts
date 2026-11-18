// Concatena el prefijo de país con el número, que debe llegar ya recortado.
export function buildPhoneWithDialCode(dialCode: string, phoneNumber: string): string {
  return `${dialCode}${phoneNumber}`;
}
