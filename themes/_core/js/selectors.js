/**
 * Copyright since 2007 PrestaShop SA and Contributors
 * PrestaShop is an International Registered Trademark & Property of PrestaShop SA
 *
 * NOTICE OF LICENSE
 *
 * This source file is subject to the Open Software License (OSL 3.0)
 * that is bundled with this package in the file LICENSE.md.
 * It is also available through the world-wide-web at this URL:
 * https://opensource.org/licenses/OSL-3.0
 * If you did not receive a copy of the license and are unable to
 * obtain it through the world-wide-web, please send an email
 * to license@prestashop.com so we can send you a copy immediately.
 *
 * DISCLAIMER
 *
 * Do not edit or add to this file if you wish to upgrade PrestaShop to newer
 * versions in the future. If you wish to customize PrestaShop for your
 * needs please refer to https://devdocs.prestashop.com/ for more information.
 *
 * @author    PrestaShop SA and Contributors <contact@prestashop.com>
 * @copyright Since 2007 PrestaShop SA and Contributors
 * @license   https://opensource.org/licenses/OSL-3.0 Open Software License (OSL 3.0)
 */
import prestashop from 'prestashop';
import $ from 'jquery';

prestashop.selectors = {
  quantityWanted: '#quantity_wanted, .quantity-wanted',
  product: {
    imageContainer: '.images-container, .js-images-container',
    container: '.product-container, .js-product-container',
    availability: '#product-availability, .js-product-availability',
    actions: '.product-actions, .js-product-actions',
    variants: '.product-variants, .js-product-variants',
    refresh: '.product-refresh, .js-product-refresh',
    miniature: '.js-product-miniature',
    minimalQuantity: '.product-minimal-quantity, .js-product-minimal-quantity',
    addToCart: '.product-add-to-cart, .js-product-add-to-cart',
    prices: '.product-prices, .js-product-prices',
    inputCustomization:
      '.product-actions input[name="id_customization"], .js-product-actions .js-product-customization-id',
    customization: '.product-customization, .js-product-customization',
    variantsUpdate: '.product-variants, .js-product-variants',
    discounts: '.product-discounts, .js-product-discounts',
    additionalInfos: '.product-additional-info, .js-product-additional-info',
    details: '#product-details, .product-details, .js-product-details',
    flags: '.product-flags, .js-product-flags',
    context: '.js-product-miniature, .js-product-quickview, .js-product-details',
    quickviewContext: '.quickview, .js-product-miniature, .js-product-quickview',
  },
  listing: {
    quickview: '.quick-view, .js-quick-view',
  },
  checkout: {
    form: '.checkout-step form',
    currentStep: 'js-current-step',
    step: '.checkout-step',
    stepTitle: '.step-title, .js-step-title',
    confirmationSelector: '#payment-confirmation button, .js-payment-confirmation',
    conditionsSelector: '#conditions-to-approve input[type="checkbox"], .js-conditions-to-approve',
    conditionAlertSelector: '.js-alert-payment-conditions',
    additionalInformatonSelector: '.js-additional-information',
    optionsForm: '.js-payment-option-form',
    // eslint-disable-next-line
    termsCheckboxSelector: '#conditions-to-approve input[name="conditions_to_approve[terms-and-conditions]"], .js-conditions-to-approve input[name="conditions_to_approve[terms-and-conditions]"]',
    paymentBinary: '.payment-binary, .js-payment-binary',
    deliveryFormSelector: '#js-delivery',
    summarySelector: '#js-checkout-summary',
    deliveryStepSelector: '#checkout-delivery-step',
    editDeliveryButtonSelector: '.js-edit-delivery',
    deliveryOption: '.delivery-option, .js-delivery-option',
    cartPaymentStepRefresh: '.js-cart-payment-step-refresh',
    editAddresses: '.js-edit-addresses',
    // eslint-disable-next-line
    deliveryAddressRadios: '#delivery-addresses input[type=radio], #invoice-addresses input[type=radio], .js-address-selector input[type=radio]',
    addressItem: '.address-item, .js-address-item',
    addressesStep: '#checkout-addresses-step',
    addressItemChecked: '.address-item:has(input[type=radio]:checked), .js-address-item:has(input[type=radio]:checked)',
    addressError: '.js-address-error',
    notValidAddresses: '#not-valid-addresses, .js-not-valid-addresses',
    invoiceAddresses: '#invoice-addresses, .js-address-selector',
    addressForm: '.js-address-form',
  },
  cart: {
    detailedTotals: '.cart-detailed-totals, .js-cart-detailed-totals',
    summaryItemsSubtotal: '.cart-summary-items-subtotal, .js-cart-summary-items-subtotal',
    summarySubTotalsContainer: '.cart-summary-subtotals-container, .js-cart-summary-subtotals-container',
    summaryTotals: '.cart-summary-totals, .js-cart-summary-totals',
    summaryProducts: '.cart-summary-products, .js-cart-summary-products',
    detailedActions: '.cart-detailed-actions, .js-cart-detailed-actions',
    voucher: '.cart-voucher, .js-cart-voucher',
    overview: '.cart-overview',
    summaryTop: '.cart-summary-top, .js-cart-summary-top',
    productCustomizationId: '#product_customization_id, .js-product-customization-id',
    lineProductQuantity: '.js-cart-line-product-quantity',
  },
};

$(document).ready(() => {
  prestashop.emit('selectorsInit');
});
