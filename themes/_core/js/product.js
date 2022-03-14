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
import $ from 'jquery';
import prestashop from 'prestashop';
import {psGetRequestParameter} from './common';

// Used to be able to abort request if user modify something
const currentRequests = [];

/**
 * Get product update URL from different
 * sources if needed (for compatibility)
 *
 * @return {Promise}
 */
function getProductUpdateUrl(event, eventType, context) {
  let dfd = $.Deferred();
  const $productActions = $('.product-actions', context);
  const $quantityWantedInput = $productActions.find('#quantity_wanted, .quantity-wanted');

  if (prestashop !== null
      && prestashop.urls !== null
      && prestashop.urls.pages !== null
      && prestashop.urls.pages.product !== ''
      && prestashop.urls.pages.product !== null
  ) {
    dfd.resolve(prestashop.urls.pages.product);

    return dfd.promise();
  }
  let formData = {};

  $($productActions.find('form:first').serializeArray()).each((k, v) => {
    formData[v.name] = v.value;
  });

  prestashop.emit('updateProduct.begin', {event, eventType, context});

  $.ajax({
    url: $productActions.find('form:first').attr('action'),
    method: 'POST',
    data: Object.assign(
      {
        ajax: 1,
        action: 'productrefresh',
        quantity_wanted: $quantityWantedInput.val()
      },
      formData
    ),
    dataType: 'json',
    success(data) {
      let productUpdateUrl = data.productUrl;
      prestashop.page.canonical = productUpdateUrl;
      dfd.resolve(productUpdateUrl);
    },
    error(jqXHR, textStatus, errorThrown) {
      dfd.reject({"jqXHR": jqXHR, "textStatus": textStatus, "errorThrown": errorThrown});
    },
    complete() {
      prestashop.emit('updateProduct.end', {event, eventType, context});
    },
  });

  return dfd.promise();
}

/**
 * @param {string} errorMessage
 */
function showErrorNextToAddtoCartButton(context, errorMessage) {
  if (errorMessage === undefined) {
    errorMessage = 'An error occurred while processing your request';
  }

  showError(
      $('#product-availability, .product-availability', context),
      errorMessage
  );
}

/**
 * Update the product html
 *
 * @param {string} event
 * @param {string} eventType
 * @param {string} updateUrl
 */
