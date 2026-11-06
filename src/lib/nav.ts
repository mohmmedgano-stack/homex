/** Ask the app to leave a product page (header/bottom-nav "home", categories…). */
export const closeProductPage = () => window.dispatchEvent(new CustomEvent('homex:close-product'));
