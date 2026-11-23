/** wa.me needs the number in international form without + or leading zeros (Egypt: 2010…) */
export const waNumber = (n: string) => {
  let d = (n || '').replace(/\D/g, '').replace(/^00/, '');
  if (d.startsWith('0')) d = '2' + d;
  return d;
};
export const waLink = (n: string, text?: string) => `https://wa.me/${waNumber(n)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