function updateProduct(event, eventType, context, updateUrl) {
  const $productActions = $('.product-actions', context);
  const $quantityWantedInput = $productActions.find('#quantity_wanted, .quantity-wanted');
  const formSerialized = $productActions.find('form:first').serialize();

  const currentRequest = (() => {
    for (let i = 0; i < currentRequests.length; i += 1) {
      if (currentRequests[i].context === context) {
        return currentRequests[i];
      }
    }

    const newRequest = {
      context,
      request: null,
      delayId: null,
    };

    currentRequests.push(newRequest);

    return newRequest;
  })();

  let preview = psGetRequestParameter('preview');

  if (preview !== null) {
    preview = '&preview=' + preview;
  } else {
    preview = '';
  }

  // Can not get product ajax url
  if (updateUrl === null) {
    showErrorNextToAddtoCartButton(context);

    return;
  }

  // New request only if new value
  if (event &&
      event.type === 'keyup' &&
      $quantityWantedInput.val() === $quantityWantedInput.data('old-value')
  ) {
    return;
  }
  $quantityWantedInput.data('old-value', $quantityWantedInput.val());

  if (currentRequest.delayId) {
    clearTimeout(currentRequest.delayId);
    prestashop.emit('updateProduct.end', {event, eventType, context});
  }

  // Most update need to occur (almost) instantly, but in some cases (like keyboard actions)
  // we need to delay the update a bit more
  let updateDelay = 30;
  if ('updatedProductQuantity' === eventType) {
    updateDelay = 750;
  }

  prestashop.emit('updateProduct.begin', {event, eventType, context});

  currentRequest.delayId = setTimeout(() => {

    if (formSerialized === '') {
      prestashop.emit('updateProduct.end', {event, eventType, context});

      return;
    }

    currentRequest.request = $.ajax({
      url: updateUrl + ((updateUrl.indexOf('?') === -1) ? '?' : '&') + formSerialized + preview,
      method: 'POST',
      data: {
        quickview: $(context).is('.quickview, .js-product-miniature, .js-product-quickview') ? 1 : 0,
        product_layout: $(context).attr('data-product-layout') || '',
        unique_id: $(context).attr('data-unique-id') || '',
        ajax: 1,
        action: 'refresh',
        quantity_wanted: eventType === 'updatedProductCombination' ? $quantityWantedInput.attr('min') : $quantityWantedInput.val()
      },
      dataType: 'json',
      beforeSend() {
        if (currentRequest.request !== null) {
          currentRequest.request.abort();
          prestashop.emit('updateProduct.end', {event, eventType, context});
        }
      },
      error(jqXHR, textStatus, errorThrown) {
        if (textStatus !== 'abort'
            && $('section#main > .ajax-error').length === 0
        ) {
          showErrorNextToAddtoCartButton(context);
        }
      },
      success(data, textStatus, errorThrown) {
        // Avoid image to blink each time we modify the product quantity
        // Can not compare directly cause of HTML comments in data.
        const $newImagesContainer = $('<div>')
          .html(data.product_cover_thumbnails)
          .find('.images-container');

        const $oldImagesContainer = $('.images-container', context);

        // Used to avoid image blinking if same image = epileptic friendly
        if ($oldImagesContainer.html() !== $newImagesContainer.html()) {
          $oldImagesContainer.replaceWith($newImagesContainer);
        }

        $('.product-prices', context).replaceWith(
          $('<div>').html(data.product_prices).find('.product-prices'),
        );
        $('.product-customization', context).replaceWith(
          $('<div>').html(data.product_customization).find('.product-customization'),
        );
        $('.product-variants', context).replaceWith(
          $('<div>').html(data.product_variants).find('.product-variants'),
        );
        $('.product-discounts', context).replaceWith(
          $('<div>').html(data.product_discounts).find('.product-discounts'),
        );
        $('.product-additional-info', context).replaceWith(
          $('<div>').html(data.product_additional_info).find('.product-additional-info'),
        );
        $('#product-details, .product-details', context).replaceWith(
          $('<div>').html(data.product_details).find('#product-details, .product-details'),
        );
        $('.product-flags', context).replaceWith(
          $('<div>').html(data.product_flags).find('.product-flags'),
        );
        replaceAddToCartSections(data, context);

        const minimalProductQuantity = parseInt(data.product_minimal_quantity, 10);

        // Prevent quantity input from blinking with classic theme.
        if (!isNaN(minimalProductQuantity)
            && eventType !== 'updatedProductQuantity'
        ) {
          $quantityWantedInput.attr('min', minimalProductQuantity);
          $quantityWantedInput.val(minimalProductQuantity);
        }

        data.context = context;

        prestashop.emit('updatedProduct', data);
      },
      complete(jqXHR, textStatus) {
        currentRequest.request = null;
        currentRequest.delayId = null;
        prestashop.emit('updateProduct.end', {event, eventType, context});
      }
    });
  }, updateDelay);
}

/**
 * Replace all "add to cart" sections but the quantity input
 * in order to keep quantity field intact i.e.
 *
 * @param {object} data of updated product and cat
 */
function replaceAddToCartSections(data, context) {
  const $productAddToCart = $('<div>').html(data.product_add_to_cart).find('.product-add-to-cart');

  if (!$productAddToCart.length) {
    showErrorNextToAddtoCartButton(context);
  }

  const $addProductToCart = $('.product-add-to-cart', context);
  const productAvailabilitySelector = '.add';
  const productAvailabilityMessageSelector = '#product-availability, .product-availability';
  const productMinimalQuantitySelector = '.product-minimal-quantity';

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productAvailabilitySelector
  });

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productAvailabilityMessageSelector
  });

  replaceAddToCartSection({
    $addToCartSnippet: $productAddToCart,
    $targetParent: $addProductToCart,
    targetSelector: productMinimalQuantitySelector
  });
}

/**
 * Find DOM elements and replace their content
 *
 * @param {object} replacement Data to be replaced on the current page
 */
function replaceAddToCartSection(replacement) {
  const destinationObject = $(replacement.$targetParent.find(replacement.targetSelector));
  if (destinationObject.length <= 0) {
    return;
  }
  const replace = replacement.$addToCartSnippet.find(replacement.targetSelector);

  if (replace.length > 0) {
    destinationObject.replaceWith(replace[0].outerHTML);
  } else {
    destinationObject.html('');
  }
}

/**
 * Find context DOM element
 *
 * @param {object} event
 */
function getContext(event) {
  let $context;

  if (event) {
    $context = $(event.target).closest(
      '.js-product-miniature, .js-product-quickview, .js-product-details'
    );
  }

  if (!$context || $context.length === 0) {
    $context = $(
      '.quickview, .page-product:not(.modal-open) .row, .page-product:not(.modal-open) .product-container',
    );
  }

  return $context.length > 0 ? $context[0] : null;
}

/**
 * @param {jQuery} $container
 * @param {string} textError
 */
function showError($container, textError) {
  const $error = $(`<div class="alert alert-danger ajax-error" role="alert">${textError}</div>`);
  $container.replaceWith($error);
}

$(document).ready(() => {
  // Listen on all form elements + those who have a data-product-attribute
  $('body').on(
    'change touchspin.on.startspin',
    '.product-variants *[name]',
    (e) => {
      prestashop.emit('updateProduct', {
        eventType: 'updatedProductCombination',
        event: e,
        // Following variables are not used anymore, but kept for backward compatibility
        resp: {},
        reason: {
          productUrl: prestashop.urls.pages.product || '',
        },
      });
    }
  );

  /**
   * Button has been removed on classic theme, but event triggering has been kept for compatibility
   */
  $('body').on(
    'click',
    '.product-refresh',
    (e, extraParameters) => {
      e.preventDefault();
      let eventType = 'updatedProductCombination';

      if (typeof extraParameters !== 'undefined'
          && extraParameters.eventType
      ) {
        eventType = extraParameters.eventType;
      }
      prestashop.emit('updateProduct', {
        eventType: eventType,
        event: e,
        // Following variables are not used anymore, but kept for backward compatibility
        resp: {},
        reason: {
          productUrl: prestashop.urls.pages.product || '',
        },
      });
    }
  );

  // Refresh all the product content
  prestashop.on('updateProduct', (args) => {
    const eventType = args.eventType;
    const event = args.event;
    const context = getContext(event);

    const $context = (eventType !== undefined || !$(context).data('idProduct'))
      ? $(context)
      : $('.product-actions').closest(
        '.js-product-miniature, .js-product-quickview, .js-product-details',
      ).filter(
        (_index, element) => $(element).data('idProduct') === $(context).data('idProduct'),
      );

    if ($context.length === 0) {
      return;
    }

    getProductUpdateUrl(event, eventType, context).done(
      (productUpdateUrl) => {
        $context.each(
          (_index, element) => {
            updateProduct(event, eventType, element, productUpdateUrl)
          },
        )
      },
    ).fail(() => {
      if ($('section#main > .ajax-error').length === 0) {
        showErrorNextToAddtoCartButton(context);
      }
    });
  });

  prestashop.on('updatedProduct', (args) => {
    if (!args.product_url || !args.id_product_attribute) {
      return;
    }

    if (args.context) {
      if ($(args.context).is('.quickview, .js-product-miniature, .js-product-quickview')) {
        return;
      }
    } else {
      /*
       * If quickview modal is present we are not on product page, so
       * we don't change the url nor title
       */
      if ($('.modal.quickview').length) {
        return;
      }
    }

    let pageTitle = document.title;
    if (args.product_title) {
      pageTitle = args.product_title;
      $(document).attr('title', pageTitle);
    }

    window.history.replaceState(
      {
        id_product_attribute: args.id_product_attribute
      },
      pageTitle,
      args.product_url
    );
  });

  prestashop.on('updateCart', (event) => {
    if (!event || !event.reason || event.reason.linkAction !== 'add-to-cart' ) {
      return;
    }

    const context = getContext(event.event);

    if (!context) {
      return;
    }

    const $quantityWantedInput = $('#quantity_wanted, .quantity-wanted', context);
    //Force value to 1, it will automatically trigger updateProduct and reset the appropriate min value if needed
    $quantityWantedInput.val(1);
  });

  prestashop.on('showErrorNextToAddtoCartButton', (event) => {
    if (!event || !event.errorMessage) {
      return;
    }

    const context = getContext(event.event);

    if (!context) {
      return;
    }

    showErrorNextToAddtoCartButton(
      context,
      event.errorMessage,
    );
  });
});
